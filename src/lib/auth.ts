import { db, generateId } from './db';
import { hash, compare } from './crypto';

export interface CreateUserParams {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  password: string;
  free_quota: number;
  paid_credits: number;
  created_at: string;
  updated_at: string;
}

export function createUser({ email, password }: CreateUserParams): User | null {
  const hashedPassword = hash(password);
  const id = generateId();
  
  try {
    const stmt = db.prepare(`
      INSERT INTO users (id, email, password, free_quota, paid_credits)
      VALUES (?, ?, ?, 10, 0)
    `);
    stmt.run(id, email, hashedPassword);
    
    return getUserById(id);
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

export function getUserByEmail(email: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email) as User | null;
}

export function getUserById(id: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) as User | null;
}

export function verifyPassword(user: User, password: string): boolean {
  return compare(password, user.password);
}

export function updateUserQuota(userId: string, freeQuota: number, paidCredits: number) {
  const stmt = db.prepare(`
    UPDATE users 
    SET free_quota = ?, paid_credits = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  return stmt.run(freeQuota, paidCredits, userId);
}

export function useQuota(userId: string): { success: boolean; remaining: number; type: 'free' | 'paid' } {
  const user = getUserById(userId);
  if (!user) return { success: false, remaining: 0, type: 'free' };

  if (user.free_quota > 0) {
    updateUserQuota(userId, user.free_quota - 1, user.paid_credits);
    return { success: true, remaining: user.free_quota - 1, type: 'free' };
  } else if (user.paid_credits > 0) {
    updateUserQuota(userId, user.free_quota, user.paid_credits - 1);
    return { success: true, remaining: user.paid_credits - 1, type: 'paid' };
  }

  return { success: false, remaining: 0, type: 'free' };
}

export function addPaidCredits(userId: string, credits: number) {
  const user = getUserById(userId);
  if (!user) return false;
  
  updateUserQuota(userId, user.free_quota, user.paid_credits + credits);
  return true;
}
