import { NextRequest, NextResponse } from 'next/server';
import { safeJson } from '@/lib/api';
export const runtime = 'edge';

function getWorkerUrl() {
  if (process.env.NODE_ENV === 'production') {
    return 'https://ai-background-remover-api.lzty634158.workers.dev';
  }
  return process.env.WORKER_DEV_URL || 'http://localhost:8787';
}

export async function POST(request: NextRequest) {
  const workerUrl = getWorkerUrl();
  const targetUrl = `${workerUrl}/api/auth/verify`;

  try {
    const body = await request.json();
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const { data, error } = await safeJson(response);
    if (error) {
      console.error('Proxy JSON parse error:', error);
      return NextResponse.json({ success: false, message: error }, { status: response.status });
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ success: false, message: 'Failed to connect to API' }, { status: 502 });
  }
}
