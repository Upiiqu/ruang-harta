import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';

const ai = new GoogleGenAI({});
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy' });

export interface ParsedTransaction {
  type: 'expense' | 'income' | 'debt';
  amount: number;
  description: string;
  category: string;
  date: string;
  confidence: number;
}

/**
 * Parse natural language text into a structured financial transaction using Gemini / Groq.
 * Example inputs:
 * - "Beli kopi 25rb tadi siang" -> Expense 25,000, Makanan & Minuman
 * - "Dapat gaji bulan Juli 5 juta" -> Income 5,000,000, Gaji
 * - "Bayar cicilan motor 750rb" -> Debt/Expense 750,000, Cicilan
 */
export async function parseTransactionText(text: string): Promise<ParsedTransaction | null> {
  const todayStr = new Date().toISOString().split('T')[0];

  const prompt = `
Anda adalah AI pengenal transaksi keuangan pribadi yang cerdas untuk bahasa Indonesia.
Tugas Anda: Analisis pesan teks dari pengguna dan ekstrak data transaksi keuangan ke format JSON.

Pesan Pengguna: "${text}"
Tanggal Hari Ini: ${todayStr}

Kategori yang Tersedia:
- Untuk Pengeluaran (expense): Makanan & Minuman, Belanja, Transportasi, Hiburan, Tagihan, Kesehatan, Pendidikan, Lain-lain
- Untuk Pemasukan (income): Gaji, Transfer Masuk, Freelance, Investasi, Lain-lain
- Untuk Cicilan/Hutang (debt): Cicilan Motor/Mobil, Pinjaman, Kartu Kredit, Lain-lain

Output JSON wajib berupa object tunggal dengan struktur:
{
  "type": "expense" | "income" | "debt",
  "amount": angka murni (contoh: 25000 untuk 25rb / 25k / 25ribu, 5000000 untuk 5juta / 5jt),
  "description": "deskripsi singkat transaksi",
  "category": "salah satu nama kategori di atas",
  "date": "YYYY-MM-DD",
  "confidence": angka 0.0 sampai 1.0
}

Aturan Penting:
1. Konversikan singkatan jumlah seperti 'k', 'rb', 'ribu', 'jt', 'juta' dengan akurat.
2. Jika pesan TIDAK berisi informasi transaksi keuangan sama sekali, kembalikan JSON { "confidence": 0 }.
3. HANYA kembalikan JSON valid tanpa tag markdown.
`;

  try {
    const models = ['gemini-3.6-flash', 'gemini-3.5-flash'];
    let textResponse = '';

    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });
        textResponse = response.text || '';
        if (textResponse) break;
      } catch (err) {
        console.warn(`[WA AI] Model ${model} error:`, err);
      }
    }

    if (!textResponse) {
      // Fallback to Groq if Gemini fails
      if (process.env.GROQ_API_KEY) {
        const groqRes = await groq.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          response_format: { type: 'json_object' },
        });
        textResponse = groqRes.choices[0]?.message?.content || '';
      }
    }

    const match = textResponse.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const data = JSON.parse(match[0]);
    if (!data.amount || data.confidence < 0.3) {
      return null;
    }

    return {
      type: ['expense', 'income', 'debt'].includes(data.type) ? data.type : 'expense',
      amount: Math.abs(Number(data.amount) || 0),
      description: String(data.description || 'Transaksi WhatsApp').slice(0, 100),
      category: String(data.category || 'Lain-lain').slice(0, 50),
      date: data.date || todayStr,
      confidence: Number(data.confidence || 0.8),
    };
  } catch (err) {
    console.error('Error parsing transaction text:', err);
    return null;
  }
}

/**
 * Transcribe voice note audio (Buffer) using Groq Whisper API, then parse it.
 */
export async function parseTransactionAudio(audioBuffer: Buffer, mimeType: string): Promise<{ text: string; parsed: ParsedTransaction | null }> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY belum dikonfigurasi untuk transkripsi suara.');
  }

  try {
    // Create File object from buffer for Groq SDK
    const uint8Array = new Uint8Array(audioBuffer);
    const blob = new Blob([uint8Array], { type: mimeType });
    const file = new File([blob], `voice-note.${mimeType.includes('ogg') ? 'ogg' : 'm4a'}`, { type: mimeType });

    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: 'whisper-large-v3-turbo',
      language: 'id',
      response_format: 'json',
    });

    const text = transcription.text || '';
    if (!text.trim()) {
      return { text: '', parsed: null };
    }

    const parsed = await parseTransactionText(text);
    return { text, parsed };
  } catch (err) {
    console.error('Error transcribing audio:', err);
    return { text: '', parsed: null };
  }
}

/**
 * Parse image receipt (Buffer) using Gemini Vision API.
 */
export async function parseTransactionImage(imageBuffer: Buffer, mimeType: string): Promise<ParsedTransaction | null> {
  const base64Data = imageBuffer.toString('base64');
  const todayStr = new Date().toISOString().split('T')[0];

  const prompt = `
Anda adalah pemindai struk belanja kasir profesional.
Ekstrak informasi transaksi dari gambar ini ke dalam format JSON:
- type: "expense"
- amount: total pembayaran akhir (angka murni)
- description: nama toko/merchant (contoh: "Alfamart", "Kopi Kenangan")
- category: pilih salah satu ("Makanan & Minuman", "Belanja", "Transportasi", "Tagihan", "Lain-lain")
- date: tanggal di struk (format YYYY-MM-DD, jika tidak ada gunakan "${todayStr}")
- confidence: angka 0.0 s.d 1.0

Kembalikan HANYA JSON valid.
`;

  try {
    const models = ['gemini-3.6-flash', 'gemini-3.5-flash'];
    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            { inlineData: { data: base64Data, mimeType } },
            prompt,
          ],
          config: { responseMimeType: 'application/json' },
        });

        const textResponse = response.text || '';
        const match = textResponse.match(/\{[\s\S]*\}/);
        if (match) {
          const data = JSON.parse(match[0]);
          if (data.amount) {
            return {
              type: 'expense',
              amount: Math.abs(Number(data.amount) || 0),
              description: String(data.description || 'Struk Belanja').slice(0, 100),
              category: String(data.category || 'Belanja').slice(0, 50),
              date: data.date || todayStr,
              confidence: Number(data.confidence || 0.9),
            };
          }
        }
      } catch (e: any) {
        console.warn(`[WA Vision] Model ${model} error:`, e?.message);
      }
    }
    return null;
  } catch (err) {
    console.error('Error parsing receipt image:', err);
    return null;
  }
}
