// src/lib/paths.ts

/**
 * Defines paths accessible without authentication (no session required).
 * This list MUST be kept in sync for both middleware (authentication)
 * and _app.tsx (client-side authorization logic - primarily for loader display).
 */
export const PUBLIC_PATHS: string[] = [
  "/", // Homepage
  "/auth/login", // Login page itself
  "/api/auth/callback", // Auth callback handler (API, needs to be public)
  "/unauthorized", // RE-ADDED: Page for specific errors like signup disabled
  "/404", // 404 page
  "/500", // 500 page
  "/about", // About page
  "/docs", // Documentation page
  "/legal", // Terms and Conditions
  "/privacy", // Legal pages (Privacy Policy, etc.)
  "/maintenance", // Maintenance page
  // Add any other truly public paths here
];

/**
 * Helper function to determine if a path is considered public based on the list.
 * Can be used in both middleware and client-side code if needed,
 * though usually the check logic differs slightly based on context (e.g., ignoring assets).
 */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}
