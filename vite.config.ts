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
  // Note: 'unsafe-inline' is required for Vite's style injection; consider nonces for stricter CSP in future
  "Content-Security-Policy": [
    "default-src 'self'",
    // Removed 'unsafe-eval' - only 'unsafe-inline' kept for Vite compatibility
    "script-src 'self' 'unsafe-inline' https://*.supabase.co https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://images.unsplash.com https://*.tile.openstreetmap.org https://unpkg.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in https://api.stripe.com https://nominatim.openstreetmap.org https://*.tile.openstreetmap.org",
    "media-src 'self' https://*.supabase.co",
    "object-src 'none'",
    "child-src 'self' https://js.stripe.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "frame-ancestors 'self'", // Prevent embedding in iframes (clickjacking protection)
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
  build: {
    // Increase chunk size warning limit (default is 500kb)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Manual chunks for better code splitting
        manualChunks: {
          // Core React ecosystem
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // UI framework
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-switch',
            '@radix-ui/react-label',
            '@radix-ui/react-slot',
          ],

          // Data management
          'vendor-data': [
            '@tanstack/react-query',
            '@supabase/supabase-js',
            'zod',
            '@hookform/resolvers',
            'react-hook-form',
          ],

          // Charts and visualization
          'vendor-charts': ['recharts'],

          // PDF and Excel
          'vendor-documents': ['jspdf', 'jspdf-autotable', 'xlsx'],

          // Date utilities
          'vendor-dates': ['date-fns'],

          // i18n
          'vendor-i18n': ['i18next', 'react-i18next'],

          // Maps
          'vendor-maps': ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
}));
