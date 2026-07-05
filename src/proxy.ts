// src/proxy.ts
import { NextResponse } from "next/server";
import type {
  NextRequest,
  NextResponse as NextResponseType,
} from "next/server";
import { PUBLIC_PATHS } from "@/lib/paths";
import { updateSession } from "@/lib/supabase/middleware";

const ALLOWED_DURING_MAINTENANCE: string[] = [
  "/maintenance",
  "/docs",
  "/legal",
  "/privacy",
  "/api/auth/callback", // For admin login if needed to turn off maintenance
];

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/_next/") ||
    pathname.includes("/.") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".js") ||
    pathname === "/manifest.json"
  );
}

function requiresAuthentication(pathname: string): boolean {
  if (isStaticAsset(pathname)) return false;
  if (PUBLIC_PATHS.includes(pathname)) return false;
  return true;
}

// Carry refreshed session cookies onto a redirect/error response so the user
// is not silently logged out when middleware short-circuits the request.
function withSessionCookies(
  from: NextResponseType,
  to: NextResponseType,
): NextResponseType {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Refresh Supabase session cookies on every matched request. This does NOT
  // require login — public pages stay accessible to logged-out users.
  const { supabaseResponse, claims } = await updateSession(req);

  const isMaintenanceModeActive =
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  if (isMaintenanceModeActive) {
    if (isStaticAsset(pathname) || pathname.startsWith("/fonts/")) {
      return supabaseResponse;
    }
    if (!ALLOWED_DURING_MAINTENANCE.includes(pathname)) {
      const maintenanceUrl = new URL("/maintenance", req.url);
      return withSessionCookies(
        supabaseResponse,
        NextResponse.redirect(maintenanceUrl, { status: 307 }),
      );
    }
    return supabaseResponse;
  }

  if (req.method === "OPTIONS") {
    return supabaseResponse;
  }

  // Route protection runs AFTER the session refresh and only blocks paths that
  // are not explicitly public.
  if (requiresAuthentication(pathname) && !claims) {
    if (pathname.startsWith("/api/")) {
      const unauthorized = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
      return withSessionCookies(supabaseResponse, unauthorized);
    }
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    redirectUrl.searchParams.set("next", pathname);
    return withSessionCookies(
      supabaseResponse,
      NextResponse.redirect(redirectUrl),
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
