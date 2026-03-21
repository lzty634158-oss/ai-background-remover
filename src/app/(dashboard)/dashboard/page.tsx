'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button } from '@/components/ui';
import LanguageSwitch from '@/components/LanguageSwitch';
import { getUser, getToken, type User } from '@/lib/auth';
import { translations, type Lang, type Translation } from '@/lib/translations';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    getUser(token).then((res) => {
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }
      setLoading(false);
    });
  }, [router]);

  const packages = [
    { name: 'Basic', price: 5, credits: 10, unit: '$0.50/image', popular: false },
    { name: 'Standard', price: 25, credits: 60, unit: '$0.42/image', popular: true },
    { name: 'Premium', price: 100, credits: 300, unit: '$0.33/image', popular: false },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalQuota = (user?.freeQuota || 0) + (user?.paidCredits || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      <LanguageSwitch onChange={handleLangChange} />

      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-md border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-white font-bold">AI BG Remover</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/history">
                <Button variant="ghost" size="sm">{t.history}</Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" size="sm">{t.title}</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Info Card */}
        <Card className="mb-8 bg-gray-800/60 border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{user?.email}</h2>
                  <p className="text-gray-400 text-sm">
                    {t.memberSince}: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-4xl font-bold text-white">{totalQuota}</p>
                <p className="text-gray-400 text-sm mt-1">{t.availableCredits}</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-indigo-400">{user?.totalUsed ?? 0}</p>
                <p className="text-gray-400 text-sm mt-1">{t.imagesUsed}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Quota Breakdown */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card className="bg-gray-800/60 border-gray-700 text-center py-6">
            <p className="text-2xl font-bold text-violet-400">{user?.freeQuota ?? 0}</p>
            <p className="text-gray-400 text-sm mt-1">{t.remainingQuota}</p>
          </Card>
          <Card className="bg-gray-800/60 border-gray-700 text-center py-6">
            <p className="text-2xl font-bold text-green-400">{user?.paidCredits ?? 0}</p>
            <p className="text-gray-400 text-sm mt-1">{t.remainingCredits}</p>
          </Card>
        </div>

        {/* Quick Action */}
        <div className="mb-10">
          <Link href="/" className="inline-block">
            <Button size="lg" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t.uploadButton}
            </Button>
          </Link>
        </div>

        {/* Pricing Packages */}
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">{t.purchaseCredits}</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <Card
                key={pkg.name}
                className={`
                  relative text-center py-6 px-4
                  ${pkg.popular ? 'bg-gradient-to-b from-indigo-900/40 to-gray-800/60 border-indigo-500' : 'bg-gray-800/60 border-gray-700'}
                `}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-500 rounded-full text-xs text-white font-semibold">
                    Most Popular
                  </div>
                )}
                <h4 className="text-lg font-semibold text-white mb-2">{pkg.name}</h4>
                <p className="text-3xl font-bold text-white mb-1">${pkg.price}</p>
                <p className="text-gray-400 text-sm mb-1">{pkg.credits} credits</p>
                <p className="text-gray-500 text-xs mb-4">{pkg.unit}</p>
                <Button variant={pkg.popular ? 'primary' : 'outline'} className="w-full" disabled>
                  Coming Soon
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
