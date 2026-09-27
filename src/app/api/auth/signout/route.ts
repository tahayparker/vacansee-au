// src/app/api/auth/signout/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getBaseUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const baseUrl = getBaseUrl(req);
  return NextResponse.redirect(new URL("/auth/login", baseUrl));
}
