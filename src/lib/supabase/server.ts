// src/lib/supabase/server.ts
//
// Supabase client for Server Components, Route Handlers, and Server Actions
// (App Router). Reads/writes auth cookies via next/headers.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const publicKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, publicKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — the middleware proxy refreshes
          // the session cookies instead, so this can be safely ignored.
        }
      },
    },
  });
}
