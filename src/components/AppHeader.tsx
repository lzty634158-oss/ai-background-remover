'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Lang } from '@/lib/translations';

interface AppHeaderProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  t: {
    login: string;
    register: string;
    logout: string;
    dashboard: string;
    history: string;
    title: string;
  };
  userEmail?: string;
  onLogout?: () => void;
}

const languages: { code: Lang; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

export default function AppHeader({ lang, onLangChange, t, userEmail, onLogout }: AppHeaderProps) {
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const currentLang = languages.find(l => l.code === lang) || languages[0];

  return (
    <header className="bg-gray-800/50 backdrop-blur-md border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg">AI BG Remover</span>
          </Link>

          {/* Right: Language + Nav + User */}
          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 transition-colors"
              >
                <span className="text-lg">{currentLang.flag}</span>
                <svg className={`w-3 h-3 text-gray-400 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isLangOpen && (
                <div className="absolute right-0 mt-1 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => { onLangChange(l.code); setIsLangOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-700 transition-colors ${lang === l.code ? 'text-violet-400' : 'text-white'}`}
                    >
                      <span>{l.flag}</span>
                      <span className="text-sm">{l.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Nav Links */}
            <Link href="/" className="px-3 py-1.5 text-gray-300 hover:text-white rounded-lg hover:bg-gray-700 transition-colors text-sm">
              {t.title}
            </Link>
            {userEmail && (
              <>
                <Link href="/dashboard" className="px-3 py-1.5 text-gray-300 hover:text-white rounded-lg hover:bg-gray-700 transition-colors text-sm">
                  {t.dashboard}
                </Link>
                <Link href="/history" className="px-3 py-1.5 text-gray-300 hover:text-white rounded-lg hover:bg-gray-700 transition-colors text-sm">
                  {t.history}
                </Link>
              </>
            )}

            {/* User Menu */}
            {userEmail ? (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="w-7 h-7 bg-violet-500/20 rounded-full flex items-center justify-center">
                    <span className="text-violet-400 text-xs font-medium">{userEmail.charAt(0).toUpperCase()}</span>
                  </div>
                  <svg className={`w-3 h-3 text-gray-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 mt-1 w-36 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
                    <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:bg-gray-700 transition-colors text-sm">
                      {t.dashboard}
                    </Link>
                    <button onClick={() => { onLogout?.(); setIsMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-gray-700 transition-colors text-sm">
                      {t.logout}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link href="/login" className="px-3 py-1.5 text-gray-300 hover:text-white rounded-lg hover:bg-gray-700 transition-colors text-sm">
                  {t.login}
                </Link>
                <Link href="/register" className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors text-sm">
                  {t.register}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
