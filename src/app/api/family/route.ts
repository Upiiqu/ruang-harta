import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateInviteCode } from '@/lib/family';

function getUserId(request: Request): string | null {
  return request.headers.get('x-user-id');
}

export async function GET(request: Request) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: membership } = await supabase
    .from('family_members')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (!membership) {
    return NextResponse.json({ family: null });
  }

  const { data: family } = await supabase
    .from('family_members')
    .select('family_id, role, families!inner(*)')
    .eq('user_id', userId)
    .single();

  const { data: members } = await supabase
    .from('family_members')
    .select('id, role, joined_at, users!inner(name, email)')
    .eq('family_id', family?.family_id);

  return NextResponse.json({
    family: family ? { ...(family as any).families, role: (family as any).role } : null,
    members: members || [],
  });
}

export async function POST(request: Request) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { name } = await request.json();

    const { data: existing } = await supabase
      .from('family_members')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Kamu sudah tergabung dalam keluarga' }, { status: 400 });
    }

    let inviteCode = generateInviteCode();
    let retries = 0;
    while (retries < 5) {
      const { data: dup } = await supabase
        .from('families')
        .select('id')
        .eq('invite_code', inviteCode)
        .single();
      if (!dup) break;
      inviteCode = generateInviteCode();
      retries++;
    }

    const { data: family, error: famErr } = await supabase
      .from('families')
      .insert({ name: name || 'Keluarga Saya', invite_code: inviteCode })
      .select()
      .single();

    if (famErr || !family) {
      return NextResponse.json({ error: 'Gagal membuat keluarga' }, { status: 500 });
    }

    const { error: memErr } = await supabase
      .from('family_members')
      .insert({ family_id: family.id, user_id: userId, role: 'owner' });

    if (memErr) {
      await supabase.from('families').delete().eq('id', family.id);
      return NextResponse.json({ error: 'Gagal mendaftarkan anggota' }, { status: 500 });
    }

    return NextResponse.json({ success: true, family });
  } catch (err: any) {
    console.error('Family API error:', err);
    return NextResponse.json({ error: 'Gagal memproses data keluarga' }, { status: 500 });
  }
}
