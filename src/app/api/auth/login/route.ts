import { NextRequest, NextResponse } from 'next/server';

function getWorkerUrl() {
  if (process.env.NODE_ENV === 'production') return '';
  return process.env.WORKER_DEV_URL || 'http://localhost:8787';
}

export async function POST(request: NextRequest) {
  const workerUrl = getWorkerUrl();
  const targetUrl = workerUrl ? `${workerUrl}/api/auth/login` : '/api/auth/login';

  try {
    const body = await request.json();
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ success: false, message: 'Failed to connect to API' }, { status: 502 });
  }
}
