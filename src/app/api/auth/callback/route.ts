// src/app/api/auth/callback/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const isDev = process.env.NODE_ENV !== "production";

function getBaseUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

function safeRedirectPath(raw: string | undefined): string {
  if (
    typeof raw === "string" &&
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    !raw.startsWith("/\\")
  ) {
    return raw;
  }
  return "/";
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const baseUrl = getBaseUrl(req);

  // Signup disabled → not an authorized account.
  if (searchParams.get("error_code") === "signup_disabled") {
    const url = new URL("/unauthorized", baseUrl);
    url.searchParams.set("auth_error", "signup_disabled");
    return NextResponse.redirect(url);
  }

  const code = searchParams.get("code");
  if (!code) {
    const url = new URL("/auth/login", baseUrl);
    url.searchParams.set(
      "error",
      "Authentication process failed. No code received.",
    );
    return NextResponse.redirect(url);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    if (isDev) console.error("[Callback] Exchange error:", error.message);
    const url = new URL("/auth/login", baseUrl);
    url.searchParams.set(
      "error",
      `Authentication failed: ${error.message}. Please try again.`,
    );
    return NextResponse.redirect(url);
  }

  const redirectPath = safeRedirectPath(
    req.cookies.get("supabase-redirect-path")?.value,
  );
  return NextResponse.redirect(new URL(redirectPath, baseUrl));
}
