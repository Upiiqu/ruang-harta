import { NextResponse } from 'next/server';
import { getWASocketStatus, initBaileysService } from '@/lib/whatsapp/baileys-service';

export async function GET() {
  try {
    // Return current status
    const status = getWASocketStatus();
    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    // Manually trigger initialization / reconnection
    await initBaileysService();
    const status = getWASocketStatus();
    return NextResponse.json({
      success: true,
      message: 'Inisialisasi Baileys WhatsApp Service berhasil dipanggil.',
      ...status,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
