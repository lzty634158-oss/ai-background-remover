'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Badge } from '@/components/ui';

interface User {
  id: string;
  email: string;
  freeQuota: number;
  paidCredits: number;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (!token || !storedUser) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(storedUser));
    setLoading(false);
  }, [router]);

  const packages = [
    { name: 'Basic', price: 5, credits: 10, unit: '$0.50/image' },
    { name: 'Standard', price: 25, credits: 60, unit: '$0.42/image' },
    { name: 'Premium', price: 100, credits: 300, unit: '$0.33/image' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
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
            <Link href="/">
              <Button variant="ghost" size="sm">Home</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Info */}
        <Card className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">{user?.email}</h2>
              <p className="text-gray-400 text-sm">
                Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-violet-400">{user?.freeQuota}</p>
                <p className="text-gray-400 text-sm">Free Quota</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">{user?.paidCredits}</p>
                <p className="text-gray-400 text-sm">Paid Credits</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Action */}
        <div className="mb-8">
          <Link href="/">
            <Button className="w-full sm:w-auto">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Remove Background
            </Button>
          </Link>
        </div>

        {/* Pricing Packages */}
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">Purchase Credits</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <Card key={pkg.name} className="text-center">
                <h4 className="text-lg font-semibold text-white mb-2">{pkg.name}</h4>
                <p className="text-3xl font-bold text-violet-400 mb-1">${pkg.price}</p>
                <p className="text-gray-400 text-sm mb-4">{pkg.credits} credits</p>
                <Badge variant="default" className="mb-4">{pkg.unit}</Badge>
                <Button variant="outline" className="w-full" disabled>
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
