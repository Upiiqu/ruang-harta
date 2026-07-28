import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createToken, COOKIE_NAME } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { User } from '@/lib/supabase';

const SIGNUP_SECRET = process.env.SIGNUP_SECRET_CODE;
if (!SIGNUP_SECRET) {
  console.error('SIGNUP_SECRET_CODE environment variable is not set — signup is disabled');
}
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
const BCRYPT_ROUNDS = 12;

function setCookieOptions(response: NextResponse, token: string, maxAge: number) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
    path: '/',
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, name, email, password, secretCode } = body;

    // --- Basic input validation ---
    if (!action || typeof action !== 'string') {
      return NextResponse.json({ error: 'Aksi tidak valid.' }, { status: 400 });
    }

    // ─────────────────────────────────────────
    // SIGNUP
    // ─────────────────────────────────────────
    if (action === 'signup') {
      if (!name || !email || !password || !secretCode) {
        return NextResponse.json({ error: 'Semua field wajib diisi.' }, { status: 400 });
      }

      // Validate types
      if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
        return NextResponse.json({ error: 'Format input tidak valid.' }, { status: 400 });
      }

      // Validate secret code
      if (!SIGNUP_SECRET || secretCode.toString().toUpperCase() !== SIGNUP_SECRET.toUpperCase()) {
        return NextResponse.json({ error: 'Kode akses salah. Anda tidak memiliki izin untuk mendaftar.' }, { status: 403 });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Format email tidak valid.' }, { status: 400 });
      }

      // Validate password strength
      const passwordErrors: string[] = [];
      if (password.length < 8) passwordErrors.push('minimal 8 karakter');
      if (!/[A-Z]/.test(password)) passwordErrors.push('huruf besar');
      if (!/[a-z]/.test(password)) passwordErrors.push('huruf kecil');
      if (!/[0-9]/.test(password)) passwordErrors.push('angka');
      if (passwordErrors.length > 0) {
        return NextResponse.json({ error: `Password harus mengandung: ${passwordErrors.join(', ')}.` }, { status: 400 });
      }

      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (existingUser) {
        return NextResponse.json({ error: 'Email sudah terdaftar.' }, { status: 409 });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      // Insert new user
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({ name: name.trim(), email: email.toLowerCase(), password_hash: passwordHash })
        .select('id, name, email')
        .single();

      if (insertError || !newUser) {
        console.error('Signup insert error:', insertError);
        return NextResponse.json({ error: 'Gagal membuat akun. Silakan coba lagi.' }, { status: 500 });
      }

      // Create JWT and set cookie
      const token = await createToken({ userId: newUser.id, email: newUser.email, name: newUser.name });
      const response = NextResponse.json({ success: true, name: newUser.name });
      setCookieOptions(response, token, COOKIE_MAX_AGE);
      return response;
    }

    // ─────────────────────────────────────────
    // LOGIN
    // ─────────────────────────────────────────
    if (action === 'login') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email dan password wajib diisi.' }, { status: 400 });
      }

      if (typeof email !== 'string' || typeof password !== 'string') {
        return NextResponse.json({ error: 'Format input tidak valid.' }, { status: 400 });
      }

      // Find user by email
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('id, name, email, password_hash')
        .eq('email', email.toLowerCase())
        .single<User>();

      // Use constant-time comparison to prevent timing attacks
      // Even if user not found, still run bcrypt to prevent user enumeration
      const dummyHash = '$2b$12$LJ3m4ys3Lg3HkF5G6Hi7O.v7hzdj6H6Jf7Kj8Hg9F0fG1hI2J3K4L5M6N7O8P9Q';
      const hashToCompare = user?.password_hash ?? dummyHash;
      const isPasswordValid = await bcrypt.compare(password, hashToCompare);

      if (fetchError || !user || !isPasswordValid) {
        // Generic error message to prevent user enumeration
        return NextResponse.json({ error: 'Email atau password salah.' }, { status: 401 });
      }

      // Create JWT and set cookie
      const token = await createToken({ userId: user.id, email: user.email, name: user.name });
      const response = NextResponse.json({ success: true, name: user.name });
      setCookieOptions(response, token, COOKIE_MAX_AGE);
      return response;
    }

    // ─────────────────────────────────────────
    // LOGOUT
    // ─────────────────────────────────────────
    if (action === 'logout') {
      const response = NextResponse.json({ success: true });
      setCookieOptions(response, '', 0);
      return response;
    }

    return NextResponse.json({ error: 'Aksi tidak dikenal.' }, { status: 400 });

  } catch (error: any) {
    console.error('Auth API error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
