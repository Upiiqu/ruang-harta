import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

// ─── In-Memory Rate Limiter ──────────────────────────────────────────────────
// NOTE: This works for single-instance deployments. For multi-instance
// serverless (Netlify/Vercel), each cold start resets state. This still
// provides protection within a single function instance lifecycle.
// For stronger rate limiting, upgrade to Upstash Redis.

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function rateLimit(
  ip: string,
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const storeKey = `${key}:${ip}`;
  const now = Date.now();
  const entry = rateLimitStore.get(storeKey);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(storeKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

// Clean up old entries periodically to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetAt) rateLimitStore.delete(key);
  }
}, 60_000);

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? '127.0.0.1';

  // ── Rate Limiting ────────────────────────────────────────────────────────
  
  // Auth endpoint: 10 requests per 15 minutes (anti brute-force)
  if (pathname === '/api/auth') {
    const { allowed } = rateLimit(ip, 'auth', 10, 15 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan. Silakan tunggu beberapa menit.' },
        { status: 429, headers: { 'Retry-After': '900' } }
      );
    }
  }

  // Scan endpoints: 30 requests per minute (anti AI API abuse)
  if (pathname.startsWith('/api/scan')) {
    const { allowed } = rateLimit(ip, 'scan', 30, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak request scan. Harap tunggu sebentar.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  // Analyze endpoint: 20 requests per minute
  if (pathname === '/api/analyze') {
    const { allowed } = rateLimit(ip, 'analyze', 20, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak request analisis. Harap tunggu sebentar.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  // WhatsApp webhook: 60 requests per minute (anti-abuse)
  if (pathname === '/api/whatsapp/webhook') {
    const { allowed } = rateLimit(ip, 'whatsapp-webhook', 60, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak request. Harap tunggu.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  // Transactions sync: 30 requests per minute
  if (pathname.startsWith('/api/transactions')) {
    const { allowed } = rateLimit(ip, 'transactions', 30, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak request. Harap tunggu.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  // Targets endpoint: 20 requests per minute
  if (pathname.startsWith('/api/targets')) {
    const { allowed } = rateLimit(ip, 'targets', 20, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak request. Harap tunggu.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  // ── Auth Routes (always accessible) ────────────────────────────────────
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isPublicApi = pathname === '/api/auth' || pathname === '/api/whatsapp/webhook' || pathname === '/api/whatsapp/status';
  const isStaticFile = pathname.startsWith('/_next') || pathname === '/favicon.ico';

  if (isPublicApi || isStaticFile) return NextResponse.next();

  // ── JWT Verification ────────────────────────────────────────────────────
  const tokenValue = request.cookies.get(COOKIE_NAME)?.value;
  const user = tokenValue ? await verifyToken(tokenValue) : null;

  if (!user && !isAuthPage) {
    // API calls → 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // UI pages → redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && isAuthPage) {
    // Already logged in → redirect to dashboard
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Attach user info to request headers for downstream use
  // Only pass user ID — never forward PII (email, name) via headers to prevent logging/exposure
  const requestHeaders = new Headers(request.headers);
  if (user) {
    requestHeaders.set('x-user-id', user.userId);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
