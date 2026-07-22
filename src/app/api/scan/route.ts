import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];

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
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // 🔒 File size check
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Ukuran file terlalu besar. Maksimal 10MB." }, { status: 413 });
    }

    // 🔒 MIME type check
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Tipe file tidak diizinkan. Hanya gambar (JPG, PNG, WEBP)." }, { status: 415 });
    }

    const buffer = await file.arrayBuffer();
    const base64String = Buffer.from(buffer).toString('base64');
    const mimeType = file.type;

    const prompt = `
Anda adalah sistem pengekstrak data struk kasir (receipt OCR) yang akurat.
Analisis gambar struk ini dan ekstrak informasi berikut ke dalam format JSON yang tepat:
- storeName (nama toko, string)
- date (tanggal transaksi, string format YYYY-MM-DD jika memungkinkan, atau string aslinya)
- totalAmount (total akhir yang harus dibayar, angka)
- items (array of objects, setiap object berisi 'name' (string) dan 'price' (angka))

Pastikan respons Anda HANYA berupa JSON valid, tanpa teks markdown lainnya (seperti \`\`\`json).
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
        { inlineData: { data: base64String, mimeType } },
        prompt
      ],
      { responseMimeType: "application/json" }
    );

    const textResponse = response.text || "{}";
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI tidak mengembalikan format JSON yang valid.');
    }

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ data, status: "success" });

  } catch (error: any) {
    console.error("❌ Scan API Error:", error);
    
    if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: 'Limit AI tercapai (Quota Exceeded). Harap tunggu sekitar 1 menit sebelum mencoba lagi.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Gagal memproses struk. Pastikan gambar jelas atau coba lagi nanti." },
      { status: 500 }
    );
  }
}
