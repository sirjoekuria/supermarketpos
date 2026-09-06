import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// A simple in-memory store for rate limiting. 
// Note: In a serverless/Edge environment with multiple isolates, this will clear occasionally, 
// which is acceptable for lightweight rate limiting without adding Redis dependencies.
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

// Limit: 60 requests per minute per IP
const LIMIT = 60;
const WINDOW_MS = 60 * 1000;

export function proxy(request: NextRequest) {
  // Only rate limit API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown-ip';

    const now = Date.now();
    const windowStart = now - WINDOW_MS;

    let requestData = rateLimitMap.get(ip);

    if (!requestData || requestData.lastReset < windowStart) {
      // Reset or initialize
      requestData = { count: 1, lastReset: now };
    } else {
      requestData.count++;
    }

    rateLimitMap.set(ip, requestData);

    if (requestData.count > LIMIT) {
      return new NextResponse(
        JSON.stringify({ error: 'Too Many Requests', message: 'Rate limit exceeded.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
