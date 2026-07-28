import { randomInt } from 'node:crypto';
import { supabase } from '@/lib/supabase';

// In-memory cache for fast OTP pairing code lookup (Code -> { userId, expiresAt })
const pairingStore = new Map<string, { userId: string; expiresAt: number }>();

/**
 * Generate a 6-digit pairing code for a user (valid for 15 minutes)
 */
export function generatePairingCode(userId: string): string {
  // Clean up expired codes
  const now = Date.now();
  for (const [code, item] of pairingStore.entries()) {
    if (item.expiresAt < now) {
      pairingStore.delete(code);
    }
  }

    // Random 8-character alphanumeric code appended to RH-
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(randomInt(0, chars.length));
  }
  const code = `RH-${randomPart}`;
  
  // Store code (valid 15 mins)
  pairingStore.set(code, {
    userId,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });

  return code;
}

/**
 * Verify pairing code sent by a WhatsApp phone number
 */
export async function verifyPairingCode(phoneNumber: string, inputCode: string): Promise<{ success: boolean; message: string; userName?: string }> {
  const formattedCode = inputCode.trim().toUpperCase();
  const entry = pairingStore.get(formattedCode);

  if (!entry) {
    return { success: false, message: 'Kode pairing tidak ditemukan atau sudah kadaluarsa. Silakan minta kode baru dari dashboard web.' };
  }

  if (Date.now() > entry.expiresAt) {
    pairingStore.delete(formattedCode);
    return { success: false, message: 'Kode pairing sudah kadaluarsa. Silakan buat kode baru.' };
  }

  // Clean phone number (strip @s.whatsapp.net, +, spaces)
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

  try {
    // Update user profile in Supabase
    const { data: user, error } = await supabase
      .from('users')
      .update({ phone_number: cleanPhone })
      .eq('id', entry.userId)
      .select('name')
      .single();

    if (error) {
      console.error('Error updating phone number in Supabase:', error);
      return { success: false, message: 'Gagal menyimpan nomor ke database. Pastikan kolom phone_number sudah dibuat di tabel users.' };
    }

    // Remove used code
    pairingStore.delete(formattedCode);

    return {
      success: true,
      userName: user?.name || 'Pengguna Ruang Harta',
      message: `Selamat! Akun Ruang Harta berhasil terhubung dengan nomor WhatsApp ini.`,
    };
  } catch (err: any) {
    console.error('Pairing error:', err);
    return { success: false, message: 'Terjadi kesalahan sistem saat menghubungkan akun.' };
  }
}

/**
 * Find registered user ID by phone number
 */
export async function getUserByPhone(phoneNumber: string): Promise<{ id: string; name: string } | null> {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name')
      .eq('phone_number', cleanPhone)
      .maybeSingle();

    if (error || !user) {
      return null;
    }

    return { id: user.id, name: user.name };
  } catch {
    return null;
  }
}
