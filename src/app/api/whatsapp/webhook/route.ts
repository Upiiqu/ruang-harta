import { NextResponse } from 'next/server';
import { findOrCreateUserByPhone } from '@/lib/whatsapp/pairing';
import { parseTransactionText, parseTransactionAudio, parseTransactionImage } from '@/lib/whatsapp/parser';
import { supabase } from '@/lib/supabase';
import { isSafeUrl } from '@/lib/url-validation';
import crypto from 'crypto';

async function sendFonnteReply(target: string, message: string) {
  const fonnteToken = process.env.FONNTE_TOKEN || process.env.WHATSAPP_API_TOKEN;
  if (!fonnteToken) return;

  try {
    const formData = new FormData();
    formData.append('target', target);
    formData.append('message', message);

    await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: fonnteToken,
      },
      body: formData,
    });
  } catch (err) {
    console.error('Error sending Fonnte reply:', err);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const webhookVerifyToken = process.env.WEBHOOK_VERIFY_TOKEN;
  if (mode === 'subscribe' && webhookVerifyToken && token === webhookVerifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('OK', { status: 200 });
}

export async function POST(request: Request) {
  try {
    let payload: any = {};
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        payload[key] = value;
      });
    }

    const senderPhone = payload.sender || payload.target || payload.phone || payload.from;
    const text = payload.message || payload.text || '';
    const mediaUrl = payload.url || payload.mediaUrl || payload.imageUrl || payload.audioUrl;

    if (!senderPhone) {
      return NextResponse.json({ error: 'Sender phone required' }, { status: 400 });
    }

    const cleanPhone = String(senderPhone).replace(/[^0-9]/g, '');
    const cleanText = String(text).trim();

    const user = await findOrCreateUserByPhone(cleanPhone);

    let parsed = null;

    if (mediaUrl) {
      if (!isSafeUrl(mediaUrl)) {
        const failMsg = `Maaf ${user.name}, URL media tidak valid atau tidak diizinkan.`;
        await sendFonnteReply(cleanPhone, failMsg);
        return NextResponse.json({ reply: failMsg }, { status: 400 });
      }
      const res = await fetch(mediaUrl, { signal: AbortSignal.timeout(15000) });
      const arrayBuf = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      if (mediaUrl.match(/\.(jpg|jpeg|png|webp)/i) || contentType.includes('image')) {
        parsed = await parseTransactionImage(buffer, 'image/jpeg');
      } else {
        const audioRes = await parseTransactionAudio(buffer, 'audio/ogg');
        parsed = audioRes.parsed;
      }
    } else if (cleanText) {
      parsed = await parseTransactionText(cleanText);
    }

    if (!parsed) {
      const failMsg = `Maaf ${user.name}, transaksi tidak dapat dikenali. Kirim pesan seperti "Kopi 25rb" atau foto struk.`;
      await sendFonnteReply(cleanPhone, failMsg);
      return NextResponse.json({ reply: failMsg });
    }

    try {
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: parsed.type,
        amount: parsed.amount,
        category: parsed.category,
        description: parsed.description,
        date: parsed.date,
        source: 'whatsapp',
      });
    } catch (dbErr) {
      console.warn('Database insert warning:', dbErr);
    }

    const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(parsed.amount);

    const successMsg = `✅ *BERHASIL DICATAT!*\n\n💰 Nominal: ${formattedAmount}\n📁 Kategori: ${parsed.category}\n📝 Keterangan: ${parsed.description}\n📅 Tanggal: ${parsed.date}`;

    await sendFonnteReply(cleanPhone, successMsg);

    return NextResponse.json({
      success: true,
      reply: successMsg,
      data: parsed,
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Gagal memproses webhook' }, { status: 500 });
  }
}

function validateWebhookSignature(payload: any, signature: string | null): boolean {
  if (!signature) return false;
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (!webhookSecret) return true;
  const expected = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(payload)).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
