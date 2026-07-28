import { URL } from 'url';
import { isIP } from 'net';

const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
  'metadata.google.internal',
  '169.254.169.254',
];

const BLOCKED_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^fc00:/,
  /^fe80:/,
];

export function isSafeUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    if (BLOCKED_HOSTS.includes(hostname)) {
      return false;
    }

    if (isIP(hostname)) {
      for (const range of BLOCKED_IP_RANGES) {
        if (range.test(hostname)) {
          return false;
        }
      }
    }

    return true;
  } catch {
    return false;
  }
}
