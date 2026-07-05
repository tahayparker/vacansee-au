/**
 * Rate Limiting Utility
 *
 * In-memory rate limiting to prevent API abuse
 * Uses a sliding window algorithm
 */

import { RateLimitError } from "./errors";
import { logger } from "./logger";
import { RATE_LIMIT } from "@/constants";

/**
 * Rate limit entry for tracking requests
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * In-memory store for rate limits
 * In production, this should be replaced with Redis
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Rate limiter options
 */
export interface RateLimiterOptions {
  /** Maximum number of requests allowed in the window */
  maxRequests?: number;
  /** Time window in milliseconds */
  windowMs?: number;
  /** Custom key generator function */
  keyGenerator?: (identifier: string) => string;
}

/**
 * Rate limiter result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current request count */
  current: number;
  /** Maximum requests allowed */
  limit: number;
  /** Time until reset in milliseconds */
  resetIn: number;
  /** Remaining requests */
  remaining: number;
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier for the requester (e.g., IP, user ID)
 * @param options - Rate limiter options
 * @returns Rate limit result
 *
 * @example
 * ```ts
 * const result = checkRateLimit(req.socket.remoteAddress);
 * if (!result.allowed) {
 *   throw new RateLimitError();
 * }
 * ```
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimiterOptions = {},
): RateLimitResult {
  const {
    maxRequests = RATE_LIMIT.MAX_REQUESTS,
    windowMs = RATE_LIMIT.WINDOW_MS,
    keyGenerator = (id) => `ratelimit:${id}`,
  } = options;

  const key = keyGenerator(identifier);
  const now = Date.now();

  // Get or create entry
  let entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // Create new entry
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      current: 1,
      limit: maxRequests,
      resetIn: windowMs,
      remaining: maxRequests - 1,
    };
  }

  // Increment count
  entry.count++;

  const allowed = entry.count <= maxRequests;
  const resetIn = Math.max(0, entry.resetTime - now);

  if (!allowed) {
    logger.warn("Rate limit exceeded", {
      identifier,
      count: entry.count,
      limit: maxRequests,
    });
  }

  return {
    allowed,
    current: entry.count,
    limit: maxRequests,
    resetIn,
    remaining: Math.max(0, maxRequests - entry.count),
  };
}

/**
 * Rate limiter middleware for API routes
 *
 * @param identifier - Unique identifier for the requester
 * @param options - Rate limiter options
 * @throws RateLimitError if rate limit is exceeded
 *
 * @example
 * ```ts
 * // In API route
 * const ip = req.socket.remoteAddress || 'unknown';
 * await rateLimit(ip);
 * ```
 */
export async function rateLimit(
  identifier: string,
  options?: RateLimiterOptions,
): Promise<void> {
  const result = checkRateLimit(identifier, options);

  if (!result.allowed) {
    throw new RateLimitError(
      `Rate limit exceeded. Try again in ${Math.ceil(result.resetIn / 1000)} seconds.`,
      {
        current: result.current,
        limit: result.limit,
        resetIn: result.resetIn,
        remaining: result.remaining,
      },
    );
  }
}

/**
 * Get rate limit headers for API responses
 *
 * @param result - Rate limit result
 * @returns Headers object
 */
export function getRateLimitHeaders(
  result: RateLimitResult,
): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": new Date(Date.now() + result.resetIn).toISOString(),
  };
}

/**
 * Clear rate limit for an identifier
 * Useful for testing or manual reset
 *
 * @param identifier - Unique identifier
 * @param keyGenerator - Optional custom key generator
 */
export function clearRateLimit(
  identifier: string,
  keyGenerator?: (id: string) => string,
): void {
  const key = keyGenerator
    ? keyGenerator(identifier)
    : `ratelimit:${identifier}`;
  rateLimitStore.delete(key);
}

/**
 * Get current rate limit stats for an identifier
 *
 * @param identifier - Unique identifier
 * @param keyGenerator - Optional custom key generator
 * @returns Current stats or null if no entry exists
 */
export function getRateLimitStats(
  identifier: string,
  keyGenerator?: (id: string) => string,
): { count: number; resetIn: number } | null {
  const key = keyGenerator
    ? keyGenerator(identifier)
    : `ratelimit:${identifier}`;
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return null;
  }

  const now = Date.now();
  if (now > entry.resetTime) {
    rateLimitStore.delete(key);
    return null;
  }

  return {
    count: entry.count,
    resetIn: Math.max(0, entry.resetTime - now),
  };
}
