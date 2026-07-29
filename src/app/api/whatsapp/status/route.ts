import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const fonnteToken = process.env.FONNTE_TOKEN || process.env.WHATSAPP_API_TOKEN;

    return NextResponse.json({
      success: true,
      status: fonnteToken ? 'connected' : 'disconnected',
      botNumber: process.env.WHATSAPP_BOT_NUMBER || null,
      provider: 'fonnte',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
