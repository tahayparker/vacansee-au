/**
 * Security Utilities
 *
 * Provides security headers, input sanitization, and other security utilities
 */

import type { NextApiResponse } from "next";

/**
 * Security headers to add to all responses
 */
export const SECURITY_HEADERS = {
  // Prevent clickjacking
  "X-Frame-Options": "DENY",

  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",

  // Enable XSS protection
  "X-XSS-Protection": "1; mode=block",

  // Referrer policy
  "Referrer-Policy": "strict-origin-when-cross-origin",

  // Permissions policy
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",

  // Content Security Policy
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://vercel.live https://va.vercel-scripts.com https://*.supabase.co wss://*.supabase.co https://raw.githubusercontent.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
} as const;

/**
 * Add security headers to API response
 *
 * @param res - Next.js API response object
 * @returns The response object (for chaining)
 *
 * @example
 * ```ts
 * export default function handler(req: NextApiRequest, res: NextApiResponse) {
 *   addSecurityHeaders(res);
 *   return res.status(200).json({ success: true });
 * }
 * ```
 */
export function addSecurityHeaders(res: NextApiResponse): NextApiResponse {
  Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
    res.setHeader(header, value);
  });
  return res;
}

/**
 * Sanitize string input to prevent XSS
 * Removes potentially dangerous characters and tags
 *
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  // Dangerous URL schemes that can execute code / leak data.
  // Matched permissively (whitespace / control chars between chars) because
  // parsers in browsers strip those when resolving URLs.
  const dangerousSchemes = [
    /j[\s\u0000-\u001F]*a[\s\u0000-\u001F]*v[\s\u0000-\u001F]*a[\s\u0000-\u001F]*s[\s\u0000-\u001F]*c[\s\u0000-\u001F]*r[\s\u0000-\u001F]*i[\s\u0000-\u001F]*p[\s\u0000-\u001F]*t[\s\u0000-\u001F]*:/gi,
    /v[\s\u0000-\u001F]*b[\s\u0000-\u001F]*s[\s\u0000-\u001F]*c[\s\u0000-\u001F]*r[\s\u0000-\u001F]*i[\s\u0000-\u001F]*p[\s\u0000-\u001F]*t[\s\u0000-\u001F]*:/gi,
    /d[\s\u0000-\u001F]*a[\s\u0000-\u001F]*t[\s\u0000-\u001F]*a[\s\u0000-\u001F]*:/gi,
    /f[\s\u0000-\u001F]*i[\s\u0000-\u001F]*l[\s\u0000-\u001F]*e[\s\u0000-\u001F]*:/gi,
  ];

  // Loop until the output stabilises — single-pass replace can be bypassed
  // by nested payloads like `jajavascript:vascript:` which collapse back
  // into `javascript:` after one removal.
  // Event-handler attributes (`onclick=`, etc.) are intentionally not
  // regex-stripped: once `<` and `>` are gone they cannot fire, so the
  // extra pattern was both redundant and CodeQL-flagged (js/incomplete-
  // multi-character-sanitization).
  let out = input;
  let prev: string;
  do {
    prev = out;
    out = out.replace(/[<>]/g, "");
    for (const pat of dangerousSchemes) {
      out = out.replace(pat, "");
    }
  } while (out !== prev);

  return out.trim();
}

/**
 * Sanitize object by sanitizing all string values recursively
 *
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string"
          ? sanitizeString(item)
          : typeof item === "object" && item !== null
            ? sanitizeObject(item)
            : item,
      );
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Validate email format
 *
 * @param email - Email to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 *
 * @param url - URL to validate
 * @returns True if valid URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if string contains only alphanumeric characters and allowed symbols
 *
 * @param input - String to validate
 * @param allowedChars - Additional allowed characters (default: "-_. ")
 * @returns True if valid
 */
export function isAlphanumeric(
  input: string,
  allowedChars: string = "-_. ",
): boolean {
  const pattern = new RegExp(`^[a-zA-Z0-9${allowedChars}]+$`);
  return pattern.test(input);
}

/**
 * Generate a secure random string
 *
 * @param length - Length of the string
 * @returns Random string
 */
export function generateSecureRandomString(length: number = 32): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  // Use crypto API if available (browser/Node.js 15+)
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);

    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length];
    }
  } else {
    // Fallback to Math.random (less secure)
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }

  return result;
}

/**
 * Hash a string using a simple hash function
 * Note: This is NOT cryptographically secure, use for non-security purposes only
 *
 * @param str - String to hash
 * @returns Hash number
 */
export function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Mask sensitive data (e.g., email, phone)
 *
 * @param value - Value to mask
 * @param visibleChars - Number of characters to show at start/end
 * @returns Masked value
 *
 * @example
 * ```ts
 * maskSensitiveData("user@example.com", 2) // "us*****om"
 * ```
 */
export function maskSensitiveData(
  value: string,
  visibleChars: number = 3,
): string {
  if (value.length <= visibleChars * 2) {
    return "*".repeat(value.length);
  }

  const start = value.slice(0, visibleChars);
  const end = value.slice(-visibleChars);
  const masked = "*".repeat(Math.max(value.length - visibleChars * 2, 3));

  return `${start}${masked}${end}`;
}

/**
 * Get client IP from request
 * Handles various proxy headers
 *
 * @param req - Request object with headers
 * @returns IP address or 'unknown'
 */
export function getClientIP(req: {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}): string {
  // Try various headers in order of preference
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(",")[0].trim();
  }

  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  const cfConnectingIp = req.headers["cf-connecting-ip"];
  if (cfConnectingIp) {
    return Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp;
  }

  // Fallback to socket remote address
  return req.socket?.remoteAddress || "unknown";
}

/**
 * Get client IP from a Web `Headers` object (App Router Route Handlers).
 *
 * @param headers - Request headers
 * @returns IP address or 'unknown'
 */
export function getClientIpFromHeaders(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return (
    headers.get("x-real-ip") ?? headers.get("cf-connecting-ip") ?? "unknown"
  );
}

/**
 * Check if request is from a bot based on user agent
 *
 * @param userAgent - User agent string
 * @returns True if likely a bot
 */
export function isBot(userAgent: string): boolean {
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python-requests/i,
  ];

  return botPatterns.some((pattern) => pattern.test(userAgent));
}
