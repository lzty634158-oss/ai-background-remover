import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'edge';

const WORKER_URL = 'https://ai-background-remover-api.lzty634158.workers.dev';

function getWorkerUrl() {
  if (process.env.NODE_ENV === 'production') return WORKER_URL;
  return process.env.WORKER_DEV_URL || 'http://localhost:8787';
}

// GET /api/images - check quota
export async function GET(request: NextRequest) {
  const workerUrl = getWorkerUrl();
  const targetUrl = `${workerUrl}/api/images`;

  const headers: Record<string, string> = {};
  const authHeader = request.headers.get('authorization');
  if (authHeader) headers['Authorization'] = authHeader;

  try {
    const response = await fetch(targetUrl, { headers });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to connect to API' },
      { status: 502 }
    );
  }
}

// POST /api/images - process image
export async function POST(request: NextRequest) {
  const workerUrl = getWorkerUrl();
  const targetUrl = `${workerUrl}/api/images`;

  const headers: Record<string, string> = {};
  const authHeader = request.headers.get('authorization');
  if (authHeader) headers['Authorization'] = authHeader;

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: request.body,
      // @ts-ignore - duplex is needed for streaming but we don't use it here
      duplex: 'half',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to connect to API' },
      { status: 502 }
    );
  }
}
