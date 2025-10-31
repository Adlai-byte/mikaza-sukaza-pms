/**
 * CORS Configuration for Casa & Concierge PMS
 * Handles Cross-Origin Resource Sharing settings for production and development
 */

export interface CORSConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

// Production allowed origins
const PRODUCTION_ORIGINS = [
  'https://casaconcierge.com',
  'https://www.casaconcierge.com',
  'https://app.casaconcierge.com',
  // Add your production domains here
];

// Development allowed origins
const DEVELOPMENT_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:8080',
  'http://[::]:8080',
];

// Get CORS configuration based on environment
export function getCORSConfig(isDevelopment = false): CORSConfig {
  return {
    allowedOrigins: isDevelopment
      ? [...DEVELOPMENT_ORIGINS, ...PRODUCTION_ORIGINS]
      : PRODUCTION_ORIGINS,
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
      'X-CSRF-Token',
    ],
    exposedHeaders: [
      'Content-Length',
      'Content-Range',
      'X-Total-Count',
      'X-Page-Count',
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
  };
}

// Validate origin against allowed list
export function isOriginAllowed(origin: string, isDevelopment = false): boolean {
  const config = getCORSConfig(isDevelopment);

  // Allow requests with no origin (e.g., same-origin, Postman, server-side)
  if (!origin) return true;

  // Check if origin is in allowed list
  return config.allowedOrigins.includes(origin);
}

// Generate CORS headers for response
export function getCORSHeaders(origin: string, isDevelopment = false): Record<string, string> {
  const config = getCORSConfig(isDevelopment);
  const headers: Record<string, string> = {};

  if (isOriginAllowed(origin, isDevelopment)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = config.allowedMethods.join(', ');
    headers['Access-Control-Allow-Headers'] = config.allowedHeaders.join(', ');
    headers['Access-Control-Expose-Headers'] = config.exposedHeaders.join(', ');
    headers['Access-Control-Max-Age'] = config.maxAge.toString();

    if (config.credentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
  }

  return headers;
}

// Middleware for Express/Node.js servers
export function corsMiddleware(isDevelopment = false) {
  return (req: any, res: any, next: any) => {
    const origin = req.headers.origin || req.headers.referer;
    const headers = getCORSHeaders(origin, isDevelopment);

    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    next();
  };
}

// For Supabase Edge Functions
export function handleCORS(request: Request): Response | null {
  const origin = request.headers.get('origin') || '';
  const isDevelopment = origin.includes('localhost') || origin.includes('127.0.0.1');

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const headers = getCORSHeaders(origin, isDevelopment);
    return new Response(null, {
      status: 200,
      headers: new Headers(headers),
    });
  }

  return null;
}

// Add CORS headers to Supabase Edge Function response
export function addCORSHeaders(response: Response, request: Request): Response {
  const origin = request.headers.get('origin') || '';
  const isDevelopment = origin.includes('localhost') || origin.includes('127.0.0.1');
  const corsHeaders = getCORSHeaders(origin, isDevelopment);

  // Clone the response to modify headers
  const newResponse = new Response(response.body, response);

  // Add CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });

  return newResponse;
}