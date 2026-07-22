import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenAI({});
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'application/pdf'];

// Auth is handled by middleware (JWT verified). This checks the header set by middleware.
function isAuthenticated(request: Request): boolean {
  return !!request.headers.get('x-user-id');
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  let tempPdf = '';
  try {
    tempPdf = path.join(process.cwd(), `temp_${Date.now()}.pdf`);
    fs.writeFileSync(tempPdf, buffer);
    const workerScript = path.join(process.cwd(), 'src', 'app', 'api', 'scan-income', 'pdfWorker.js');
    const out = execSync(`node "${workerScript}" "${tempPdf}"`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    if (fs.existsSync(tempPdf)) fs.unlinkSync(tempPdf);
    return out;
  } catch (e: any) {
    console.warn("⚠️ pdfWorker failed, fallback to raw string:", e?.message);
    if (tempPdf && fs.existsSync(tempPdf)) fs.unlinkSync(tempPdf);
    const str = buffer.toString('utf-8');
    const matches = str.match(/\(([^()]{3,})\)/g);
    if (matches && matches.length > 5) {
      return matches.map(m => m.slice(1, -1)).join(' ');
    }
    return str.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ');
  }
}

async function generateWithGroqFallback(extractedText: string) {
  const apiKey = process.env.GROQ_API_KEY || '';
  const prompt = `Anda adalah asisten keuangan cerdas. Ekstrak data transaksi PEMASUKAN / UANG MASUK (kredit) dari teks mutasi bank ini ke dalam format JSON:
{
  "incomes": [
    {
      "id": "1",
      "sourceName": "Nama Pengirim / Keterangan Transaksi",
      "date": "YYYY-MM-DD",
      "totalAmount": 500000,
      "category": "Pilih salah satu dari: 'Gaji', 'Transfer Masuk', 'Freelance', 'Investasi/Bunga', 'Lainnya'"
    }
  ]
}
Hanya masukkan transaksi UANG MASUK. Total amount murni angka.

Teks Mutasi:
${extractedText}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })
  });

  const json = await res.json();
  const rawText = json.choices?.[0]?.message?.content || "{}";
  return JSON.parse(rawText);
}

const generateWithFallback = async (contents: any, config?: any) => {
  const models = ['gemini-3.6-flash', 'gemini-3.5-flash'];
  let rateLimitErr: any = null;
  let lastErr: any = null;
  for (const model of models) {
    try {
      return await ai.models.generateContent({ model, contents, config });
    } catch (e: any) {
      console.warn(`[WARN] Model ${model} failed, trying fallback...`, e?.message);
      lastErr = e;
      if (e?.status === 429 || e?.message?.includes("429") || e?.message?.includes("RESOURCE_EXHAUSTED") || e?.message?.includes("quota")) {
        rateLimitErr = e;
      }
    }
  }

  throw rateLimitErr || lastErr;
}

export async function POST(request: Request) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const image = formData.get('image') as File | null;
    
    if (!image) {
      return NextResponse.json({ error: 'Tidak ada file yang diunggah.' }, { status: 400 });
    }

    if (image.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Ukuran file terlalu besar. Maksimal 10MB." }, { status: 413 });
    }

    if (!ALLOWED_TYPES.includes(image.type)) {
      return NextResponse.json({ error: "Tipe file tidak diizinkan. Hanya gambar atau PDF." }, { status: 415 });
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const base64Data = buffer.toString('base64');
    let jsonResult: any = null;

    // Fast & Accurate PDF Path
    if (image.type === 'application/pdf') {
      const textContent = await extractPdfText(buffer);
      console.log(`📄 Extracted PDF text length: ${textContent.length}`);
      if (textContent && textContent.length > 20) {
        try {
          jsonResult = await generateWithGroqFallback(textContent);
        } catch (err) {
          console.warn("⚠️ Groq PDF processing failed, falling back to Gemini Vision...", err);
        }
      }
    }

    // Fallback or Image Path (Gemini)
    if (!jsonResult || !jsonResult.incomes || jsonResult.incomes.length === 0) {
      try {
        const prompt = `Anda adalah asisten keuangan cerdas. Ekstrak data transaksi PEMASUKAN / UANG MASUK (kredit) dari dokumen ini (dapat berupa gambar bukti transfer, slip gaji, atau PDF mutasi rekening bank).
Dokumen bisa berisi 1 transaksi atau BANYAK transaksi mutasi uang masuk.

Kembalikan format JSON persis seperti berikut (tanpa markdown wrapper seperti \`\`\`json):
{
  "incomes": [
    {
      "id": "1",
      "sourceName": "Nama Pengirim / Keterangan Transaksi (misal: PT Angin Ribut, SIH TEGUH SUNDJOJO, ELIS SAFITRI, GoPay)",
      "date": "Tanggal transaksi format YYYY-MM-DD",
      "totalAmount": 500000,
      "category": "Pilih salah satu paling cocok dari: 'Gaji', 'Transfer Masuk', 'Freelance', 'Investasi/Bunga', 'Lainnya'"
    }
  ]
}

Aturan Penting:
1. Hanya masukkan transaksi UANG MASUK (kredit / CR / pemasukan). Abaikan uang keluar (debit / DB).
2. 'totalAmount' harus berupa angka murni tanpa titik/koma/Rp.
3. Kategori harus dipilih dari: 'Gaji', 'Transfer Masuk', 'Freelance', 'Investasi/Bunga', atau 'Lainnya'.
4. Jika dokumen tidak jelas atau tidak ada transaksi pemasukan, kembalikan {"incomes": []}.`;

        const response = await generateWithFallback(
          [
            { inlineData: { data: base64Data, mimeType: image.type } },
            prompt
          ],
          { temperature: 0.1 }
        );

        const text = response.text || "{}";
        let cleanedText = text;
        if (text.startsWith("```json")) {
          cleanedText = text.substring(7, text.length - 3).trim();
        } else if (text.startsWith("```")) {
          cleanedText = text.substring(3, text.length - 3).trim();
        }
        jsonResult = JSON.parse(cleanedText);

      } catch (geminiError: any) {
        console.warn("⚠️ Gemini API Error:", geminiError?.message);
        if (!jsonResult) {
          throw geminiError;
        }
      }
    }
    
    // Normalize response structure so `incomes` is always an array
    let incomesList: any[] = [];
    if (jsonResult && Array.isArray(jsonResult.incomes)) {
      incomesList = jsonResult.incomes;
    } else if (jsonResult && (jsonResult.sourceName || jsonResult.totalAmount)) {
      incomesList = [{
        id: "1",
        sourceName: jsonResult.sourceName || "Pemasukan",
        date: jsonResult.date || new Date().toISOString().split('T')[0],
        totalAmount: jsonResult.totalAmount || 0,
        category: jsonResult.category || "Transfer Masuk"
      }];
    }

    const formattedIncomes = incomesList.map((item: any, idx: number) => ({
      id: item.id || String(idx + 1),
      sourceName: item.sourceName || "Pemasukan",
      date: item.date || new Date().toISOString().split('T')[0],
      totalAmount: Number(item.totalAmount) || 0,
      category: item.category || "Transfer Masuk",
      selected: true
    }));

    return NextResponse.json({ data: { incomes: formattedIncomes }, status: "success" });

  } catch (error: any) {
    console.error("❌ Scan Income API Error:", error);
    let errorMessage = "Gagal memproses file.";
    if (error?.status === 429 || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("quota")) {
      errorMessage = "Batas kuota gratis (Rate Limit) API Gemini tercapai. Mohon tunggu 15-30 detik lalu coba lagi.";
    } else if (error?.message) {
      errorMessage = `Gagal memproses file: ${error.message}`;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
