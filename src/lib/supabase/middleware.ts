// src/lib/supabase/middleware.ts
//
// Session-refresh helper for Next.js middleware, following Supabase's current
// SSR recipe. Creates a Supabase client on every matched request and calls
// getClaims() to refresh the auth cookies. This ONLY refreshes the session —
// it does not enforce login. Route protection is decided separately in
// src/middleware.ts based on PUBLIC_PATHS.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;

export async function updateSession(request: NextRequest) {
  // `supabaseResponse` must be the response we ultimately return so refreshed
  // cookies reach the browser. Reassigning it inside setAll preserves them.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    publicKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the token if needed. getClaims() validates the JWT (locally for
  // asymmetric keys, otherwise against Supabase) and is the recommended call
  // for authorization decisions.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  return { supabaseResponse, claims };
}
