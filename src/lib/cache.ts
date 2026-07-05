/**
 * Caching Utility
 *
 * In-memory caching with TTL (Time To Live) and stale-while-revalidate support
 * Helps reduce API calls and improve performance
 */

import { logger } from "./logger";

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  /** Cached data */
  data: T;
  /** Timestamp when data was cached */
  cachedAt: number;
  /** Timestamp when data expires */
  expiresAt: number;
  /** Timestamp when data becomes stale (for stale-while-revalidate) */
  staleAt: number;
}

/**
 * In-memory cache store
 */
const cacheStore = new Map<string, CacheEntry<any>>();

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [key, entry] of cacheStore.entries()) {
    if (now > entry.expiresAt) {
      cacheStore.delete(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.debug(`Cache cleanup: removed ${cleanedCount} expired entries`);
  }
}, 60000); // Clean up every minute

/**
 * Cache options
 */
export interface CacheOptions {
  /** Time to live in milliseconds */
  ttl: number;
  /** Time until stale in milliseconds (for stale-while-revalidate) */
  staleTime?: number;
}

/**
 * Cache get result
 */
export interface CacheGetResult<T> {
  /** Cached data (if found) */
  data: T | null;
  /** Whether data was found in cache */
  hit: boolean;
  /** Whether cached data is stale */
  stale: boolean;
  /** Age of cached data in milliseconds */
  age: number;
}

/**
 * Set data in cache
 *
 * @param key - Cache key
 * @param data - Data to cache
 * @param options - Cache options
 *
 * @example
 * ```ts
 * cacheSet('schedule', scheduleData, { ttl: 300000 }); // Cache for 5 minutes
 * ```
 */
export function cacheSet<T>(key: string, data: T, options: CacheOptions): void {
  const now = Date.now();
  const { ttl, staleTime = ttl * 0.8 } = options;

  const entry: CacheEntry<T> = {
    data,
    cachedAt: now,
    expiresAt: now + ttl,
    staleAt: now + staleTime,
  };

  cacheStore.set(key, entry);

  logger.debug(`Cache set: ${key}`, {
    ttl: ttl / 1000,
    staleTime: staleTime / 1000,
  });
}

/**
 * Get data from cache
 *
 * @param key - Cache key
 * @returns Cache get result
 *
 * @example
 * ```ts
 * const result = cacheGet<ScheduleData>('schedule');
 * if (result.hit && !result.stale) {
 *   return result.data;
 * }
 * ```
 */
export function cacheGet<T>(key: string): CacheGetResult<T> {
  const entry = cacheStore.get(key) as CacheEntry<T> | undefined;
  const now = Date.now();

  if (!entry) {
    logger.debug(`Cache miss: ${key}`);
    return {
      data: null,
      hit: false,
      stale: false,
      age: 0,
    };
  }

  // Check if expired
  if (now > entry.expiresAt) {
    cacheStore.delete(key);
    logger.debug(`Cache expired: ${key}`);
    return {
      data: null,
      hit: false,
      stale: false,
      age: 0,
    };
  }

  const age = now - entry.cachedAt;
  const stale = now > entry.staleAt;

  logger.debug(`Cache hit: ${key}`, {
    stale,
    age: age / 1000,
  });

  return {
    data: entry.data,
    hit: true,
    stale,
    age,
  };
}

/**
 * Delete data from cache
 *
 * @param key - Cache key
 * @returns True if entry was deleted
 */
export function cacheDelete(key: string): boolean {
  const deleted = cacheStore.delete(key);
  if (deleted) {
    logger.debug(`Cache delete: ${key}`);
  }
  return deleted;
}

/**
 * Clear all cache entries
 */
export function cacheClear(): void {
  const size = cacheStore.size;
  cacheStore.clear();
  logger.info(`Cache cleared: ${size} entries removed`);
}

/**
 * Check if key exists in cache
 *
 * @param key - Cache key
 * @returns True if key exists and not expired
 */
export function cacheHas(key: string): boolean {
  const result = cacheGet(key);
  return result.hit;
}

/**
 * Get cache statistics
 *
 * @returns Cache stats
 */
export function cacheStats(): {
  size: number;
  entries: Array<{ key: string; age: number; stale: boolean }>;
} {
  const now = Date.now();
  const entries: Array<{ key: string; age: number; stale: boolean }> = [];

  for (const [key, entry] of cacheStore.entries()) {
    entries.push({
      key,
      age: now - entry.cachedAt,
      stale: now > entry.staleAt,
    });
  }

  return {
    size: cacheStore.size,
    entries,
  };
}

/**
 * Get or set data in cache (with factory function)
 *
 * @param key - Cache key
 * @param factory - Function to generate data if not cached
 * @param options - Cache options
 * @returns Cached or freshly generated data
 *
 * @example
 * ```ts
 * const data = await cacheGetOrSet(
 *   'schedule',
 *   async () => {
 *     const response = await fetch('/api/schedule');
 *     return response.json();
 *   },
 *   { ttl: 300000 }
 * );
 * ```
 */
export async function cacheGetOrSet<T>(
  key: string,
  factory: () => Promise<T>,
  options: CacheOptions,
): Promise<T> {
  const result = cacheGet<T>(key);

  if (result.hit && !result.stale) {
    return result.data!;
  }

  // If stale, return stale data and revalidate in background
  if (result.hit && result.stale) {
    logger.debug(
      `Returning stale data for: ${key}, revalidating in background`,
    );

    // Revalidate in background (don't await)
    factory()
      .then((freshData) => {
        cacheSet(key, freshData, options);
        logger.debug(`Background revalidation complete for: ${key}`);
      })
      .catch((error) => {
        logger.error(`Background revalidation failed for: ${key}`, error);
      });

    return result.data!;
  }

  // No cached data, fetch fresh
  const freshData = await factory();
  cacheSet(key, freshData, options);
  return freshData;
}

/**
 * Wrap an async function with caching
 *
 * @param fn - Function to wrap
 * @param keyGenerator - Function to generate cache key from arguments
 * @param options - Cache options
 * @returns Wrapped function with caching
 *
 * @example
 * ```ts
 * const fetchScheduleCached = withCache(
 *   fetchSchedule,
 *   () => 'schedule',
 *   { ttl: 300000 }
 * );
 * ```
 */
export function withCache<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  keyGenerator: (...args: TArgs) => string,
  options: CacheOptions,
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const key = keyGenerator(...args);
    return cacheGetOrSet(key, () => fn(...args), options);
  };
}
