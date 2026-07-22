import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});
const MAX_PAYLOAD_SIZE = 500 * 1024; // 500KB for JSON transaction data

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
    const bodyText = await request.text();
    
    // 🔒 Payload size check (prevent huge JSON payloads)
    if (bodyText.length > MAX_PAYLOAD_SIZE) {
      return NextResponse.json({ error: 'Payload terlalu besar.' }, { status: 413 });
    }
    
    let transactions;
    try {
      transactions = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ error: 'Format data tidak valid.' }, { status: 400 });
    }

    // 🔒 Validate that transactions is an array
    if (!Array.isArray(transactions)) {
      return NextResponse.json({ error: 'Data transaksi tidak valid.' }, { status: 400 });
    }

    // 🔒 Sanitize transaction data to prevent prompt injection
    // Only allow known fields with expected types
    const sanitized = transactions.slice(0, 500).map((t: any) => ({
      type: ['income', 'expense', 'debt'].includes(t.type) ? t.type : 'unknown',
      amount: typeof t.amount === 'number' ? Math.abs(t.amount) : 0,
      description: typeof t.description === 'string' ? t.description.slice(0, 100) : '',
      date: typeof t.date === 'string' ? t.date.slice(0, 20) : '',
      category: typeof t.category === 'string' ? t.category.slice(0, 50) : '',
    }));

    const prompt = `Anda adalah "Ruang Harta AI", seorang Penasihat Keuangan Pribadi (Financial Advisor) kelas dunia yang cerdas, proaktif, dan pandai memberikan kritik membangun. 
    
Tugas Anda:
Analisis daftar transaksi keuangan pengguna berikut ini. Pengguna mencatat Pemasukan (Gaji/Transfer), Pengeluaran (Belanja/Struk), dan Hutang (Cicilan bulanan).
Berikan insight (wawasan) yang menarik, gaya bahasanya santai, modern, tidak kaku, dan blak-blakan. Panggil pengguna dengan "kamu".

Data Transaksi Pengguna (JSON):
${JSON.stringify(sanitized)}

Aturan Output:
- Hasilkan maksimal 3 paragraf singkat (sekitar 3-4 kalimat per paragraf).
- Temukan pola pengeluaran terbesar atau kebiasaan boros (jika ada).
- Beri pujian jika pemasukan lebih besar dari pengeluaran, atau kritik tajam jika pengeluaran/hutang membengkak.
`;

const generateWithFallback = async (contents: any, config?: any) => {
  const models = ['gemini-3.6-flash', 'gemini-3.5-flash'];
  let rateLimitErr: any = null;
  let lastErr: any = null;
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
};

    const response = await generateWithFallback(
      prompt,
      { temperature: 0.7 }
    );

    const text = response.text || "Sepertinya saya sedang butuh kopi. Tolong coba lagi nanti.";
    return NextResponse.json({ insight: text });

  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json({ error: 'Failed to analyze data', insight: "Hmm, sepertinya saya kesulitan membaca datamu. Coba refresh halaman." }, { status: 500 });
  }
}
