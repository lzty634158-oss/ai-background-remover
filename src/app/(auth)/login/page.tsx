'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card } from '@/components/ui';
import AppHeader from '@/components/AppHeader';
import { translations, type Lang, type Translation } from '@/lib/translations';

const WORKER_URL = 'https://ai-background-remover-api.lzty634158.workers.dev';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<Lang>('zh');
  const [t, setT] = useState<Translation>(translations.zh);

  useEffect(() => {
    const savedLang = (localStorage.getItem('lang') as Lang) || 'zh';
    setLang(savedLang);
    setT(translations[savedLang]);

    // Handle error from Google OAuth callback
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        missing_params: 'Google login failed: missing parameters',
        state_expired: 'Google login failed: session expired, please try again',
        invalid_state: 'Google login failed: invalid state',
        oauth_not_configured: 'Google login is not configured on the server',
        token_exchange_failed: 'Google login failed: token exchange error',
        no_email: 'Google login failed: could not get email address',
        user_creation_failed: 'Google login failed: could not create user',
        oauth_error: 'Google login failed: unknown error',
      };
      setError(errorMessages[errorParam] || `Login failed: ${errorParam}`);
      // Clean URL
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang);
    setT(translations[newLang]);
    localStorage.setItem('lang', newLang);
  };

  const handleGoogleLogin = () => {
    const currentPath = window.location.pathname;
    window.location.href = `${WORKER_URL}/auth/google?return_to=${encodeURIComponent(currentPath)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${WORKER_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      <AppHeader lang={lang} onLangChange={handleLangChange} t={t} />

      <main className="flex items-center justify-center px-4 pt-8">
        <div className="w-full max-w-md">
          <Card className="bg-gray-800/80 border-gray-700">
            <h1 className="text-2xl font-bold text-white mb-6 text-center">{t.login}</h1>

            {/* Google Login Button */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-800 font-medium rounded-lg transition-colors mb-6"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {lang === 'zh' ? '使用 Google 登录' : 'Continue with Google'}
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">
                  {lang === 'zh' ? '或使用邮箱登录' : 'or sign in with email'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" loading={loading}>
                {t.login}
              </Button>
            </form>

            <p className="mt-6 text-center text-gray-400">
              {t.register}?{' '}
              <Link href="/register" className="text-violet-400 hover:text-violet-300">
                → {t.register}
              </Link>
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
