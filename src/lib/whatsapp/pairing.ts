import { supabase } from '@/lib/supabase';

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

/**
 * Find user by phone, or auto-create a new user account if not found.
 * Returns the user (existing or newly created).
 */
export async function findOrCreateUserByPhone(phoneNumber: string): Promise<{ id: string; name: string }> {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

  const existing = await getUserByPhone(cleanPhone);
  if (existing) return existing;

  const autoName = `User ${cleanPhone.slice(-4)}`;
  const autoEmail = `wa_${cleanPhone}@whatsapp.ruangharta.app`;
  const dummyHash = '$2b$12$LJ3m4ys3Lg3HkF5G6Hi7O.v7hzdj6H6Jf7Kj8Hg9F0fG1hI2J3K4L5M6N7O8P9Q';

  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      name: autoName,
      email: autoEmail,
      password_hash: dummyHash,
      phone_number: cleanPhone,
    })
    .select('id, name')
    .single();

  if (error || !newUser) {
    console.error('Auto-create user error:', error);
    return { id: '', name: autoName };
  }

  return { id: newUser.id, name: newUser.name };
}
