// Type definitions for AI Background Remover

export interface User {
  id: string;
  email: string;
  password: string;
  freeQuota: number;
  paidCredits: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserResponse {
  id: string;
  email: string;
  freeQuota: number;
  paidCredits: number;
  createdAt: string;
}

export interface ImageRecord {
  id: string;
  userId: string;
  originalName: string;
  resultUrl: string;
  creditsUsed: number;
  createdAt: string;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: UserResponse;
  token?: string;
  message?: string;
}

export interface ImageUploadResponse {
  success: boolean;
  imageUrl?: string;
  message?: string;
  remainingQuota?: number;
}

export type Lang = 'en' | 'zh' | 'ja' | 'ko' | 'es' | 'fr' | 'de';

export interface Translation {
  title: string;
  subtitle: string;
  uploadTitle: string;
  uploadHint: string;
  uploadButton: string;
  processing: string;
  download: string;
  tryAgain: string;
  examplesTitle: string;
  errorApi: string;
  errorFile: string;
  errorQuota: string;
  login: string;
  register: string;
  logout: string;
  dashboard: string;
  history: string;
  remainingQuota: string;
  remainingCredits: string;
  pricing: string;
  packages: string;
}
