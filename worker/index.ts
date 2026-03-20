/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
  REMOVE_BG_API_KEY: string;
  JWT_SECRET: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// Simple password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'ai-background-remover-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Simple JWT-like token (not secure for production, just for demo)
function createToken(userId: string): string {
  const payload = { userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  return btoa(JSON.stringify(payload));
}

function verifyToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) return null;
    return payload.userId;
  } catch {
    return null;
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// GET: Check remaining quota/trials
async function handleQuotaCheck(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  
  // Check if user is logged in
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (token) {
    const userId = verifyToken(token);
    if (userId) {
      const user = await env.DB
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(userId)
        .first();
      
      if (user) {
        return jsonResponse({
          isLoggedIn: true,
          remainingQuota: user.free_quota + user.paid_credits,
          freeQuota: user.free_quota,
          paidCredits: user.paid_credits,
        });
      }
    }
  }

  // Check guest trials from D1
  const guest = await env.DB
    .prepare('SELECT trial_count FROM guest_trials WHERE ip_address = ?')
    .bind(clientIP)
    .first();
  
  const guestTrials = guest?.trial_count || 0;
  const maxGuestTrials = 3;
  
  return jsonResponse({
    isLoggedIn: false,
    guestTrialsRemaining: Math.max(0, maxGuestTrials - guestTrials),
  });
}

// POST: Process image
async function handleImageUpload(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  
  let userId: string | null = null;
  let isLoggedIn = false;

  // Check if user is logged in
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (token) {
    userId = verifyToken(token);
    if (userId) {
      isLoggedIn = true;
    }
  }

  // Check guest trials
  const guest = await env.DB
    .prepare('SELECT trial_count FROM guest_trials WHERE ip_address = ?')
    .bind(clientIP)
    .first();
  
  const guestTrials = guest?.trial_count || 0;
  const maxGuestTrials = 3;
  const isGuest = !isLoggedIn && guestTrials < maxGuestTrials;
  
  // If not logged in and not a valid guest trial, block
  if (!isLoggedIn && !isGuest) {
    return jsonResponse(
      { success: false, message: 'No credits left. Please login or upgrade.' },
      403
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return jsonResponse(
        { success: false, message: 'Please upload an image file' },
        400
      );
    }

    // Validate file type
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      return jsonResponse(
        { success: false, message: 'Only PNG, JPG, WebP formats are supported' },
        400
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return jsonResponse(
        { success: false, message: 'Image size cannot exceed 10MB' },
        400
      );
    }

    // Get API Key
    const apiKey = env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      return jsonResponse(
        { success: false, message: 'Server API Key not configured' },
        500
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
      return jsonResponse(
        { success: false, message: 'API credits insufficient' },
        402
      );
    }

    if (response.status === 403) {
      return jsonResponse(
        { success: false, message: 'Invalid API Key' },
        403
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      return jsonResponse(
        { success: false, message: `API error: ${errorText.slice(0, 200)}` },
        response.status
      );
    }

    // Convert result to base64 for direct response
    const resultBuffer = await response.arrayBuffer();
    const resultBase64 = btoa(String.fromCharCode(...new Uint8Array(resultBuffer)));
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

    // Use quota if user is logged in
    let remainingQuota = 0;
    if (userId) {
      const user = await env.DB
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(userId)
        .first();
      
      if (user) {
        if (user.free_quota > 0) {
          await env.DB
            .prepare('UPDATE users SET free_quota = free_quota - 1 WHERE id = ?')
            .bind(userId)
            .run();
          remainingQuota = user.free_quota - 1 + user.paid_credits;
        } else if (user.paid_credits > 0) {
          await env.DB
            .prepare('UPDATE users SET paid_credits = paid_credits - 1 WHERE id = ?')
            .bind(userId)
            .run();
          remainingQuota = user.paid_credits - 1;
        }

        // Save image record
        await env.DB
          .prepare(`
            INSERT INTO image_records (id, user_id, original_name, result_key, credits_used)
            VALUES (?, ?, ?, ?, 1)
          `)
          .bind(generateId(), userId, file.name, resultBase64.slice(0, 50))
          .run();
      }
    } else if (!isLoggedIn) {
      // Increment guest trials
      if (guestTrials === 0) {
        await env.DB
          .prepare(`
            INSERT INTO guest_trials (id, ip_address, trial_count)
            VALUES (?, ?, 1)
          `)
          .bind(generateId(), clientIP)
          .run();
      } else {
        await env.DB
          .prepare(`
            UPDATE guest_trials SET trial_count = trial_count + 1 WHERE ip_address = ?
          `)
          .bind(clientIP)
          .run();
      }
    }

    // Return result with base64 data URL
    const guestTrialsRemaining = !isLoggedIn ? maxGuestTrials - guestTrials - 1 : undefined;
    
    return jsonResponse({
      success: true,
      imageData: `data:image/png;base64,${resultBase64}`,
      remainingQuota,
      guestTrialsRemaining,
    });
  } catch (error) {
    console.error('Error processing image:', error);
    return jsonResponse(
      { success: false, message: 'Processing failed' },
      500
    );
  }
}

// POST: Login
async function handleLogin(request: Request, env: Env): Promise<Response> {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return jsonResponse(
        { success: false, message: 'Email and password are required' },
        400
      );
    }

    const user = await env.DB
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first();

    if (!user) {
      return jsonResponse(
        { success: false, message: 'Invalid email or password' },
        401
      );
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return jsonResponse(
        { success: false, message: 'Invalid email or password' },
        401
      );
    }

    const token = createToken(user.id);

    return jsonResponse({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        freeQuota: user.free_quota,
        paidCredits: user.paid_credits,
        createdAt: user.created_at,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return jsonResponse(
      { success: false, message: 'Internal server error' },
      500
    );
  }
}

// POST: Register
async function handleRegister(request: Request, env: Env): Promise<Response> {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return jsonResponse(
        { success: false, message: 'Email and password are required' },
        400
      );
    }

    // Check if user exists
    const existing = await env.DB
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first();

    if (existing) {
      return jsonResponse(
        { success: false, message: 'Email already registered' },
        409
      );
    }

    const hashedPassword = await hashPassword(password);
    const userId = generateId();

    await env.DB
      .prepare(`
        INSERT INTO users (id, email, password, free_quota, paid_credits)
        VALUES (?, ?, ?, 10, 0)
      `)
      .bind(userId, email, hashedPassword)
      .run();

    const token = createToken(userId);

    return jsonResponse({
      success: true,
      user: {
        id: userId,
        email,
        freeQuota: 10,
        paidCredits: 0,
      },
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    return jsonResponse(
      { success: false, message: 'Registration failed' },
      500
    );
  }
}

// Image serving endpoint (images are now returned as base64 in the API response)
// This endpoint is kept for compatibility but redirects to the main API
async function handleGetImage(request: Request, env: Env): Promise<Response> {
  return jsonResponse({ 
    success: false, 
    message: 'Images are now returned as base64 data URLs via the /api/images endpoint' 
  }, 404);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API routes
    if (path.startsWith('/api/')) {
      if (path === '/api/images') {
        return request.method === 'GET' 
          ? await handleQuotaCheck(request, env)
          : request.method === 'POST'
          ? await handleImageUpload(request, env)
          : new Response('Method not allowed', { status: 405 });
      }
      
      if (path === '/api/auth/login') {
        return request.method === 'POST' 
          ? await handleLogin(request, env)
          : new Response('Method not allowed', { status: 405 });
      }
      
      if (path === '/api/auth/register') {
        return request.method === 'POST' 
          ? await handleRegister(request, env)
          : new Response('Method not allowed', { status: 405 });
      }
    }

    // Image serving from R2
    if (path.startsWith('/images/')) {
      return await handleGetImage(request, env);
    }

    // Default: serve Next.js app
    return fetch(request);
  },
};
