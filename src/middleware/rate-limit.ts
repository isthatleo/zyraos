// Rate limit middleware
import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();

  constructor(private config: RateLimitConfig) {}

  isRateLimited(identifier: string): { limited: boolean; resetTime?: number; remaining?: number } {
    const now = Date.now();
    const record = this.requests.get(identifier);

    if (!record || now > record.resetTime) {
      // Reset or new record
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.config.windowMs,
      });
      return { limited: false, remaining: this.config.maxRequests - 1 };
    }

    if (record.count >= this.config.maxRequests) {
      return { limited: true, resetTime: record.resetTime, remaining: 0 };
    }

    record.count++;
    return { limited: false, remaining: this.config.maxRequests - record.count };
  }

  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Global rate limiter instances
const apiLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
});

const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 auth attempts per 15 minutes
});

export function rateLimitMiddleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown';

  const pathname = request.nextUrl.pathname;

  // Choose appropriate limiter based on route
  let limiter: RateLimiter;
  let limitType: string;

  if (pathname.startsWith('/api/auth') || pathname.includes('/login') || pathname.includes('/signup')) {
    limiter = authLimiter;
    limitType = 'auth';
  } else if (pathname.startsWith('/api/')) {
    limiter = apiLimiter;
    limitType = 'api';
  } else {
    // No rate limiting for regular pages
    return NextResponse.next();
  }

  const result = limiter.isRateLimited(`${ip}:${limitType}`);

  if (result.limited) {
    const resetTime = result.resetTime ? new Date(result.resetTime).toISOString() : 'unknown';

    return NextResponse.json({
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again after ${resetTime}`,
      retryAfter: result.resetTime ? Math.ceil((result.resetTime - Date.now()) / 1000) : 60,
    }, {
      status: 429,
      headers: {
        'Retry-After': String(result.resetTime ? Math.ceil((result.resetTime - Date.now()) / 1000) : 60),
        'X-RateLimit-Limit': String(limiter['config'].maxRequests),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(result.resetTime || Date.now() + 60000),
      },
    });
  }

  // Add rate limit headers
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(limiter['config'].maxRequests));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining || 0));
  if (result.resetTime) {
    response.headers.set('X-RateLimit-Reset', String(result.resetTime));
  }

  return response;
}

// Cleanup function (call this periodically)
export function cleanupRateLimits() {
  apiLimiter.cleanup();
  authLimiter.cleanup();
}
