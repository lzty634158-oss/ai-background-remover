// API configuration for Cloudflare Workers
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Helper function to make API calls
export async function apiFetch(endpoint: string, options?: RequestInit) {
  const url = API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint;
  return fetch(url, options);
}
