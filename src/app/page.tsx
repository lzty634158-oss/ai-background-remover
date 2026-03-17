'use client';

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Upload from "@/components/Upload";
import Result from "@/components/Result";
import { translations } from "@/components/LanguageSwitch";
import { Lang, Translation } from "@/types";

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
      const response = await fetch("/api/images", {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await response.json();
      if (data.isLoggedIn) {
        setIsLoggedIn(true);
        setRemainingQuota(data.remainingQuota);
      } else {
        setGuestTrialsRemaining(data.guestTrialsRemaining || 0);
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
      const response = await fetch("/api/images", {
        method: "POST",
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || t.errorApi);
      }

      const resultResponse = await fetch(data.imageUrl);
      const blob = await resultResponse.blob();
      const resultUrl = URL.createObjectURL(blob);
      setResultImage(resultUrl);
      
      if (data.remainingQuota !== undefined) {
        setRemainingQuota(data.remainingQuota);
      }
      if (data.guestTrialsRemaining !== undefined) {
        setGuestTrialsRemaining(data.guestTrialsRemaining);
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
        <p>© 2026 AI Background Remover. All rights reserved.</p>
      </footer>
    </div>
  );
}
