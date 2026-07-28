import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserFamily } from '@/lib/family';

function getUserId(request: Request): string | null {
  return request.headers.get('x-user-id');
}

export async function POST(request: Request) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { transactions, targets } = await request.json();
    const familyInfo = await getUserFamily(userId);
    const familyId = familyInfo?.family.id || null;

    const results: string[] = [];

    const ALLOWED_TX_FIELDS = new Set(['type', 'amount', 'category', 'description', 'date', 'items', 'storeName', 'store_name']);
    if (Array.isArray(transactions) && transactions.length > 0) {
      const rows = transactions.map((tx: any) => {
        const safe: Record<string, any> = { user_id: userId, family_id: familyId };
        for (const key of ALLOWED_TX_FIELDS) {
          const val = tx[key] ?? null;
          if (val !== null) {
            if (key === 'type') safe.type = ['expense', 'income'].includes(val) ? val : 'expense';
            else if (key === 'amount') safe.amount = Math.max(0, Number(val) || 0);
            else if (key === 'category') safe.category = String(val).slice(0, 100);
            else if (key === 'description' || key === 'storeName') safe.description = String(val).slice(0, 500);
            else if (key === 'store_name') safe.store_name = String(val).slice(0, 100);
            else if (key === 'date') safe.date = String(val).slice(0, 10);
            else if (key === 'items') safe.items = typeof val === 'object' ? val : null;
          }
        }
        return safe;
      });

      const { error, count } = await supabase.from('transactions').insert(rows).select('id');
      if (error) console.error('Migrate transactions error:', error);
      results.push(`Transaksi: ${count || 0} disimpan`);
    }

    if (Array.isArray(targets) && targets.length > 0 && familyId) {
      const rows = targets.map((t: any) => ({
        family_id: familyId,
        name: String(t.name || '').slice(0, 255),
        target_amount: Math.max(0, Number(t.targetAmount || t.target_amount || 0)),
        saved_amount: Math.max(0, Number(t.savedAmount || t.saved_amount || 0)),
        created_by: userId,
      }));

      const { error, count } = await supabase.from('targets').insert(rows).select('id');
      if (error) console.error('Migrate targets error:', error);
      results.push(`Target: ${count || 0} disimpan`);
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error('Migrate API error:', err);
    return NextResponse.json({ error: 'Gagal migrasi data' }, { status: 500 });
  }
}
