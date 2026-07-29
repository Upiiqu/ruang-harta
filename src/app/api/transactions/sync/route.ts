import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { getUserFamily } from '@/lib/family';

function getUserId(request: Request): string | null {
  return request.headers.get('x-user-id');
}

export async function GET(request: Request) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const familyInfo = await getUserFamily(userId);
    let query = supabase.from('transactions').select('*');

    if (familyInfo) {
      query = query.eq('family_id', familyInfo.family.id);
    } else {
      query = query.eq('user_id', userId).is('family_id', null);
    }

    const { data: transactions, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching Supabase transactions:', error);
      return NextResponse.json({ success: true, transactions: [] });
    }

    return NextResponse.json({ success: true, transactions: transactions || [] });
  } catch (error: any) {
    console.error('Sync API Error:', error);
    return NextResponse.json({ error: 'Gagal sinkronisasi data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { action, transactionId, transactions } = body;

    if (action === 'delete' && transactionId) {
      const familyInfo = await getUserFamily(userId);
      const familyId = familyInfo?.family.id || null;
      let query = supabase.from('transactions').delete().eq('id', transactionId).eq('user_id', userId);
      if (familyId) query = query.eq('family_id', familyId);
      await query;
      return NextResponse.json({ success: true });
    }

    if (action === 'save-all' && Array.isArray(transactions)) {
      const familyInfo = await getUserFamily(userId);
      const familyId = familyInfo?.family.id || null;

      if (transactions.length > 0) {
        const ALLOWED_FIELDS = ['type', 'amount', 'category', 'description', 'date', 'items', 'storeName', 'store_name'] as const;
        const rows = transactions.map((tx: any) => {
          const safe: Record<string, any> = {
            user_id: userId,
            family_id: familyId,
          };
          for (const field of ALLOWED_FIELDS) {
            const val = tx[field] ?? tx[field.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] ?? null;
            if (val !== null) {
              if (field === 'type') safe.type = ['expense', 'income'].includes(val) ? val : 'expense';
              else if (field === 'amount') safe.amount = Math.max(0, Number(val) || 0);
              else if (field === 'category') safe.category = String(val).slice(0, 100);
              else if (field === 'description' || field === 'storeName' || field === 'store_name') {
                safe.description = safe.description || String(val).slice(0, 500);
                if (field === 'store_name' || field === 'storeName') safe.store_name = String(val).slice(0, 100);
              }
              else if (field === 'date') safe.date = String(val).slice(0, 10);
              else if (field === 'items') safe.items = typeof val === 'object' ? val : null;
            }
          }
          return safe;
        });

        const { error: insErr } = await supabase.from('transactions').upsert(rows, { onConflict: 'id' });
        if (insErr) {
          console.error('Insert transactions error:', insErr);
          return NextResponse.json({ error: 'Gagal menyimpan transaksi' }, { status: 500 });
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memproses' }, { status: 500 });
  }
}
