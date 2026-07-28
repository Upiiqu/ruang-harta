import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserFamily } from '@/lib/family';

function getUserId(request: Request): string | null {
  return request.headers.get('x-user-id');
}

export async function GET(request: Request) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const familyInfo = await getUserFamily(userId);
    if (!familyInfo) return NextResponse.json({ targets: [] });

    const { data: targets, error } = await supabase
      .from('targets')
      .select('*')
      .eq('family_id', familyInfo.family.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch targets error:', error);
      return NextResponse.json({ error: 'Gagal memuat target' }, { status: 500 });
    }

    return NextResponse.json({ targets: targets || [] });
  } catch (err: any) {
    console.error('Targets API error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const familyInfo = await getUserFamily(userId);
    if (!familyInfo) return NextResponse.json({ error: 'Belum bergabung dalam keluarga' }, { status: 400 });

    if (body.action === 'save-all' && Array.isArray(body.targets)) {
      await supabase.from('targets').delete().eq('family_id', familyInfo.family.id);

      if (body.targets.length > 0) {
        const rows = body.targets.map((t: any) => ({
          family_id: familyInfo.family.id,
          name: String(t.name || '').slice(0, 255),
          target_amount: Math.max(0, Number(t.targetAmount || t.target_amount || 0)),
          saved_amount: Math.max(0, Number(t.savedAmount || t.saved_amount || 0)),
          created_by: userId,
        }));

        const { error } = await supabase.from('targets').insert(rows);
        if (error) {
          console.error('Insert targets error:', error);
          return NextResponse.json({ error: 'Gagal menyimpan target' }, { status: 500 });
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Aksi tidak dikenal' }, { status: 400 });
  } catch (err: any) {
    console.error('Targets API error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
