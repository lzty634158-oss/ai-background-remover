// Type definitions for AI Background Remover

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  bio: string;
  phone: string;
  role: string;
  status: string;
  freeQuota: number;
  paidCredits: number;
  totalUsed?: number;
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  freeQuota: number;
  paidCredits: number;
  createdAt: string;
}

export interface LoginHistoryRecord {
  id: string;
  ip_address: string;
  user_agent: string;
  provider: string;
  created_at: string;
}

export interface LoginHistoryResponse {
  success: boolean;
  records: LoginHistoryRecord[];
  total: number;
  limit: number;
  offset: number;
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

export interface ProfileUpdateRequest {
  name?: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
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
  supportedTypes: string;
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
  availableCredits?: string;
  imagesUsed?: string;
  memberSince?: string;
  purchaseCredits?: string;
  processingHistory?: string;
  noImagesYet?: string;
}
