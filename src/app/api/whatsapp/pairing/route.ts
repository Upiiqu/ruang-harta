import { NextResponse } from 'next/server';
import { generatePairingCode } from '@/lib/whatsapp/pairing';
import { supabase } from '@/lib/supabase';

// Helper to check user-id header from auth middleware
function getUserId(request: Request): string | null {
  return request.headers.get('x-user-id');
}

export async function GET(request: Request) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if user already has linked phone number in Supabase
    const { data: user } = await supabase
      .from('users')
      .select('phone_number')
      .eq('id', userId)
      .maybeSingle();

    const pairingCode = generatePairingCode(userId);

    return NextResponse.json({
      success: true,
      phoneNumber: user?.phone_number || null,
      isPaired: !!user?.phone_number,
      pairingCode,
      expiresInMinutes: 15,
    });
  } catch (error: any) {
    console.error('Pairing API Error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data pairing' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action } = await request.json();

    if (action === 'unlink') {
      await supabase
        .from('users')
        .update({ phone_number: null })
        .eq('id', userId);

      return NextResponse.json({ success: true, message: 'Nomor WhatsApp berhasil dilepas.' });
    }

    // Generate fresh code
    const code = generatePairingCode(userId);
    return NextResponse.json({ success: true, pairingCode: code });
  } catch (error: any) {
    console.error('Pairing POST error:', error);
    return NextResponse.json({ error: 'Gagal memproses permintaan' }, { status: 500 });
  }
}
