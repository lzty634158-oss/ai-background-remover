'use client';

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Upload from "@/components/Upload";
import Result from "@/components/Result";
import { translations } from "@/components/LanguageSwitch";
import { Lang, Translation } from "@/types";

const WORKER_URL = 'https://ai-background-remover-api.lzty634158.workers.dev';

// Safe JSON parse — returns null if response is not JSON (e.g. 500 HTML page)
async function safeJson(response: Response): Promise<{data: unknown; error: string|null}> {
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



export default function Home() {
  const [lang, setLang] = useState<Lang>("zh");
  const [t, setT] = useState<Translation>(translations.zh);
  const [isProcessing, setIsProcessing] = useState(false);
  const [originalImage, setOriginalImage] = useState<string>("");
  const [resultImage, setResultImage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [remainingQuota, setRemainingQuota] = useState<number>(0);
  const [guestTrialsRemaining, setGuestTrialsRemaining] = useState<number>(3);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setT(translations[lang]);
    const savedLang = localStorage.getItem('lang') as Lang;
    if (savedLang && translations[savedLang]) {
      setLang(savedLang);
      setT(translations[savedLang]);
    }
    setIsLoggedIn(!!localStorage.getItem('token'));
    fetchQuota();
  }, [lang]);

  const fetchQuota = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${WORKER_URL}/api/images`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const { data, error } = await safeJson(response);
      if (error) { console.error('Failed to fetch quota:', error); return; }
      if (data && typeof data === 'object' && 'isLoggedIn' in data) {
        const d = data as any;
        if (d.isLoggedIn) {
          setIsLoggedIn(true);
          setRemainingQuota(d.remainingQuota ?? 0);
        } else {
          setGuestTrialsRemaining(d.guestTrialsRemaining ?? 0);
        }
      }
    } catch (e) {
      console.error('Failed to fetch quota:', e);
    }
  };

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  const handleUpload = async (file: File) => {
    setIsProcessing(true);
    setError("");
    setResultImage("");

    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${WORKER_URL}/api/images`, {
        method: "POST",
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });

      const { data, error } = await safeJson(response);

      if (!response.ok || error) {
        throw new Error((data as any)?.message || error || t.errorApi);
      }

      // Worker returns imageData as base64 data URL (data:image/png;base64,...)
      const d = data as any;
      setResultImage(d.imageData);
      
      if (d.remainingQuota !== undefined) {
        setRemainingQuota(d.remainingQuota);
      }
      if (d.guestTrialsRemaining !== undefined) {
        setGuestTrialsRemaining(d.guestTrialsRemaining);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorApi);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTryAgain = () => {
    setOriginalImage("");
    setResultImage("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      <Navbar 
        t={t} 
        lang={lang} 
        onLangChange={handleLangChange} 
      />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              {t.title}
            </h1>
            <p className="text-lg text-gray-400">
              {t.subtitle}
            </p>
          </div>

          <Upload t={t} onUpload={handleUpload} isProcessing={isProcessing} />

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-center">
              {error}
            </div>
          )}

          {resultImage && (
            <Result
              t={t}
              originalImage={originalImage}
              resultImage={resultImage}
              onTryAgain={handleTryAgain}
            />
          )}

          {isLoggedIn && remainingQuota > 0 && (
            <div className="mt-6 text-center text-green-400 text-sm">
              ✓ Remaining quota: {remainingQuota}
            </div>
          )}

          {!isLoggedIn && guestTrialsRemaining > 0 && (
            <div className="mt-6 text-center text-violet-400 text-sm">
              🎁 You have {guestTrialsRemaining} free trial(s) left
            </div>
          )}
        </div>
      </main>

      <footer className="py-6 text-center text-gray-500 text-sm">
        <p>© 2026 AI Background Remover · v2.0.0</p>
      </footer>
    </div>
  );
}
