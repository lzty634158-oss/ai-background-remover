'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card } from '@/components/ui';
import AppHeader from '@/components/AppHeader';
import { translations, type Lang, type Translation } from '@/lib/translations';

type RegisterStep = 'form' | 'verify';

export default function RegisterPage() {
  const router = useRouter();
  
  // Form step
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  
  // Verify step
  const [step, setStep] = useState<RegisterStep>('form');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingUserId, setPendingUserId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const [lang, setLang] = useState<Lang>('zh');
  const [t, setT] = useState<Translation>(translations.zh);

  useEffect(() => {
    if (localStorage.getItem('token')) {
      router.push('/');
      return;
    }
    const savedLang = (localStorage.getItem('lang') as Lang) || 'zh';
    setLang(savedLang);
    setT(translations[savedLang]);
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang);
    setT(translations[newLang]);
    localStorage.setItem('lang', newLang);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError('Please enter a valid email address');
      return;
    }

    setFormLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Move to verification step
      setPendingEmail(data.email);
      setPendingUserId(data.pendingUserId);
      setStep('verify');
      setResendCooldown(60);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError('');

    if (verificationCode.length !== 6) {
      setVerifyError('Please enter a 6-digit code');
      return;
    }

    setVerifyLoading(true);

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, code: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/');
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    setResendLoading(true);
    setVerifyError('');

    try {
      const response = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend code');
      }

      setResendCooldown(60);
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToRegister = () => {
    setStep('form');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setVerificationCode('');
    setPendingEmail('');
    setPendingUserId('');
    setFormError('');
    setVerifyError('');
  };

  // Render verification step
  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
        <AppHeader lang={lang} onLangChange={handleLangChange} t={t} />

        <main className="flex items-center justify-center px-4 pt-8">
          <div className="w-full max-w-md">
            <Card className="bg-gray-800/80 border-gray-700">
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">✉️</div>
                <h1 className="text-2xl font-bold text-white mb-2">{t.verifyEmail}</h1>
                <p className="text-gray-400 text-sm">
                  {t.codeSentTo}<br />
                  <span className="text-violet-400 font-medium">{pendingEmail}</span>
                </p>
              </div>

              <form onSubmit={handleVerifySubmit} className="space-y-4">
                <Input
                  type="text"
                  label={t.verificationCode}
                  placeholder={t.enterVerificationCode}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                  className="text-center text-2xl tracking-widest font-mono"
                />

                {verifyError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
                    {verifyError}
                  </div>
                )}

                <Button type="submit" className="w-full" loading={verifyLoading}>
                  {t.verifying}
                </Button>
              </form>

              <div className="mt-6 text-center space-y-2">
                <p className="text-gray-400 text-sm">
                  {t.didNotReceiveCode}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResendCode}
                  loading={resendLoading}
                  disabled={resendCooldown > 0}
                  className="text-violet-400 hover:text-violet-300"
                >
                  {resendCooldown > 0 ? `${t.resendCode} (${resendCooldown}s)` : t.resendCode}
                </Button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700 text-center">
                <button
                  onClick={handleBackToRegister}
                  className="text-gray-400 hover:text-gray-300 text-sm"
                >
                  ← {t.backToRegister}
                </button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Render form step
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      <AppHeader lang={lang} onLangChange={handleLangChange} t={t} />

      <main className="flex items-center justify-center px-4 pt-8">
        <div className="w-full max-w-md">
          <Card className="bg-gray-800/80 border-gray-700">
            <h1 className="text-2xl font-bold text-white mb-2 text-center">{t.register}</h1>
            <p className="text-gray-400 text-center mb-6">Get 10 free images to start!</p>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <Input
                type="email"
                label="Email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                type="password"
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Input
                type="password"
                label="Confirm Password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {formError}
                </div>
              )}

              <Button type="submit" className="w-full" loading={formLoading}>
                {t.register}
              </Button>
            </form>

            <p className="mt-6 text-center text-gray-400">
              {t.login}?{' '}
              <Link href="/login" className="text-violet-400 hover:text-violet-300">
                → {t.login}
              </Link>
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
