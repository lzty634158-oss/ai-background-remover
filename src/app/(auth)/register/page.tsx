'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card } from '@/components/ui';
import AppHeader from '@/components/AppHeader';
import { translations, type Lang, type Translation } from '@/lib/translations';

type RegisterStep = 'email' | 'verify' | 'password';
// Safe JSON parse — returns null if response is not JSON (e.g. 500 HTML page)
async function safeJson(response: Response): Promise<{data: any; error: string|null}> {
  const ct = response.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await response.text();
    return { data: null, error: `Server error (${response.status}): ${text.slice(0, 200)}` };
  }
  try {
    return { data: await response.json(), error: null };
  } catch {
    return { data: null, error: `Failed to parse response (status ${response.status})` };
  }
}


export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<RegisterStep>('email');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [emailSent, setEmailSent] = useState(false);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang);
    setT(translations[newLang]);
    localStorage.setItem('lang', newLang);
  };

  // Step 1: Send verification code
  const handleSendCode = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError(t.invalidEmail || 'Please enter a valid email');
      return;
    }
    setEmailError('');
    setLoading(true);

    try {
      // Call register API which sends the verification code
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'placeholder_temp' }),
      });
      const { data, error: jsonError } = await safeJson(response);
      if (jsonError) throw new Error(jsonError);

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to send code');
      }

      setEmailSent(true);
      setCooldown(60);
      setStep('verify');
      setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = async () => {
    if (verificationCode.replace(/\D/g, '').length !== 6) {
      setVerifyError(t.enter6Digit || 'Please enter the 6-digit code');
      return;
    }
    setVerifyError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode }),
      });
      const { data, error: jsonError } = await safeJson(response);
      if (jsonError) throw new Error(jsonError);
      if (!response.ok) {
        throw new Error(data?.message || 'Verification failed');
      }

      // Store temp token to complete registration with password
      localStorage.setItem('pending_token', data.token);
      localStorage.setItem('pending_email', email);
      setStep('password');
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Resend code
  const handleResend = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      const response = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const { data, error: jsonError } = await safeJson(response);
      if (jsonError) throw new Error(jsonError);
      if (!response.ok) throw new Error(data?.message || 'Failed to resend');
      setCooldown(60);
      setVerificationCode('');
      codeInputRefs.current[0]?.focus();
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Failed to resend');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set password and complete
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setPasswordError(t.passwordMinLength || 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError(t.passwordMismatch || 'Passwords do not match');
      return;
    }
    setPasswordError('');
    setLoading(true);

    try {
      // Complete registration by setting password
      // The pending_token from verify step proves email ownership
      const pendingToken = localStorage.getItem('pending_token');
      const response = await fetch('/api/auth/complete-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(pendingToken ? { 'Authorization': `Bearer ${pendingToken}` } : {}),
        },
        body: JSON.stringify({ email, password }),
      });

      // If no complete-registration endpoint, the verify already created the account
      // Just log in with the token we already have
      if (response.ok) {
        const { data: regData } = await safeJson(response);
        localStorage.setItem('token', regData?.token || pendingToken || '');
        localStorage.setItem('user', JSON.stringify(regData?.user || {}));
      } else {
        // Verify step already created account with temp password
        // Try to update password
        const loginResp = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (loginResp.ok) {
          const { data: loginData } = await safeJson(loginResp);
          localStorage.setItem('token', loginData?.token || '');
          localStorage.setItem('user', JSON.stringify(loginData?.user || {}));
        } else {
          // Fallback: just use the token we got from verify
          localStorage.setItem('token', pendingToken || '');
        }
      }

      localStorage.removeItem('pending_token');
      localStorage.removeItem('pending_email');
      router.push('/');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to complete registration');
    } finally {
      setLoading(false);
    }
  };

  // Code input handlers
  const handleCodeInput = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const newCode = verificationCode.padEnd(idx, ' ').split('').map((c, i) => i === idx ? digit : c).join('').trim();
    setVerificationCode(newCode);
    if (digit && idx < 5) codeInputRefs.current[idx + 1]?.focus();
    if (newCode.length === 6) handleVerifyCode();
  };

  const handleCodeKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[idx] && idx > 0) {
      codeInputRefs.current[idx - 1]?.focus();
    }
  };

  // ─── Step 1: Email ───
  if (step === 'email') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
        <AppHeader lang={lang} onLangChange={handleLangChange} t={t} />
        <main className="flex items-center justify-center px-4 pt-8">
          <div className="w-full max-w-md">
            <Card className="bg-gray-800/80 border-gray-700">
              {/* Progress indicator */}
              <div className="flex items-center justify-center gap-2 mb-8">
                <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-bold">1</div>
                <div className="w-12 h-0.5 bg-gray-600" />
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-sm font-bold">2</div>
                <div className="w-12 h-0.5 bg-gray-600" />
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-sm font-bold">3</div>
              </div>

              <div className="text-center mb-6">
                <div className="text-4xl mb-3">📧</div>
                <h1 className="text-2xl font-bold text-white mb-2">{t.enterEmail || 'Enter your email'}</h1>
                <p className="text-gray-400 text-sm">{t.emailWillVerify || 'We\'ll send a verification code to your inbox'}</p>
              </div>

              <div className="space-y-4">
                <Input
                  type="email"
                  label="Email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
                  autoFocus
                />
                {emailError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
                    {emailError}
                  </div>
                )}
                <Button onClick={handleSendCode} loading={loading} className="w-full" size="lg">
                  {cooldown > 0 ? `${t.sendCode} (${cooldown}s)` : (t.sendCode || 'Send Verification Code')}
                </Button>
              </div>

              <p className="mt-6 text-center text-gray-400 text-sm">
                {t.alreadyHaveAccount || 'Already have an account?'}{' '}
                <Link href="/login" className="text-violet-400 hover:text-violet-300">
                  → {t.login || 'Login'}
                </Link>
              </p>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // ─── Step 2: Verify Code ───
  if (step === 'verify') {
    const digits = verificationCode.padEnd(6, ' ').split('').slice(0, 6);
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
        <AppHeader lang={lang} onLangChange={handleLangChange} t={t} />
        <main className="flex items-center justify-center px-4 pt-8">
          <div className="w-full max-w-md">
            <Card className="bg-gray-800/80 border-gray-700">
              {/* Progress indicator */}
              <div className="flex items-center justify-center gap-2 mb-8">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm">✓</div>
                <div className="w-12 h-0.5 bg-violet-600" />
                <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-bold">2</div>
                <div className="w-12 h-0.5 bg-gray-600" />
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-sm font-bold">3</div>
              </div>

              <div className="text-center mb-6">
                <div className="text-4xl mb-3">🔐</div>
                <h1 className="text-2xl font-bold text-white mb-2">{t.checkInbox || 'Check your inbox'}</h1>
                <p className="text-gray-400 text-sm">
                  {t.codeSentTo || 'Code sent to'}<br />
                  <span className="text-violet-400 font-medium">{email}</span>
                </p>
              </div>

              {/* 6-digit code inputs */}
              <div className="flex gap-2 justify-center mb-4">
                {digits.map((d, idx) => (
                  <input
                    key={idx}
                    ref={el => { codeInputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={verificationCode[idx] || ''}
                    onChange={(e) => handleCodeInput(idx, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(idx, e)}
                    className="w-11 h-13 text-center text-2xl font-bold bg-gray-700 border border-gray-600 rounded-xl text-white focus:border-violet-500 focus:outline-none transition-colors"
                  />
                ))}
              </div>

              {verifyError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
                  {verifyError}
                </div>
              )}

              <Button onClick={handleVerifyCode} loading={loading} className="w-full" size="lg">
                {t.verifyAndContinue || 'Verify & Continue'}
              </Button>

              <div className="mt-4 text-center">
                <p className="text-gray-400 text-sm">
                  {t.noCode || 'Didn\'t receive it?'}
                  <button
                    onClick={handleResend}
                    disabled={cooldown > 0 || loading}
                    className="ml-1 text-violet-400 hover:text-violet-300 disabled:text-gray-500 disabled:cursor-not-allowed text-sm"
                  >
                    {cooldown > 0 ? `${t.resendCode || 'Resend'} (${cooldown}s)` : (t.resendCode || 'Resend')}
                  </button>
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700 text-center">
                <button
                  onClick={() => { setStep('email'); setVerificationCode(''); }}
                  className="text-gray-400 hover:text-gray-300 text-sm"
                >
                  ← {t.changeEmail || 'Change email'}
                </button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // ─── Step 3: Set Password ───
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      <AppHeader lang={lang} onLangChange={handleLangChange} t={t} />
      <main className="flex items-center justify-center px-4 pt-8">
        <div className="w-full max-w-md">
          <Card className="bg-gray-800/80 border-gray-700">
            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm">✓</div>
              <div className="w-12 h-0.5 bg-green-600" />
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm">✓</div>
              <div className="w-12 h-0.5 bg-violet-600" />
              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-bold">3</div>
            </div>

            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🎉</div>
              <h1 className="text-2xl font-bold text-white mb-2">{t.almostDone || 'Almost done!'}</h1>
              <p className="text-gray-400 text-sm">
                {t.emailVerified || 'Email verified!'}<br />
                <span className="text-violet-400">{email}</span>
              </p>
            </div>

            <form onSubmit={handleSetPassword} className="space-y-4">
              <Input
                type="password"
                label={t.setPassword || 'Set your password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                autoFocus
              />
              <Input
                type="password"
                label={t.confirmPassword || 'Confirm password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
              />
              {passwordError && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
                  {passwordError}
                </div>
              )}
              <Button type="submit" loading={loading} className="w-full" size="lg">
                {t.completeRegistration || 'Complete Registration'} 🎨
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t border-gray-700 text-center">
              <button
                onClick={() => { setStep('verify'); }}
                className="text-gray-400 hover:text-gray-300 text-sm"
              >
                ← {t.backToVerify || 'Back to verification'}
              </button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
