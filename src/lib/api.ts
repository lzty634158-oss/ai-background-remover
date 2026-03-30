// API configuration for Cloudflare Workers
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Helper function to make API calls
export async function apiFetch(endpoint: string, options?: RequestInit) {
  const url = API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint;
  return fetch(url, options);
}

// Safe JSON parse — returns null if response is not JSON (e.g. 500 HTML page)
// Prevents "Unexpected token 'I', "Internal S"... is not valid JSON" errors
export async function safeJson(response: Response): Promise<{ data: unknown; error: string | null }> {
  const ct = response.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await response.text();
    return { data: null, error: `Server error (${response.status}): ${text.slice(0, 200)}` };
  }
  try {
    return { data: await response.json(), error: null };
  } catch {
    return { data: null, error: `Failed to parse response (status ${response.status})` };
  }
}
