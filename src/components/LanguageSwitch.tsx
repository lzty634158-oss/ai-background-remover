'use client';

import { useState, useEffect, useRef } from 'react';
import { Lang, translations, Translation } from '@/lib/translations';
import { Button } from '@/components/ui';

interface LanguageSwitchProps {
  onChange?: (lang: Lang) => void;
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

export default function LanguageSwitch({ onChange }: LanguageSwitchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<Lang>('zh');

  const current = languages.find(l => l.code === currentLang);

  const handleSelect = (lang: Lang) => {
    setCurrentLang(lang);
    onChange?.(lang);
    setIsOpen(false);
    // Save to localStorage
    localStorage.setItem('lang', lang);
  };

  return (
    <div className="fixed top-16 right-4 z-[200]">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg text-white hover:bg-gray-700 transition-colors"
        >
          <span>{current?.flag}</span>
          <span className="text-sm">{current?.name}</span>
          <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-[200]">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-gray-700 transition-colors ${
                  currentLang === lang.code ? 'bg-gray-700/50 text-violet-400' : 'text-white'
                }`}
              >
                <span>{lang.flag}</span>
                <span className="text-sm">{lang.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { translations };
export type { Translation, Lang };
