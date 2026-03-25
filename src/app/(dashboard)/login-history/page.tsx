'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import { Card } from '@/components/ui';
import { getToken, getLoginHistory, type LoginHistoryRecord } from '@/lib/auth';
import { translations, type Lang, type Translation } from '@/lib/translations';

export default function LoginHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<LoginHistoryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [lang, setLang] = useState<Lang>('zh');
  const [t, setT] = useState<Translation>(translations.zh);
  const limit = 20;

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

  const fetchHistory = (pageNum: number) => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    getLoginHistory(token, limit, pageNum * limit).then((res) => {
      if (res.success) {
        setRecords(res.records);
        setTotal(res.total);
        setPage(pageNum);
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }
    fetchHistory(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const totalPages = Math.ceil(total / limit);

  const getProviderBadge = (provider: string) => {
    if (provider === 'google') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-xs">
          <svg className="w-3 h-3" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded text-xs">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Email
      </span>
    );
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return { date: date.toLocaleDateString(), time: date.toLocaleTimeString() };
  };

  const getDeviceIcon = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    );
  };

  const getBrowserName = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('edg')) return 'Edge';
    if (ua.includes('mobile')) return 'Mobile Browser';
    return 'Unknown Browser';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      <AppHeader
        lang={lang}
        onLangChange={handleLangChange}
        t={t}
        userEmail={undefined}
        onLogout={handleLogout}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Login History</h1>
            <p className="text-gray-400 mt-1">Track your account access log · {total} records</p>
          </div>
          <button
            onClick={() => router.push('/profile')}
            className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 rounded-lg text-gray-300 text-sm transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Profile
          </button>
        </div>

        {/* History List */}
        <Card className="bg-gray-800/60 border-gray-700 overflow-hidden">
          {records.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-400">No login history found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table Header */}
              <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-900/50 border-b border-gray-700 text-xs font-medium text-gray-400 uppercase tracking-wider">
                <div className="col-span-1">Type</div>
                <div className="col-span-3">Browser / Device</div>
                <div className="col-span-3">IP Address</div>
                <div className="col-span-3">Date & Time</div>
                <div className="col-span-2">Relative Time</div>
              </div>

              {/* Records */}
              <div className="divide-y divide-gray-700/50">
                {records.map((record) => {
                  const { date, time } = formatTime(record.created_at);
                  const relativeTime = getRelativeTime(new Date(record.created_at));

                  return (
                    <div key={record.id} className="px-6 py-4 hover:bg-gray-700/20 transition-colors">
                      {/* Mobile layout */}
                      <div className="sm:hidden space-y-2">
                        <div className="flex items-center justify-between">
                          {getProviderBadge(record.provider)}
                          <span className="text-xs text-gray-500">{relativeTime}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {getDeviceIcon(record.user_agent)}
                          <span className="text-gray-300">{getBrowserName(record.user_agent)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-gray-400 font-mono text-xs">{record.ip_address}</span>
                        </div>
                        <div className="text-xs text-gray-500">{date} {time}</div>
                      </div>

                      {/* Desktop layout */}
                      <div className="hidden sm:grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-1">{getProviderBadge(record.provider)}</div>
                        <div className="col-span-3 flex items-center gap-2">
                          {getDeviceIcon(record.user_agent)}
                          <div className="min-w-0">
                            <p className="text-white text-sm truncate">{getBrowserName(record.user_agent)}</p>
                            <p className="text-gray-500 text-xs truncate" title={record.user_agent}>
                              {record.user_agent.split(' ')[0]}
                            </p>
                          </div>
                        </div>
                        <div className="col-span-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-gray-300 font-mono text-sm">{record.ip_address}</span>
                        </div>
                        <div className="col-span-3">
                          <p className="text-gray-300 text-sm">{date}</p>
                          <p className="text-gray-500 text-xs">{time}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-400 text-sm">{relativeTime}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
                  <p className="text-gray-400 text-sm">
                    Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchHistory(page - 1)}
                      disabled={page === 0}
                      className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-600 rounded-lg text-gray-300 text-sm transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-gray-400 text-sm px-2">Page {page + 1} / {totalPages}</span>
                    <button
                      onClick={() => fetchHistory(page + 1)}
                      disabled={page >= totalPages - 1}
                      className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-600 rounded-lg text-gray-300 text-sm transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </main>
    </div>
  );
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}
