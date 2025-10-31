import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Security headers configuration
const securityHeaders = {
  // Prevent clickjacking attacks
  "X-Frame-Options": "DENY",

  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",

  // Enable XSS filter in older browsers
  "X-XSS-Protection": "1; mode=block",

  // Control referrer information
  "Referrer-Policy": "strict-origin-when-cross-origin",

  // DNS prefetching control
  "X-DNS-Prefetch-Control": "on",

  // Prevent IE from opening downloads in site context
  "X-Download-Options": "noopen",

  // Control which features and APIs can be used
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",

  // Force HTTPS
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",

  // Content Security Policy - comprehensive protection
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://images.unsplash.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in https://api.stripe.com",
    "media-src 'self' https://*.supabase.co",
    "object-src 'none'",
    "child-src 'self' https://js.stripe.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "worker-src 'self' blob:",
    "form-action 'self'",
    "base-uri 'self'",
    "manifest-src 'self'",
    "upgrade-insecure-requests"
  ].join("; ")
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: mode === 'development' ? {} : securityHeaders,
  },
  preview: {
    headers: securityHeaders,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
