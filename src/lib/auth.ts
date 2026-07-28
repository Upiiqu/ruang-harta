import { SignJWT, jwtVerify } from 'jose';

const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error('JWT_SECRET environment variable is not set. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
}
const JWT_SECRET = new TextEncoder().encode(secret);

const COOKIE_NAME = 'ruang_harta_auth_token';
const EXPIRY = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
}

/**
 * Creates a signed JWT token for a user session.
 */
export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(JWT_SECRET);
}

/**
 * Verifies and decodes a JWT token.
 * Returns null if the token is invalid or expired.
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
