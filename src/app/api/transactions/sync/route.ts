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

/**
 * Sanitize a single transaction object into a safe DB row.
 * Preserves `id` when present so Supabase upsert can match existing records.
 */
function sanitizeTransaction(tx: any, userId: string, familyId: string | null): Record<string, any> {
  const safe: Record<string, any> = {
    user_id: userId,
    family_id: familyId,
  };

  // Preserve client-side id so upsert on conflict 'id' works correctly
  if (tx.id) safe.id = String(tx.id);

  const ALLOWED_FIELDS = ['type', 'amount', 'category', 'description', 'date', 'items', 'storeName', 'store_name'] as const;

  for (const field of ALLOWED_FIELDS) {
    const val = tx[field] ?? tx[field.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())] ?? null;
    if (val !== null) {
      if (field === 'type') safe.type = ['expense', 'income', 'debt'].includes(val) ? val : 'expense';
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

    // save-all: upsert only (backward-compatible, no deletion)
    if (action === 'save-all' && Array.isArray(transactions)) {
      const familyInfo = await getUserFamily(userId);
      const familyId = familyInfo?.family.id || null;

      if (transactions.length > 0) {
        const rows = transactions.map((tx: any) => sanitizeTransaction(tx, userId, familyId));
        const { error: insErr } = await supabase.from('transactions').upsert(rows, { onConflict: 'id' });
        if (insErr) {
          console.error('Insert transactions error:', insErr);
          return NextResponse.json({ error: 'Gagal menyimpan transaksi' }, { status: 500 });
        }
      }

      return NextResponse.json({ success: true });
    }

    // replace-all: full sync — upsert client list + delete server rows not in client list
    if (action === 'replace-all' && Array.isArray(transactions)) {
      const familyInfo = await getUserFamily(userId);
      const familyId = familyInfo?.family.id || null;

      // 1. Upsert all client transactions
      if (transactions.length > 0) {
        const rows = transactions.map((tx: any) => sanitizeTransaction(tx, userId, familyId));
        const { error: insErr } = await supabase.from('transactions').upsert(rows, { onConflict: 'id' });
        if (insErr) {
          console.error('Replace-all upsert error:', insErr);
          return NextResponse.json({ error: 'Gagal menyimpan transaksi' }, { status: 500 });
        }
      }

      // 2. Delete server-side rows that the client no longer has
      const clientIds = transactions.map((tx: any) => String(tx.id)).filter(Boolean);
      let deleteQuery = supabase.from('transactions').delete().eq('user_id', userId);
      if (familyId) deleteQuery = deleteQuery.eq('family_id', familyId);
      if (clientIds.length > 0) {
        // Delete rows NOT in the client's id list
        deleteQuery = deleteQuery.not('id', 'in', `(${clientIds.join(',')})`);
      }
      // If clientIds is empty, delete all user's transactions (user cleared everything)
      const { error: delErr } = await deleteQuery;
      if (delErr) {
        console.error('Replace-all delete error:', delErr);
        // Non-fatal: upsert succeeded, deletion is best-effort
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memproses' }, { status: 500 });
  }
}
