// Simple crypto utilities for password hashing
// In production, use proper JWT and bcrypt

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export function hash(password: string): string {
  // Simple hash for demo - in production use bcrypt
  let hash = 0;
  const salt = 'ai-bg-remover-salt';
  const combined = password + salt + SECRET_KEY;
  
  for (let i = 0; i < 1000; i++) {
    let char = combined.charCodeAt(i % combined.length);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return hash.toString(16) + ':' + Date.now().toString(16);
}

export function compare(password: string, hashedPassword: string): boolean {
  const [hash, timestamp] = hashedPassword.split(':');
  const salt = 'ai-bg-remover-salt';
  const combined = password + salt + SECRET_KEY;
  
  let newHash = 0;
  for (let i = 0; i < 1000; i++) {
    let char = combined.charCodeAt(i % combined.length);
    newHash = ((newHash << 5) - newHash) + char;
    newHash = newHash & newHash;
  }
  
  return newHash.toString(16) === hash;
}

export function generateToken(userId: string): string {
  const payload = userId + ':' + Date.now();
  return Buffer.from(payload).toString('base64');
}

export function verifyToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [userId, timestamp] = decoded.split(':');
    // Token valid for 7 days
    if (Date.now() - parseInt(timestamp) > 7 * 24 * 60 * 60 * 1000) {
      return null;
    }
    return userId;
  } catch {
    return null;
  }
}
