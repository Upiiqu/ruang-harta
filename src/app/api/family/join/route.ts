import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function getUserId(request: Request): string | null {
  return request.headers.get('x-user-id');
}

export async function POST(request: Request) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { inviteCode } = await request.json();

    if (!inviteCode || typeof inviteCode !== 'string') {
      return NextResponse.json({ error: 'Kode undangan tidak valid' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('family_members')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Kamu sudah tergabung dalam keluarga' }, { status: 400 });
    }

    const code = inviteCode.trim().toUpperCase();

    const { data: family, error: famErr } = await supabase
      .from('families')
      .select('id, name')
      .eq('invite_code', code)
      .single();

    if (famErr || !family) {
      return NextResponse.json({ error: 'Kode undangan tidak ditemukan' }, { status: 404 });
    }

    const { error: memErr } = await supabase
      .from('family_members')
      .insert({ family_id: family.id, user_id: userId, role: 'member' });

    if (memErr) {
      return NextResponse.json({ error: 'Gagal bergabung. Coba lagi.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, family });
  } catch (err: any) {
    console.error('Join family error:', err);
    return NextResponse.json({ error: 'Gagal bergabung dengan keluarga' }, { status: 500 });
  }
}
