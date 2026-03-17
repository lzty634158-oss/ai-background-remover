import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { verifyToken } from '@/lib/crypto';
import { getUserById, useQuota } from '@/lib/auth';
import { db, generateId, getGuestTrials, incrementGuestTrials } from '@/lib/db';

// GET: Check remaining quota/trials
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  // Check if user is logged in
  if (token) {
    const userId = verifyToken(token);
    if (userId) {
      const user = getUserById(userId);
      if (user) {
        return NextResponse.json({
          isLoggedIn: true,
          remainingQuota: user.free_quota + user.paid_credits,
          freeQuota: user.free_quota,
          paidCredits: user.paid_credits,
        });
      }
    }
  }

  // Check guest trials
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip') 
    || 'unknown';
  
  const guestTrials = getGuestTrials(clientIP);
  const maxGuestTrials = 3;
  
  return NextResponse.json({
    isLoggedIn: false,
    guestTrialsRemaining: Math.max(0, maxGuestTrials - guestTrials),
  });
}

// POST: Process image
export async function POST(request: NextRequest) {
  try {
    // Get token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    let userId: string | null = null;
    let isLoggedIn = false;
    let remainingQuota = 0;

    // Check if user is logged in
    if (token) {
      userId = verifyToken(token);
      if (userId) {
        isLoggedIn = true;
        const user = getUserById(userId);
        if (user) {
          remainingQuota = user.free_quota + user.paid_credits;
        }
      }
    }

    // Get client IP for guest tracking
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || request.headers.get('x-real-ip') 
      || 'unknown';
    
    // Check guest trials by IP
    const guestTrials = isLoggedIn ? 0 : getGuestTrials(clientIP);
    const maxGuestTrials = 3;
    const isGuest = !isLoggedIn && guestTrials < maxGuestTrials;
    
    // If not logged in and not a valid guest trial, block
    if (!isLoggedIn && !isGuest) {
      return NextResponse.json(
        { success: false, message: 'No credits left. Please login or upgrade.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Please upload an image file' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Only PNG, JPG, WebP formats are supported' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: 'Image size cannot exceed 10MB' },
        { status: 400 }
      );
    }

    // Get API Key
    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: 'Server API Key not configured' },
        { status: 500 }
      );
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Call Remove.bg API
    const formDataForApi = new FormData();
    formDataForApi.append('image_file', new Blob([buffer]), file.name);
    formDataForApi.append('size', 'auto');
    formDataForApi.append('format', 'png');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: formDataForApi,
    });

    if (response.status === 402) {
      return NextResponse.json(
        { success: false, message: 'API credits insufficient, please contact admin' },
        { status: 402 }
      );
    }

    if (response.status === 403) {
      return NextResponse.json(
        { success: false, message: 'Invalid API Key' },
        { status: 403 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { success: false, message: `API error: ${errorText.slice(0, 200)}` },
        { status: response.status }
      );
    }

    // Save result image
    const resultsDir = join(process.cwd(), 'public', 'results');
    if (!existsSync(resultsDir)) {
      await mkdir(resultsDir, { recursive: true });
    }

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const filepath = join(resultsDir, filename);
    await writeFile(filepath, Buffer.from(await response.arrayBuffer()));

    // Use quota if user is logged in
    if (userId) {
      const result = useQuota(userId);
      if (!result.success) {
        return NextResponse.json(
          { success: false, message: 'No credits left' },
          { status: 403 }
        );
      }

      // Save image record
      const recordId = generateId();
      const stmt = db.prepare(`
        INSERT INTO image_records (id, user_id, original_name, result_url, credits_used)
        VALUES (?, ?, ?, ?, 1)
      `);
      stmt.run(recordId, userId, file.name, `/results/${filename}`);

      remainingQuota = result.remaining;
    } else if (!isLoggedIn) {
      // Increment guest trials by IP
      incrementGuestTrials(clientIP);
    }

    // Return result
    const guestTrialsRemaining = !isLoggedIn ? maxGuestTrials - guestTrials - 1 : undefined;
    
    return NextResponse.json({
      success: true,
      imageUrl: `/results/${filename}`,
      remainingQuota,
      guestTrialsRemaining,
    });
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { success: false, message: 'Processing failed, please try again later' },
      { status: 500 }
    );
  }
}
