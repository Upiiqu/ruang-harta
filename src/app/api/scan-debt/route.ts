import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'application/pdf'];

// Auth is handled by middleware (JWT verified). This checks the header set by middleware.
function isAuthenticated(request: Request): boolean {
  return !!request.headers.get('x-user-id');
}

export async function POST(request: Request) {
  // 🔒 Auth check
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const image = formData.get('image') as File | null;
    const currentIncome = Number(formData.get('currentIncome')) || 0;
    const currentDebt = Number(formData.get('currentDebt')) || 0;
    
    if (!image) {
      return NextResponse.json({ error: 'Tidak ada file yang diunggah.' }, { status: 400 });
    }

    // 🔒 File size check
    if (image.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Ukuran file terlalu besar. Maksimal 10MB." }, { status: 413 });
    }

    // 🔒 MIME type check
    if (!ALLOWED_TYPES.includes(image.type)) {
      return NextResponse.json({ error: "Tipe file tidak diizinkan. Hanya gambar atau PDF." }, { status: 415 });
    }

    const buffer = await image.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString('base64');

    const prompt = `Anda adalah penasihat keuangan (Financial Advisor) yang sangat tegas, pintar, agak sarkas, tapi rasional. Pengguna sedang memindai tagihan hutang/cicilan (bisa kartu kredit, paylater, dll).
Tugas Anda:
1. Ekstrak data hutang dari gambar.
2. Bandingkan dengan data keuangan pengguna saat ini:
   - Pemasukan Bulanan: Rp ${currentIncome}
   - Cicilan Berjalan (sebelum ini): Rp ${currentDebt}
3. Berikan nasihat keuangan (aiAdvice). Jika total cicilan (berjalan + yang baru ini) melebihi 30% dari pemasukan, tegur dengan tegas (boleh sedikit sarkas wkwk). Jika aman (<30%), berikan lampu hijau tapi tetap ingatkan untuk tidak sering berhutang. Gunakan bahasa Indonesia kasual.
   
Harus berupa object JSON valid tanpa markdown wrapper seperti \`\`\`json.
Format yang diminta:
{
  "creditorName": "Nama Kreditur (misal: Shopee Paylater, Kartu Kredit BCA, dll)",
  "date": "Tanggal tagihan/transaksi format YYYY-MM-DD",
  "installmentAmount": 500000 (angka nominal cicilan bulanannya),
  "isSafe": false (boolean, true jika total cicilan < 30% pendapatan, false jika >= 30%),
  "aiAdvice": "Teks nasihat AI maksimal 2 kalimat"
}
`;

const generateWithFallback = async (contents: any, config?: any) => {
  const models = ['gemini-3.6-flash', 'gemini-3.5-flash'];
  let rateLimitErr = null;
  let lastErr = null;
  for (const model of models) {
    try {
      return await ai.models.generateContent({ model, contents, config });
    } catch (e: any) {
      console.warn(`[WARN] Model ${model} failed, trying fallback...`, e?.message);
      if (e?.status === 429 || e?.message?.includes("429") || e?.message?.includes("RESOURCE_EXHAUSTED") || e?.message?.includes("quota")) {
        rateLimitErr = e;
      }
      lastErr = e;
    }
  }

  throw rateLimitErr || lastErr;
}

    const response = await generateWithFallback(
      [
        { inlineData: { data: base64Data, mimeType: image.type } },
        prompt
      ],
      { temperature: 0.7 }
    );

    const text = response.text || "{}";
    let cleanedText = text;
    if (text.startsWith("```json")) {
      cleanedText = text.substring(7, text.length - 3).trim();
    } else if (text.startsWith("```")) {
      cleanedText = text.substring(3, text.length - 3).trim();
    }

    const jsonResult = JSON.parse(cleanedText);
    return NextResponse.json({ data: jsonResult, status: "success" });

  } catch (error: any) {
    console.error("❌ Scan Debt API Error:", error);
    let errorMessage = "Gagal memproses file.";
    if (error?.status === 429 || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("429") || error?.message?.includes("quota")) {
      errorMessage = "Batas kuota gratis (Rate Limit) API Gemini tercapai. Mohon tunggu 15-30 detik lalu coba lagi.";
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
