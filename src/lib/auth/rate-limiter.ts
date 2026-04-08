// Rate limiter utilities
interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
  identifier: (request: any) => string;
  skipCondition?: (request: any) => boolean;
}

export class AdvancedRateLimiter {
  private rules = new Map<string, RateLimitRule>();
  private storage = new Map<string, { count: number; resetTime: number }>();

  addRule(name: string, rule: RateLimitRule): void {
    this.rules.set(name, rule);
  }

  removeRule(name: string): void {
    this.rules.delete(name);
  }

  async checkLimit(name: string, request: any): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const rule = this.rules.get(name);
    if (!rule) {
      return { allowed: true, remaining: -1, resetTime: 0 };
    }

    if (rule.skipCondition && rule.skipCondition(request)) {
      return { allowed: true, remaining: -1, resetTime: 0 };
    }

    const identifier = rule.identifier(request);
    const key = `${name}:${identifier}`;
    const now = Date.now();

    let record = this.storage.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + rule.windowMs,
      };
      this.storage.set(key, record);
      return {
        allowed: true,
        remaining: rule.maxRequests - 1,
        resetTime: record.resetTime,
      };
    }

    if (record.count >= rule.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      };
    }

    record.count++;
    return {
      allowed: true,
      remaining: rule.maxRequests - record.count,
      resetTime: record.resetTime,
    };
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.storage.entries()) {
      if (now > record.resetTime) {
        this.storage.delete(key);
      }
    }
  }

  getStats(): { rules: number; activeLimits: number } {
    return {
      rules: this.rules.size,
      activeLimits: this.storage.size,
    };
  }
}

// Pre-configured rate limiters
export const createApiRateLimiter = () => {
  const limiter = new AdvancedRateLimiter();

  limiter.addRule('api_general', {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    identifier: (req) => req.headers?.['x-forwarded-for'] || req.ip || 'unknown',
  });

  limiter.addRule('api_auth', {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    identifier: (req) => req.headers?.['x-forwarded-for'] || req.ip || 'unknown',
  });

  limiter.addRule('api_admin', {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1000,
    identifier: (req) => req.userId || req.headers?.['x-user-id'] || 'unknown',
  });

  return limiter;
};

export const createWebRateLimiter = () => {
  const limiter = new AdvancedRateLimiter();

  limiter.addRule('web_general', {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1000,
    identifier: (req) => req.headers?.['x-forwarded-for'] || req.ip || 'unknown',
  });

  limiter.addRule('web_auth', {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    identifier: (req) => req.headers?.['x-forwarded-for'] || req.ip || 'unknown',
  });

  return limiter;
};

// Periodic cleanup
setInterval(() => {
  // Cleanup would be called on all active limiters
}, 5 * 60 * 1000); // Every 5 minutes
