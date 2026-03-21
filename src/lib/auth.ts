/**
 * Auth library - client-side HTTP calls to Cloudflare Worker API
 * Replaces better-sqlite3 based implementation
 */

// Always call the standalone Worker directly — it has D1 bound
const WORKER_URL = 'https://ai-background-remover-api.lzty634158.workers.dev';

// ─── Types ───────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  freeQuota: number;
  paidCredits: number;
  totalUsed?: number;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

export interface HistoryRecord {
  id: string;
  original_name: string;
  result_key: string;
  credits_used: number;
  created_at: string;
}

export interface HistoryResponse {
  success: boolean;
  records: HistoryRecord[];
  total: number;
  limit: number;
  offset: number;
}

// ─── Auth API calls (to Cloudflare Worker) ────────────────
export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${WORKER_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${WORKER_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function getUser(token: string): Promise<{ success: boolean; user?: User; message?: string }> {
  const res = await fetch(`${WORKER_URL}/api/user`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function getHistory(token: string, limit = 20, offset = 0): Promise<HistoryResponse> {
  const res = await fetch(`${WORKER_URL}/api/history?limit=${limit}&offset=${offset}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function addCredits(token: string, credits: number): Promise<{ success: boolean; user?: User; message?: string }> {
  const res = await fetch(`${WORKER_URL}/api/user`, {
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
    localStorage.setItem('token', token);
  }
}

export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
}

export function removeToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}
