/**
 * Crypto utilities - browser and Edge runtime compatible
 * Uses Web Crypto API (available in both browser and Cloudflare Workers)
 */

const SALT = 'ai-bg-remover-salt';

/**
 * Hash a password using SHA-256 via Web Crypto API
 */
export async function hash(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a password against a stored hash
 * Hash format: "hexhash:timestamp"
 */
export async function compare(password: string, hashedPassword: string): Promise<boolean> {
  const [hashPart] = hashedPassword.split(':');
  const computed = await hash(password);
  return computed === hashPart;
}

/**
 * Generate a simple auth token (base64url encoded)
 */
export function generateToken(userId: string): string {
  const payload = userId + ':' + Date.now();
  return btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Verify and decode an auth token
 * Returns userId if valid, null if expired or invalid
 */
export function verifyToken(token: string): string | null {
  try {
    const padded = token.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(padded);
    const [userId, timestamp] = decoded.split(':');
    if (Date.now() - parseInt(timestamp) > 7 * 24 * 60 * 60 * 1000) {
      return null;
    }
    return userId;
  } catch {
    return null;
  }
}
