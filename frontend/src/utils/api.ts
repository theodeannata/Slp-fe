import { supabase } from "@/lib/supabaseClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/**
 * Helper function to send authenticated requests to the FastAPI backend.
 * @param {string} endpoint - The API endpoint path (e.g., '/api/v1/customers')
 * @param {RequestInit} options - Fetch options (method, body, custom headers)
 */
export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
  // 1. Fetch current active Supabase session
  let token = null;
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token;
  }

  // 2. Build headers, appending authorization Bearer token if it exists
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { "Authorization": `Bearer ${token}` }),
    ...options.headers,
  };

  // 3. Send HTTP request
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 4. Handle HTTP error status codes
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || "API request failed";

    // Log helpful debug messages for authorization/role errors
    if (response.status === 403) {
      console.error("[API Error] Access Denied: Insufficient permissions (RLS policy check failed).");
    }

    throw new Error(errorMessage);
  }

  // Handle standard 204 No Content response
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * Helper to fetch the logged-in user's role from Supabase metadata.
 */
export async function getUserRole(): Promise<"master" | "admin" | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.user_metadata?.role; // 'master' or 'admin'
  return role as "master" | "admin" | null;
}
