// src/app/api/auth/update-password/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SECURITY_HEADERS } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => ({}));
    const { password } = json;

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400, headers: SECURITY_HEADERS },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            "Unauthorized. Please request a new password reset link and try again.",
        },
        { status: 401, headers: SECURITY_HEADERS },
      );
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: SECURITY_HEADERS },
      );
    }

    return NextResponse.json(
      { success: true, message: "Password updated successfully." },
      { headers: SECURITY_HEADERS },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500, headers: SECURITY_HEADERS },
    );
  }
}
