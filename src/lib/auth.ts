/**
 * Auth library - client-side HTTP calls to Cloudflare Worker API
 * Replaces better-sqlite3 based implementation
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// ─── Types ───────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  free_quota: number;
  paid_credits: number;
  created_at: string;
  updated_at?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

// ─── Auth API calls (to Cloudflare Worker) ────────────────
export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function getUser(token: string): Promise<{ success: boolean; user?: User; message?: string }> {
  const res = await fetch(`${API_BASE}/api/user`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function addCredits(token: string, credits: number): Promise<{ success: boolean; user?: User; message?: string }> {
  const res = await fetch(`${API_BASE}/api/user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ credits }),
  });
  return res.json();
}

// ─── Token helpers (browser-safe, no Node.js Buffer) ─────
export function generateToken(userId: string): string {
  // Simple base64url encoding without Node.js Buffer
  const payload = userId + ':' + Date.now();
  return btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function verifyToken(token: string): string | null {
  try {
    // Restore base64 padding and standard base64
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

// ─── Password helpers (browser-safe Web Crypto API) ──────
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'ai-bg-remover-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// ─── Local storage helpers ──────────────────────────────
export function saveToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
}

export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
}

export function removeToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
}
