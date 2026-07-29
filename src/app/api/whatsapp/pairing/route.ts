import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function getUserId(request: Request): string | null {
  return request.headers.get('x-user-id');
}

export async function GET(request: Request) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: user } = await supabase
      .from('users')
      .select('phone_number')
      .eq('id', userId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      phoneNumber: user?.phone_number || null,
      isPaired: !!user?.phone_number,
    });
  } catch (error: any) {
    console.error('Error fetching phone:', error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action, phoneNumber } = await request.json();

    if (action === 'link' && phoneNumber) {
      const cleanPhone = String(phoneNumber).replace(/[^0-9]/g, '');
      await supabase.from('users').update({ phone_number: cleanPhone }).eq('id', userId);
      return NextResponse.json({ success: true, message: 'Nomor berhasil ditautkan.' });
    }

    if (action === 'unlink') {
      await supabase.from('users').update({ phone_number: null }).eq('id', userId);
      return NextResponse.json({ success: true, message: 'Nomor WhatsApp berhasil dilepas.' });
    }

    return NextResponse.json({ success: true, phoneNumber: null });
  } catch (error: any) {
    console.error('Pairing POST error:', error);
    return NextResponse.json({ error: 'Gagal memproses permintaan' }, { status: 500 });
  }
}
