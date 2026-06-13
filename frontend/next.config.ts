import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : "*.supabase.co";

// ---------------------------------------------------------------------------
// Content Security Policy
//
// Two directives differ between environments:
//
//  script-src
//    DEV:  includes 'unsafe-eval' — React needs eval() for dev-mode features
//          (error overlays, source map reconstruction, Fast Refresh)
//    PROD: 'unsafe-eval' removed — React never uses eval() in production
//
//  connect-src
//    DEV:  allows http://127.0.0.1:8000 and http://localhost:8000
//          so the frontend can reach the local FastAPI backend
//    PROD: allows https://*.onrender.com (Render-hosted backend)
//          local addresses are blocked
//
// All other directives are identical in both environments.
// ---------------------------------------------------------------------------
const csp = [
  "default-src 'self'",
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" // DEV only: React needs eval()
    : "script-src 'self' 'unsafe-inline'",              // PROD: no eval()
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  isDev
    ? `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} http://127.0.0.1:8000 http://localhost:8000` // DEV: local backend
    : `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://*.onrender.com`,                    // PROD: Render backend
  "font-src 'self' data:",
  "frame-src 'none'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
