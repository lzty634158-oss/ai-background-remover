'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const returnTo = params.get('return_to') || '/';
    const error = params.get('error');

    if (error) {
      console.error('Auth error:', error);
      router.push(`/login?error=${error}`);
      return;
    }

    if (token) {
      localStorage.setItem('token', token);
      // Fetch user info and store
      fetch('https://ai-background-remover-api.lzty634158.workers.dev/api/user', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        })
        .catch(console.error)
        .finally(() => {
          router.push(returnTo);
        });
    } else {
      router.push('/login?error=no_token');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400">Signing you in...</p>
      </div>
    </div>
  );
}
