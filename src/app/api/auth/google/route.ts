import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get('return_to') || '/';

  const workerBase = 'https://ai-background-remover-api.lzty634158.workers.dev';
  const redirectUrl = `${workerBase}/auth/google?return_to=${encodeURIComponent(returnTo)}`;

  return NextResponse.redirect(redirectUrl);
}
