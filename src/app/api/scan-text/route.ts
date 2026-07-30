import { NextResponse } from 'next/server';
import { parseTransactionText } from '@/lib/whatsapp/parser';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Teks transaksi tidak valid' }, { status: 400 });
    }

    const parsed = await parseTransactionText(text);

    if (!parsed) {
      return NextResponse.json({ error: 'Gagal mengenali transaksi dari teks. Pastikan kalimat mengandung nominal dan deskripsi.' }, { status: 400 });
    }

    // Convert parser result to the format expected by Dashboard
    // Dashboard expects:
    // {
    //   type: 'expense' | 'income' | 'debt',
    //   date: 'YYYY-MM-DD',
    //   storeName: string, // for expense
    //   sourceName: string, // for income
    //   creditorName: string, // for debt
    //   totalAmount: number, // for expense / income
    //   installmentAmount: number, // for debt
    //   category: string,
    // }

    let resultData: any = {
      type: parsed.type,
      date: parsed.date,
      category: parsed.category,
      confidence: parsed.confidence,
    };

    if (parsed.type === 'expense') {
      resultData.storeName = parsed.description;
      resultData.totalAmount = parsed.amount;
    } else if (parsed.type === 'income') {
      resultData.sourceName = parsed.description;
      resultData.totalAmount = parsed.amount;
      resultData.incomes = [{
        selected: true,
        sourceName: parsed.description,
        date: parsed.date,
        totalAmount: parsed.amount,
        category: parsed.category,
      }];
    } else if (parsed.type === 'debt') {
      resultData.creditorName = parsed.description;
      resultData.installmentAmount = parsed.amount;
      resultData.isSafe = true;
      resultData.aiAdvice = "Pastikan selalu mengontrol pengeluaran Anda. Bayar tagihan tepat waktu.";
    }

    return NextResponse.json({ success: true, data: resultData });
  } catch (error: any) {
    console.error('Scan Text API Error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server saat memproses teks.' }, { status: 500 });
  }
}
