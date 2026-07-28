import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  WASocket,
  proto,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { verifyPairingCode, getUserByPhone } from './pairing';
import { parseTransactionText, parseTransactionAudio, parseTransactionImage } from './parser';
import { supabase } from '@/lib/supabase';

// Global singleton for Baileys socket connection
const globalNode = global as unknown as {
  sock: WASocket | null;
  qrCodeData: string | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
};

export function getWASocketStatus() {
  return { 
    status: globalNode.connectionStatus || 'disconnected', 
    qrCode: globalNode.qrCodeData || null 
  };
}

/**
 * Initialize Baileys WhatsApp WebSocket Connection
 */
export async function initBaileysService() {
  if (globalNode.sock && globalNode.connectionStatus === 'connected') {
    return globalNode.sock;
  }

  globalNode.connectionStatus = 'connecting';
  const authFolder = path.join(process.cwd(), 'auth_info_baileys');
  
  if (!fs.existsSync(authFolder)) {
    fs.mkdirSync(authFolder, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const { version } = await fetchLatestBaileysVersion();

  globalNode.sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
  });

  globalNode.sock.ev.on('creds.update', saveCreds);

  globalNode.sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      globalNode.qrCodeData = qr;
      console.log('📌 [WhatsApp Bot] QR Code siap di-scan via HP!');
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      globalNode.connectionStatus = 'disconnected';
      globalNode.qrCodeData = null;
      console.log(`⚠️ [WhatsApp Bot] Connection closed due to ${lastDisconnect?.error}, reconnecting: ${shouldReconnect}`);

      if (shouldReconnect) {
        setTimeout(() => initBaileysService(), 5000);
      } else {
        // If logged out, delete auth info to allow fresh scan
        if (fs.existsSync(authFolder)) {
          fs.rmSync(authFolder, { recursive: true, force: true });
        }
        globalNode.sock = null;
      }
    } else if (connection === 'open') {
      globalNode.connectionStatus = 'connected';
      globalNode.qrCodeData = null;
      console.log('🚀 [WhatsApp Bot] Connected successfully to WhatsApp Server!');
    }
  });

  // Handle incoming messages
  globalNode.sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify') return;

    for (const msg of m.messages) {
      // Ignore broadcast or status messages or messages sent by bot itself
      if (!msg.key || !msg.message || msg.key.fromMe || msg.key.remoteJid?.includes('@status')) continue;

      try {
        await processIncomingWAMessage(msg);
      } catch (err) {
        console.error('Error processing WA message:', err);
      }
    }
  });

  return globalNode.sock;
}

/**
 * Process a single incoming WhatsApp message
 */
async function processIncomingWAMessage(msg: proto.IWebMessageInfo) {
  if (!globalNode.sock) return;

  const senderJid = msg.key?.remoteJid || '';
  const senderPhone = senderJid.replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
  const messageContent = msg.message;

  if (!messageContent) return;

  // Extract text if available
  const textMessage =
    messageContent.conversation ||
    messageContent.extendedTextMessage?.text ||
    messageContent.imageMessage?.caption ||
    '';

  const cleanText = textMessage.trim();

  // ──────────────────────────────────────────
  // 1. Check if user is sending a Pairing Code (e.g. RH-1234)
  // ──────────────────────────────────────────
  if (cleanText.toUpperCase().startsWith('RH-') || cleanText.length === 6) {
    const pairingResult = await verifyPairingCode(senderPhone, cleanText);
    await replyWA(senderJid, pairingResult.message);
    return;
  }

  // ──────────────────────────────────────────
  // 2. Check if phone number is linked to a user
  // ──────────────────────────────────────────
  const user = await getUserByPhone(senderPhone);
  if (!user) {
    await replyWA(
      senderJid,
      `👋 *Halo! Selamat Datang di Ruang Harta Bot*\n\n` +
      `Nomor WhatsApp Anda (${senderPhone}) belum terhubung dengan akun Ruang Harta.\n\n` +
      `📌 *Cara Menghubungkan:* \n` +
      `1. Buka Web App Ruang Harta -> Halaman *Integrasi WhatsApp*\n` +
      `2. Salin kode OTP Pairing 6-digit (Contoh: *RH-4891*)\n` +
      `3. Kirimkan kode tersebut ke WhatsApp ini.\n` +
      `4. Siap! Anda bisa langsung mencatat pengeluaran via chat / voice note.`
    );
    return;
  }

  // ──────────────────────────────────────────
  // 3. Process Content (Text, Audio Voice Note, Image Struk)
  // ──────────────────────────────────────────
  let parsedTransaction = null;

  // A. IMAGE (Foto Struk)
  if (messageContent.imageMessage) {
    await replyWA(senderJid, '⏳ *Sedang memproses foto struk kamu dengan AI...*');
    const imageBuffer = (await downloadMediaMessage(msg as any, 'buffer', {})) as Buffer;
    const mimeType = messageContent.imageMessage.mimetype || 'image/jpeg';
    parsedTransaction = await parseTransactionImage(imageBuffer, mimeType);
  }
  // B. AUDIO (Voice Note)
  else if (messageContent.audioMessage) {
    await replyWA(senderJid, '🎙️ *Mendengarkan voice note kamu...*');
    const audioBuffer = (await downloadMediaMessage(msg as any, 'buffer', {})) as Buffer;
    const mimeType = messageContent.audioMessage.mimetype || 'audio/ogg';
    const audioResult = await parseTransactionAudio(audioBuffer, mimeType);
    parsedTransaction = audioResult.parsed;
  }
  // C. TEXT MESSAGE
  else if (cleanText) {
    parsedTransaction = await parseTransactionText(cleanText);
  }

  // ──────────────────────────────────────────
  // 4. Save Transaction & Send Confirmation
  // ──────────────────────────────────────────
  if (!parsedTransaction) {
    await replyWA(
      senderJid,
      `❓ *Ruang Harta AI:* Maaf ${user.name}, saya belum bisa mengenali nominal atau tipe transaksi dari pesan ini.\n\n` +
      `💡 *Contoh Pesan:* \n` +
      `• _"Beli kopi 25rb"_\n` +
      `• _"Dapat gaji 5jt"_\n` +
      `• _"Bayar cicilan motor 750rb"_\n` +
      `• Atau kirim *Foto Struk Belanja* / *Voice Note*.`
    );
    return;
  }

  // Format currency
  const formattedAmount = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(parsedTransaction.amount);

  const typeIcon =
    parsedTransaction.type === 'income' ? '📥 *PEMASUKAN*' :
    parsedTransaction.type === 'debt' ? '🏷️ *CICILAN/HUTANG*' : '💸 *PENGELUARAN*';

  // Save transaction to Supabase table
  try {
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: parsedTransaction.type,
      amount: parsedTransaction.amount,
      category: parsedTransaction.category,
      description: parsedTransaction.description,
      date: parsedTransaction.date,
      source: 'whatsapp',
    });
  } catch (dbErr) {
    console.warn('Note: Table transactions insert fallback:', dbErr);
  }

  // Confirmation Reply
  const replyMessage =
    `✅ *BERHASIL DICATAT!*\n\n` +
    `${typeIcon}\n` +
    `💰 *Nominal:* ${formattedAmount}\n` +
    `📁 *Kategori:* ${parsedTransaction.category}\n` +
    `📝 *Keterangan:* ${parsedTransaction.description}\n` +
    `📅 *Tanggal:* ${parsedTransaction.date}\n\n` +
    `Data otomatis tersimpan di dashboard *Ruang Harta* milik ${user.name}.`;

  await replyWA(senderJid, replyMessage);
}

/**
 * Send WhatsApp text message helper
 */
export async function replyWA(jid: string, text: string) {
  if (!globalNode.sock) return;
  try {
    await globalNode.sock.sendMessage(jid, { text });
  } catch (err) {
    console.error('Error sending WA message:', err);
  }
}
