import { NextRequest, NextResponse } from 'next/server';

// Determine Worker URL based on environment
function getWorkerUrl() {
  // In production on Cloudflare Pages: use the Pages Function's own Worker
  // In local dev: use wrangler dev server
  if (process.env.NODE_ENV === 'production') {
    // Cloudflare Pages Functions can call themselves via relative URL
    return '';
  }
  return process.env.WORKER_DEV_URL || 'http://localhost:8787';
}

// GET /api/images - check quota
export async function GET(request: NextRequest) {
  const workerUrl = getWorkerUrl();
  const targetUrl = workerUrl
    ? `${workerUrl}/api/images`
    : '/api/images'; // Falls back to same origin in CF Pages

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
  const targetUrl = workerUrl
    ? `${workerUrl}/api/images`
    : '/api/images';

  const headers: Record<string, string> = {};
  const authHeader = request.headers.get('authorization');
  if (authHeader) headers['Authorization'] = authHeader;

  try {
    // Forward the entire request (including FormData body)
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
