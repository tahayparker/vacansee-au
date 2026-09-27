// src/app/api/auth/magic-link/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIpFromHeaders, SECURITY_HEADERS } from "@/lib/security";

function getBaseUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  const ip = getClientIpFromHeaders(req.headers);
  try {
    await rateLimit(ip);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: SECURITY_HEADERS },
    );
  }

  try {
    const json = await req.json().catch(() => ({}));
    const { email, next } = json;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400, headers: SECURITY_HEADERS },
      );
    }

    const baseUrl = getBaseUrl(req);
    const redirectUrl = `${baseUrl}/api/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: redirectUrl,
        shouldCreateUser: false,
      },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: SECURITY_HEADERS },
      );
    }

    return NextResponse.json(
      { success: true, message: "Magic link sent to your email." },
      { headers: SECURITY_HEADERS },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500, headers: SECURITY_HEADERS },
    );
  }
}
