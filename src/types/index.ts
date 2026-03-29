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
  hasPassword?: boolean;
  provider?: 'google' | 'local';
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
  // Profile page
  personalCenter?: string;
  profileInfo?: string;
  displayName?: string;
  enterDisplayName?: string;
  avatarUrl?: string;
  enterAvatarUrl?: string;
  phone?: string;
  enterPhone?: string;
  bio?: string;
  tellAboutYourself?: string;
  bioLength?: string;
  email?: string;
  emailCannotChange?: string;
  profilePhoto?: string;
  saveChanges?: string;
  saving?: string;
  profileSaved: string;
  profileSaveFailed: string;
  accountOverview?: string;
  totalCredits?: string;
  backToProfile?: string;
  backToDashboard?: string;
  loginHistory?: string;
  trackAccessLog?: string;
  records?: string;
  noLoginHistory?: string;
  browserDevice?: string;
  ipAddress?: string;
  dateTime?: string;
  relativeTime?: string;
  google?: string;
  justNow: string;
  ago: string;
  back?: string;
  pagination: string;
  previous: string;
  next: string;
  // Security settings
  securitySettings?: string;
  changePassword?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
  enterCurrentPassword?: string;
  enterNewPassword?: string;
  enterConfirmPassword?: string;
  passwordTooShort?: string;
  passwordMismatch?: string;
  passwordChanged?: string;
  passwordChangeFailed?: string;
  passwordProtected?: string;
  savePassword?: string;
  cancel?: string;
  // Email verification
  enterVerificationCode?: string;
  verificationCode?: string;
  verifyEmail?: string;
  codeSentTo?: string;
  didNotReceiveCode?: string;
  resendCode?: string;
  codeExpired?: string;
  invalidCode?: string;
  verificationSuccess?: string;
  registerSuccess?: string;
  backToRegister?: string;
  verifying?: string;
  setPassword?: string;
  passwordNotSet?: string;
  // New register flow
  sendCode?: string;
  enterEmail?: string;
  emailWillVerify?: string;
  checkInbox?: string;
  noCode?: string;
  changeEmail?: string;
  confirmPassword?: string;
  completeRegistration?: string;
  almostDone?: string;
  emailVerified?: string;
  backToVerify?: string;
  invalidEmail?: string;
  enter6Digit?: string;
  passwordMinLength?: string;
  verifyAndContinue?: string;
  alreadyHaveAccount?: string;
}
