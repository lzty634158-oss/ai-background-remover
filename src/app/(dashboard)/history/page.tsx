'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@/components/ui';
import AppHeader from '@/components/AppHeader';
import { getHistory, getToken, type HistoryRecord } from '@/lib/auth';
import { translations, type Lang, type Translation } from '@/lib/translations';

export default function HistoryPage() {
  const router = useRouter();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [lang, setLang] = useState<Lang>('zh');
  const [t, setT] = useState<Translation>(translations.zh);
  const [userEmail, setUserEmail] = useState<string>('');
  const limit = 12;

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  useEffect(() => {
    const token = getToken();
    const storedUser = localStorage.getItem('user');
    if (!token) {
      router.push('/login');
      return;
    }
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setUserEmail(u.email || '');
      } catch {}
    }

    getHistory(token, limit, offset).then((res) => {
      if (res.success) {
        setRecords(res.records);
        setTotal(res.total);
      }
      setLoading(false);
    });
  }, [offset, router]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const localeMap: Record<Lang, string> = {
      zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR',
      es: 'es-ES', fr: 'fr-FR', de: 'de-DE', en: 'en-US',
    };
    return d.toLocaleDateString(localeMap[lang], {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      <AppHeader
        lang={lang}
        onLangChange={handleLangChange}
        t={t}
        userEmail={userEmail}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">{t.processingHistory}</h1>
          <p className="text-gray-400 text-sm">Total: {total} images</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <Card className="text-center py-16 bg-gray-800/60 border-gray-700">
            <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-400 mb-4">{t.noImagesYet}</p>
            <Link href="/">
              <Button>{t.uploadButton}</Button>
            </Link>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {records.map((record) => (
                <Card key={record.id} className="bg-gray-800/60 border-gray-700 overflow-hidden group">
                  <div className="aspect-square bg-gradient-to-br from-gray-700 to-gray-800 flex flex-col items-center justify-center p-3">
                    <svg className="w-10 h-10 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-400 text-xs text-center truncate w-full px-1">
                      {record.original_name}
                    </p>
                  </div>
                  <div className="p-3">
                    <p className="text-gray-500 text-xs truncate">{record.original_name}</p>
                    <p className="text-gray-600 text-xs mt-1">{formatDate(record.created_at)}</p>
                    <p className="text-indigo-400 text-xs mt-1">-{record.credits_used} {t.remainingCredits}</p>
                  </div>
                </Card>
              ))}
            </div>

            {total > limit && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  ←
                </Button>
                <span className="text-gray-400 text-sm">
                  {offset + 1}–{Math.min(offset + limit, total)} / {total}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + limit >= total}
                  onClick={() => setOffset(offset + limit)}
                >
                  →
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
