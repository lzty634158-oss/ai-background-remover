'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card } from '@/components/ui';
import AppHeader from '@/components/AppHeader';
import { translations, type Lang, type Translation } from '@/lib/translations';

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
  }, []);

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang);
    setT(translations[newLang]);
    localStorage.setItem('lang', newLang);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('https://ai-background-remover-api.lzty634158.workers.dev/api/auth/login', {
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
