/**
 * Shared CORS configuration for Supabase Edge Functions
 * This provides secure CORS handling for production deployments
 */

// Production domains (update these with your actual domains)
const PRODUCTION_ORIGINS = [
  'https://casaconcierge.com',
  'https://www.casaconcierge.com',
  'https://app.casaconcierge.com',
  'https://casaconcierge.vercel.app', // Vercel preview URL
];

// Development origins
const DEVELOPMENT_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:8080',
  'http://[::]:8080',
];

/**
 * Get CORS headers based on the request origin
 * @param req - The incoming request
 * @param allowedMethods - HTTP methods to allow (default: POST, OPTIONS)
 * @returns CORS headers object
 */
export function getCorsHeaders(
  req: Request,
  allowedMethods: string[] = ['POST', 'OPTIONS']
): Record<string, string> {
  const origin = req.headers.get('origin') || '';

  // Determine if we're in development based on the origin
  const isDevelopment = DEVELOPMENT_ORIGINS.some(devOrigin => origin.startsWith(devOrigin));

  // Check if origin is allowed
  const allowedOrigins = isDevelopment
    ? [...DEVELOPMENT_ORIGINS, ...PRODUCTION_ORIGINS]
    : PRODUCTION_ORIGINS;

  const isAllowed = allowedOrigins.includes(origin) || !origin; // Allow no origin (server-to-server)

  // If origin is not allowed, return minimal headers
  if (!isAllowed && origin) {
    console.warn(`CORS: Blocked request from unauthorized origin: ${origin}`);
    return {
      'Access-Control-Allow-Methods': 'OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
  }

  // Return appropriate CORS headers
  return {
    'Access-Control-Allow-Origin': origin || '*', // Use specific origin or * for no-origin requests
    'Access-Control-Allow-Methods': allowedMethods.join(', '),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Handle CORS preflight requests
 * @param req - The incoming request
 * @returns Response for OPTIONS request or null
 */
export function handleCors(req: Request): Response | null {
  // Only handle OPTIONS requests
  if (req.method !== 'OPTIONS') {
    return null;
  }

  const headers = getCorsHeaders(req);

  return new Response(null, {
    status: 200,
    headers,
  });
}

/**
 * Add CORS headers to a response
 * @param res - The response to add headers to
 * @param req - The original request
 * @returns New response with CORS headers
 */
export function addCorsHeaders(res: Response, req: Request): Response {
  const corsHeaders = getCorsHeaders(req);

  // Clone the response and add headers
  const newHeaders = new Headers(res.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: newHeaders,
  });
}

/**
 * Wrap a handler function with CORS support
 * @param handler - The main handler function
 * @param allowedMethods - HTTP methods to allow
 * @returns Wrapped handler with CORS support
 */
export function withCors(
  handler: (req: Request) => Promise<Response>,
  allowedMethods: string[] = ['POST', 'OPTIONS']
) {
  return async (req: Request): Promise<Response> => {
    // Handle preflight
    const corsResponse = handleCors(req);
    if (corsResponse) {
      return corsResponse;
    }

    // Process the request
    const response = await handler(req);

    // Add CORS headers to response
    return addCorsHeaders(response, req);
  };
}