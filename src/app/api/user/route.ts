import { NextRequest, NextResponse } from 'next/server';
import { safeJson } from '@/lib/api';
export const runtime = 'edge';

const WORKER_URL = 'https://ai-background-remover-api.lzty634158.workers.dev';

function getWorkerUrl() {
  if (process.env.NODE_ENV === 'production') return WORKER_URL;
  return process.env.WORKER_DEV_URL || 'http://localhost:8787';
}

export async function GET(request: NextRequest) {
  const workerUrl = getWorkerUrl();
  const targetUrl = `${workerUrl}/api/user`;

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch(targetUrl, { headers: { Authorization: authHeader } });
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

export async function POST(request: NextRequest) {
  const workerUrl = getWorkerUrl();
  const targetUrl = `${workerUrl}/api/user`;

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
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
