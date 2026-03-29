/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
  REMOVE_BG_API_KEY: string;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  FRONTEND_URL: string;
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
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

// ─── Email Verification helpers ───────────────────────────
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function getResendConfig(env: Env): Promise<{apiKey: string; fromEmail: string} | null> {
  // Try environment variables first (if set as secrets)
  if (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
    return { apiKey: env.RESEND_API_KEY, fromEmail: env.RESEND_FROM_EMAIL };
  }
  // Fallback: read from D1 app_config table
  try {
    const apiKeyRow = await env.DB
      .prepare('SELECT value FROM app_config WHERE key = ?')
      .bind('resend_api_key')
      .first();
    const fromEmailRow = await env.DB
      .prepare('SELECT value FROM app_config WHERE key = ?')
      .bind('resend_from_email')
      .first();
    const enabledRow = await env.DB
      .prepare('SELECT value FROM app_config WHERE key = ?')
      .bind('resend_enabled')
      .first();
    if (apiKeyRow?.value && fromEmailRow?.value && enabledRow?.value === 'true') {
      return { apiKey: apiKeyRow.value, fromEmail: fromEmailRow.value };
    }
  } catch (e) {
    console.error('Failed to read Resend config from D1:', e);
  }
  return null;
}

async function sendVerificationEmail(env: Env, email: string, code: string): Promise<boolean> {
  const config = await getResendConfig(env);
  if (!config) {
    console.error('Resend API not configured (no env vars and no D1 config)');
    return false;
  }

  const { apiKey: resendApiKey, fromEmail: resendFromEmail } = config;
  const frontendUrl = env.FRONTEND_URL || 'https://ai-backgroundremover.space';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; margin: 0; padding: 20px; }
    .container { max-width: 480px; margin: 0 auto; background: #16213e; border-radius: 16px; padding: 40px; }
    .logo { font-size: 28px; font-weight: bold; color: #7c3aed; text-align: center; margin-bottom: 30px; }
    .title { color: #ffffff; font-size: 20px; text-align: center; margin-bottom: 20px; }
    .code { background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; font-size: 36px; font-weight: bold; text-align: center; padding: 20px; border-radius: 12px; letter-spacing: 8px; margin: 30px 0; }
    .tip { color: #94a3b8; font-size: 14px; text-align: center; line-height: 1.6; }
    .footer { color: #64748b; font-size: 12px; text-align: center; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🎨 AI Background Remover</div>
    <div class="title">Your Verification Code</div>
    <div class="code">${code}</div>
    <p class="tip">This code will expire in <strong>10 minutes</strong>.<br>Please enter it on the registration page to verify your email.</p>
    <p class="footer">If you didn't request this, please ignore this email.</p>
  </div>
</body>
</html>
  `;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: email,
        subject: 'Your AI Background Remover Verification Code',
        html: htmlContent,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send email:', error);
      return false;
    }

    return true;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('Email send timeout');
    } else {
      console.error('Email send error:', error.message);
    }
    return false;
  }
}

// ─── Google OAuth helpers ────────────────────────────────
function generateState(): string {
  return crypto.randomUUID();
}

function getGoogleOAuthURL(state: string): string {
  const params = new URLSearchParams({
    client_id: '',
    redirect_uri: '',
    response_type: 'code',
    scope: 'email profile openid',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// ─── Record login history helper ─────────────────────────
async function recordLogin(env: Env, userId: string, provider: string, request: Request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ua = (request.headers.get('User-Agent') || '').slice(0, 500);
  await env.DB
    .prepare(`
      INSERT INTO login_history (id, user_id, ip_address, user_agent, provider)
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(generateId(), userId, ip, ua, provider)
    .run();
  await env.DB
    .prepare('UPDATE users SET last_login_at = datetime("now") WHERE id = ?')
    .bind(userId)
    .run();
}

// ─── Google OAuth endpoints ──────────────────────────────
async function handleGoogleAuth(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const frontendUrl = env.FRONTEND_URL || 'https://ai-background-remover-5h2.pages.dev';

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return jsonResponse({ success: false, message: 'Google OAuth not configured' }, 503);
  }

  const state = generateState();
  const returnTo = url.searchParams.get('return_to') || '/';

  // Store state in a temporary KV or just pass it through (state is verified via timing)
  const stateData = JSON.stringify({ state, returnTo, created: Date.now() });
  const encodedState = btoa(stateData).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${url.origin}/auth/google/callback`,
    response_type: 'code',
    scope: 'email profile openid',
    state: encodedState,
    access_type: 'offline',
    prompt: 'consent',
  });

  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302);
}

async function handleGoogleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const encodedState = url.searchParams.get('state');
  const frontendUrl = env.FRONTEND_URL || 'https://ai-background-remover-5h2.pages.dev';

  if (!code || !encodedState) {
    return Response.redirect(`${frontendUrl}/login?error=missing_params`, 302);
  }

  // Decode and verify state
  let stateData: { state: string; returnTo: string; created: number };
  try {
    const padded = encodedState.replace(/-/g, '+').replace(/_/g, '/');
    stateData = JSON.parse(atob(padded));
    // State expires after 10 minutes
    if (Date.now() - stateData.created > 10 * 60 * 1000) {
      return Response.redirect(`${frontendUrl}/login?error=state_expired`, 302);
    }
  } catch {
    return Response.redirect(`${frontendUrl}/login?error=invalid_state`, 302);
  }

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return Response.redirect(`${frontendUrl}/login?error=oauth_not_configured`, 302);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${new URL(request.url).origin}/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Google token exchange failed:', err);
      return Response.redirect(`${frontendUrl}/login?error=token_exchange_failed`, 302);
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token as string;
    const idToken = tokens.id_token as string;

    // Decode id_token to get user info (no need to verify signature for our use case)
    let googleEmail = '';
    let googleName = '';
    let googleId = '';

    try {
      const payloadBase64 = idToken.split('.')[1];
      const padded = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(padded));
      googleEmail = payload.email || '';
      googleName = payload.name || '';
      googleId = payload.sub || '';
    } catch {
      // Fallback: fetch userinfo endpoint
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await userInfoRes.json();
      googleEmail = userInfo.email || '';
      googleName = userInfo.name || '';
      googleId = userInfo.id || '';
    }

    if (!googleEmail) {
      return Response.redirect(`${frontendUrl}/login?error=no_email`, 302);
    }

    // Find or create user by google_id or email
    let user = await env.DB
      .prepare('SELECT * FROM users WHERE google_id = ?')
      .bind(googleId)
      .first();

    if (!user && googleId) {
      // Try to find by email and link google_id
      const existingByEmail = await env.DB
        .prepare('SELECT * FROM users WHERE email = ?')
        .bind(googleEmail)
        .first();

      if (existingByEmail) {
        // Link Google account to existing email account
        await env.DB
          .prepare('UPDATE users SET google_id = ? WHERE id = ?')
          .bind(googleId, existingByEmail.id)
          .run();
        user = await env.DB
          .prepare('SELECT * FROM users WHERE id = ?')
          .bind(existingByEmail.id)
          .first();
      } else {
        // Create new user
        const userId = generateId();
        await env.DB
          .prepare(`
            INSERT INTO users (id, email, google_id, name, free_quota, paid_credits)
            VALUES (?, ?, ?, ?, 10, 0)
          `)
          .bind(userId, googleEmail, googleId, googleName)
          .run();
        user = await env.DB
          .prepare('SELECT * FROM users WHERE id = ?')
          .bind(userId)
          .first();
      }
    }

    if (!user) {
      return Response.redirect(`${frontendUrl}/login?error=user_creation_failed`, 302);
    }

    // Issue our own token
    const token = createToken(user.id);
    const returnTo = stateData.returnTo || '/';

    // Record login history
    await recordLogin(env, user.id, 'google', request);

    // Redirect to frontend callback with token
    const callbackUrl = new URL(`${frontendUrl}/auth/callback`);
    callbackUrl.searchParams.set('token', token);
    callbackUrl.searchParams.set('return_to', returnTo);
    return Response.redirect(callbackUrl.toString(), 302);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return Response.redirect(`${frontendUrl}/login?error=oauth_error`, 302);
  }
}

// GET: Check remaining quota/trials
async function handleQuotaCheck(request: Request, env: Env): Promise<Response> {
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
    const buffer = new Uint8Array(arrayBuffer);

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
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse(
      { success: false, message: 'Processing failed: ' + message },
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

    // Record login history
    await recordLogin(env, user.id, 'email', request);

    return jsonResponse({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || '',
        avatar_url: user.avatar_url || '',
        bio: user.bio || '',
        phone: user.phone || '',
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

// POST: Register (Step 1 - Send verification code)
async function handleRegister(request: Request, env: Env): Promise<Response> {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return jsonResponse(
        { success: false, message: 'Email and password are required' },
        400
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return jsonResponse(
        { success: false, message: 'Invalid email format' },
        400
      );
    }

    // Check if user already exists in users table
    const existingUser = await env.DB
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first();

    if (existingUser) {
      return jsonResponse(
        { success: false, message: 'Email already registered' },
        409
      );
    }

    // Check if there's a pending registration with this email
    const existingPending = await env.DB
      .prepare('SELECT id FROM pending_users WHERE email = ?')
      .bind(email)
      .first();

    if (existingPending) {
      // Delete old pending registration
      await env.DB
        .prepare('DELETE FROM pending_users WHERE email = ?')
        .bind(email)
        .run();
    }

    // Generate verification code and hash password
    const verificationCode = generateVerificationCode();
    const hashedPassword = await hashPassword(password);
    const pendingUserId = generateId();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store in pending_users table
    await env.DB
      .prepare(`
        INSERT INTO pending_users (id, email, password, verification_code, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      .bind(pendingUserId, email, hashedPassword, verificationCode, expiresAt)
      .run();

    // Send verification email
    const emailSent = await sendVerificationEmail(env, email, verificationCode);

    if (!emailSent) {
      // Clean up if email failed
      await env.DB
        .prepare('DELETE FROM pending_users WHERE id = ?')
        .bind(pendingUserId)
        .run();
      return jsonResponse(
        { success: false, message: 'Failed to send verification email. Please try again.' },
        500
      );
    }

    return jsonResponse({
      success: true,
      message: 'Verification code sent to your email',
      email: email,
      pendingUserId: pendingUserId,
    });
  } catch (error) {
    console.error('Register error:', error);
    return jsonResponse(
      { success: false, message: 'Registration failed' },
      500
    );
  }
}

// POST: Verify email (Step 2 - Create user after verification)
async function handleVerify(request: Request, env: Env): Promise<Response> {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return jsonResponse(
        { success: false, message: 'Email and verification code are required' },
        400
      );
    }

    // Find pending user
    const pendingUser = await env.DB
      .prepare('SELECT * FROM pending_users WHERE email = ?')
      .bind(email)
      .first();

    if (!pendingUser) {
      return jsonResponse(
        { success: false, message: 'No pending registration found. Please register again.' },
        404
      );
    }

    // Check if expired
    if (new Date(pendingUser.expires_at) < new Date()) {
      await env.DB
        .prepare('DELETE FROM pending_users WHERE id = ?')
        .bind(pendingUser.id)
        .run();
      return jsonResponse(
        { success: false, message: 'Verification code expired. Please register again.' },
        400
      );
    }

    // Check if code matches
    if (pendingUser.verification_code !== code) {
      return jsonResponse(
        { success: false, message: 'Invalid verification code' },
        400
      );
    }

    // Create actual user
    const userId = generateId();
    await env.DB
      .prepare(`
        INSERT INTO users (id, email, password, free_quota, paid_credits)
        VALUES (?, ?, ?, 10, 0)
      `)
      .bind(userId, email, pendingUser.password)
      .run();

    // Clean up pending user
    await env.DB
      .prepare('DELETE FROM pending_users WHERE id = ?')
      .bind(pendingUser.id)
      .run();

    // Issue token
    const token = createToken(userId);

    return jsonResponse({
      success: true,
      user: {
        id: userId,
        email,
        name: '',
        avatar_url: '',
        bio: '',
        phone: '',
        freeQuota: 10,
        paidCredits: 0,
        createdAt: new Date().toISOString(),
      },
      token,
    });
  } catch (error) {
    console.error('Verify error:', error);
    return jsonResponse(
      { success: false, message: 'Verification failed' },
      500
    );
  }
}

// POST: Send-only verification code (no registration yet)
async function handleSendCodeOnly(request: Request, env: Env): Promise<Response> {
  try {
    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ success: false, message: 'Invalid email format' }, 400);
    }

    // Check if user already exists
    const existing = await env.DB
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first();

    if (existing) {
      return jsonResponse({ success: false, message: 'Email already registered' }, 409);
    }

    // Check for existing pending verification
    const existingPending = await env.DB
      .prepare('SELECT * FROM email_verifications WHERE email = ?')
      .bind(email)
      .first();

    if (existingPending) {
      // Delete old one
      await env.DB
        .prepare('DELETE FROM email_verifications WHERE email = ?')
        .bind(email)
        .run();
    }

    const code = generateVerificationCode();
    const pendingId = generateId();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await env.DB
      .prepare(`
        INSERT INTO email_verifications (id, email, verification_code, expires_at)
        VALUES (?, ?, ?, ?)
      `)
      .bind(pendingId, email, code, expiresAt)
      .run();

    const sent = await sendVerificationEmail(env, email, code);
    if (!sent) {
      await env.DB.prepare('DELETE FROM email_verifications WHERE id = ?').bind(pendingId).run();
      return jsonResponse({ success: false, message: 'Failed to send email. Check address or try again.' }, 500);
    }

    return jsonResponse({ success: true, message: 'Code sent', email });
  } catch (error) {
    console.error('Send code error:', error);
    return jsonResponse({ success: false, message: 'Failed to send code' }, 500);
  }
}

// POST: Set password after email verification
async function handleSetPassword(request: Request, env: Env): Promise<Response> {
  try {
    const { email, password, verification_code } = await request.json();

    if (!email || !password || !verification_code) {
      return jsonResponse({ success: false, message: 'Email, code and password are required' }, 400);
    }

    if (password.length < 6) {
      return jsonResponse({ success: false, message: 'Password must be at least 6 characters' }, 400);
    }

    // Find pending verification
    const pending = await env.DB
      .prepare('SELECT * FROM email_verifications WHERE email = ?')
      .bind(email)
      .first();

    if (!pending) {
      return jsonResponse({ success: false, message: 'No verification found. Please start over.' }, 400);
    }

    if (new Date(pending.expires_at) < new Date()) {
      await env.DB.prepare('DELETE FROM email_verifications WHERE email = ?').bind(email).run();
      return jsonResponse({ success: false, message: 'Code expired. Please request a new one.' }, 400);
    }

    if (pending.verification_code !== verification_code) {
      return jsonResponse({ success: false, message: 'Incorrect verification code' }, 400);
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    const userId = generateId();

    await env.DB
      .prepare(`
        INSERT INTO users (id, email, password, free_quota, paid_credits)
        VALUES (?, ?, ?, 10, 0)
      `)
      .bind(userId, email, hashedPassword)
      .run();

    // Clean up
    await env.DB.prepare('DELETE FROM email_verifications WHERE email = ?').bind(email).run();

    const token = createToken(userId);

    return jsonResponse({
      success: true,
      token,
      user: {
        id: userId,
        email,
        name: '',
        avatar_url: '',
        bio: '',
        phone: '',
        freeQuota: 10,
        paidCredits: 0,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Set password error:', error);
    return jsonResponse({ success: false, message: 'Failed to set password' }, 500);
  }
}

// POST: Resend verification code
async function handleResendCode(request: Request, env: Env): Promise<Response> {
  try {
    const { email } = await request.json();

    if (!email) {
      return jsonResponse(
        { success: false, message: 'Email is required' },
        400
      );
    }

    // Find pending user
    const pendingUser = await env.DB
      .prepare('SELECT * FROM pending_users WHERE email = ?')
      .bind(email)
      .first();

    if (!pendingUser) {
      return jsonResponse(
        { success: false, message: 'No pending registration found. Please register again.' },
        404
      );
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Update pending user
    await env.DB
      .prepare(`
        UPDATE pending_users 
        SET verification_code = ?, expires_at = ?
        WHERE id = ?
      `)
      .bind(verificationCode, expiresAt, pendingUser.id)
      .run();

    // Send verification email
    const emailSent = await sendVerificationEmail(env, email, verificationCode);

    if (!emailSent) {
      return jsonResponse(
        { success: false, message: 'Failed to send verification email. Please try again.' },
        500
      );
    }

    return jsonResponse({
      success: true,
      message: 'Verification code sent',
      email: email,
    });
  } catch (error) {
    console.error('Resend code error:', error);
    return jsonResponse(
      { success: false, message: 'Failed to resend code' },
      500
    );
  }
}

// Image serving endpoint
async function handleGetImage(request: Request, env: Env): Promise<Response> {
  return jsonResponse({
    success: false,
    message: 'Images are now returned as base64 data URLs via the /api/images endpoint',
  }, 404);
}

// GET: Get user profile + real-time quota
async function handleGetUser(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return jsonResponse({ success: false, message: 'Unauthorized' }, 401);
  }

  const userId = verifyToken(token);
  if (!userId) {
    return jsonResponse({ success: false, message: 'Invalid or expired token' }, 401);
  }

  const user = await env.DB
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first();

  if (!user) {
    return jsonResponse({ success: false, message: 'User not found' }, 404);
  }

  // Get usage count
  const usage = await env.DB
    .prepare('SELECT COUNT(*) as count FROM image_records WHERE user_id = ?')
    .bind(userId)
    .first();

  return jsonResponse({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name || '',
      avatar_url: user.avatar_url || '',
      bio: user.bio || '',
      phone: user.phone || '',
      role: user.role || 'user',
      status: user.status || 'active',
      freeQuota: user.free_quota,
      paidCredits: user.paid_credits,
      totalUsed: usage?.count || 0,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at || '',
      hasPassword: !!user.password,
      provider: user.google_id ? 'google' : 'local',
    },
  });
}

// GET: Get user profile (alias for handleGetUser)
async function handleGetProfile(request: Request, env: Env): Promise<Response> {
  return await handleGetUser(request, env);
}

// POST: Change password
async function handleChangePassword(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return jsonResponse({ success: false, message: 'Unauthorized' }, 401);
  }

  const userId = verifyToken(token);
  if (!userId) {
    return jsonResponse({ success: false, message: 'Invalid or expired token' }, 401);
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return jsonResponse({ success: false, message: 'Current and new password are required' }, 400);
    }

    if (newPassword.length < 6) {
      return jsonResponse({ success: false, message: 'New password must be at least 6 characters' }, 400);
    }

    // Fetch user
    const user = await env.DB
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (!user) {
      return jsonResponse({ success: false, message: 'User not found' }, 404);
    }

    // If user has password (not OAuth-only), verify current password
    if (user.password) {
      const isValid = await verifyPassword(currentPassword, user.password);
      if (!isValid) {
        return jsonResponse({ success: false, message: 'Current password is incorrect' }, 403);
      }
    } else {
      // OAuth-only account: allow setting a password for the first time
      if (currentPassword !== '') {
        return jsonResponse({ success: false, message: 'Current password is incorrect' }, 403);
      }
    }

    const hashedPassword = await hashPassword(newPassword);
    await env.DB
      .prepare('UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(hashedPassword, userId)
      .run();

    return jsonResponse({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return jsonResponse({ success: false, message: 'Failed to change password' }, 500);
  }
}

// PATCH: Update user profile
async function handleUpdateProfile(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return jsonResponse({ success: false, message: 'Unauthorized' }, 401);
  }

  const userId = verifyToken(token);
  if (!userId) {
    return jsonResponse({ success: false, message: 'Invalid or expired token' }, 401);
  }

  try {
    const body = await request.json();
    const { name, avatar_url, bio, phone } = body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name.slice(0, 100));
    }
    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      values.push(avatar_url.slice(0, 500));
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      values.push(bio.slice(0, 500));
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone.slice(0, 20));
    }

    if (updates.length === 0) {
      return jsonResponse({ success: false, message: 'No fields to update' }, 400);
    }

    updates.push('updated_at = datetime("now")');
    values.push(userId);

    await env.DB
      .prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    // Fetch updated user
    const user = await env.DB
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(userId)
      .first();

    return jsonResponse({
      success: true,
      message: 'Profile updated',
      user: {
        id: user.id,
        email: user.email,
        name: user.name || '',
        avatar_url: user.avatar_url || '',
        bio: user.bio || '',
        phone: user.phone || '',
        freeQuota: user.free_quota,
        paidCredits: user.paid_credits,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return jsonResponse({ success: false, message: 'Failed to update profile' }, 500);
  }
}

// GET: Get login history
async function handleGetLoginHistory(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return jsonResponse({ success: false, message: 'Unauthorized' }, 401);
  }

  const userId = verifyToken(token);
  if (!userId) {
    return jsonResponse({ success: false, message: 'Invalid or expired token' }, 401);
  }

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const records = await env.DB
    .prepare(`
      SELECT id, ip_address, user_agent, provider, created_at
      FROM login_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    .bind(userId, limit, offset)
    .all();

  const total = await env.DB
    .prepare('SELECT COUNT(*) as count FROM login_history WHERE user_id = ?')
    .bind(userId)
    .first();

  return jsonResponse({
    success: true,
    records: records.results,
    total: total?.count || 0,
    limit,
    offset,
  });
}

// GET: Get processing history
async function handleGetHistory(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return jsonResponse({ success: false, message: 'Unauthorized' }, 401);
  }

  const userId = verifyToken(token);
  if (!userId) {
    return jsonResponse({ success: false, message: 'Invalid or expired token' }, 401);
  }

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const records = await env.DB
    .prepare(`
      SELECT id, original_name, result_key, credits_used, created_at
      FROM image_records
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    .bind(userId, limit, offset)
    .all();

  const total = await env.DB
    .prepare('SELECT COUNT(*) as count FROM image_records WHERE user_id = ?')
    .bind(userId)
    .first();

  return jsonResponse({
    success: true,
    records: records.results,
    total: total?.count || 0,
    limit,
    offset,
  });
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

      if (path === '/api/user') {
        return request.method === 'GET'
          ? await handleGetUser(request, env)
          : new Response('Method not allowed', { status: 405 });
      }

      if (path === '/api/user/profile') {
        return request.method === 'GET'
          ? await handleGetProfile(request, env)
          : request.method === 'PATCH' || request.method === 'PUT'
          ? await handleUpdateProfile(request, env)
          : new Response('Method not allowed', { status: 405 });
      }

      if (path === '/api/user/change-password') {
        return request.method === 'POST'
          ? await handleChangePassword(request, env)
          : new Response('Method not allowed', { status: 405 });
      }

      if (path === '/api/user/login-history') {
        return request.method === 'GET'
          ? await handleGetLoginHistory(request, env)
          : new Response('Method not allowed', { status: 405 });
      }

      if (path === '/api/history') {
        return request.method === 'GET'
          ? await handleGetHistory(request, env)
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

      if (path === '/api/auth/verify') {
        return request.method === 'POST'
          ? await handleVerify(request, env)
          : new Response('Method not allowed', { status: 405 });
      }

      if (path === '/api/auth/resend-code') {
        return request.method === 'POST'
          ? await handleResendCode(request, env)
          : new Response('Method not allowed', { status: 405 });
      }

      if (path === '/api/auth/send-code') {
        return request.method === 'POST'
          ? await handleSendCodeOnly(request, env)
          : new Response('Method not allowed', { status: 405 });
      }

      if (path === '/api/auth/set-password') {
        return request.method === 'POST'
          ? await handleSetPassword(request, env)
          : new Response('Method not allowed', { status: 405 });
      }
    }

    // OAuth routes
    if (path === '/auth/google') {
      return request.method === 'GET'
        ? await handleGoogleAuth(request, env)
        : new Response('Method not allowed', { status: 405 });
    }

    if (path === '/auth/google/callback') {
      return request.method === 'GET'
        ? await handleGoogleCallback(request, env)
        : new Response('Method not allowed', { status: 405 });
    }

    // Image serving from R2
    if (path.startsWith('/images/')) {
      return await handleGetImage(request, env);
    }

    // Default: serve Next.js app
    return fetch(request);
  },
};
