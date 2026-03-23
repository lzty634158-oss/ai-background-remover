'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const WORKER_URL = 'https://ai-background-remover-api.lzty634158.workers.dev';

function GoogleAuthInner() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('return_to') || '/';

  useEffect(() => {
    window.location.href = `${WORKER_URL}/auth/google?return_to=${encodeURIComponent(returnTo)}`;
  }, [returnTo]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400">Redirecting to Google...</p>
      </div>
    </div>
  );
}

export default function GoogleAuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">Redirecting...</p>
        </div>
      </div>
    }>
      <GoogleAuthInner />
    </Suspense>
  );
}
