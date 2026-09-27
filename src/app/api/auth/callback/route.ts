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

  // Signup disabled -> not an authorized account.
  if (searchParams.get("error_code") === "signup_disabled") {
    const url = new URL("/unauthorized", baseUrl);
    url.searchParams.set("auth_error", "signup_disabled");
    return NextResponse.redirect(url);
  }

  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next");

  const supabase = await createClient();

  // Handle OTP / Magic Link token_hash
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });
    if (error) {
      const url = new URL("/auth/login", baseUrl);
      url.searchParams.set("error", error.message);
      return NextResponse.redirect(url);
    }
    if (type === "recovery") {
      return NextResponse.redirect(new URL("/auth/reset-password", baseUrl));
    }
    const dest = next ? safeRedirectPath(next) : "/";
    return NextResponse.redirect(new URL(dest, baseUrl));
  }

  // Handle PKCE code exchange
  if (code) {
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

    if (type === "recovery" || next === "/auth/reset-password") {
      return NextResponse.redirect(new URL("/auth/reset-password", baseUrl));
    }

    const redirectPath = next
      ? safeRedirectPath(next)
      : safeRedirectPath(req.cookies.get("supabase-redirect-path")?.value);
    return NextResponse.redirect(new URL(redirectPath, baseUrl));
  }

  const url = new URL("/auth/login", baseUrl);
  url.searchParams.set(
    "error",
    searchParams.get("error_description") ||
      "Authentication failed. No authorization code received.",
  );
  return NextResponse.redirect(url);
}
