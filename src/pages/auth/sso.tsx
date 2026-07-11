import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SSO() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Look for hash in URL
    const hash = window.location.hash;
    
    // Parse hash manually if present
    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    let nextUrl: string | null = null;
    
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      accessToken = params.get("access_token");
      refreshToken = params.get("refresh_token");
      nextUrl = params.get("next");
    }

    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ error }: { error: any }) => {
        if (error) {
          setError(error.message);
        } else {
          // Navigate to home after setting session
          router.replace(nextUrl || "/");
        }
      });
    } else {
      // Maybe Supabase already parsed it and stripped the hash
      supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
        if (session) {
          router.replace("/");
        } else {
          setError("No session tokens found in URL. Please go back to the gate and try again.");
        }
      });
    }
  }, [router, supabase]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-black z-50 fixed inset-0">
      {error ? (
        <div className="text-red-500 max-w-md text-center p-4 bg-red-500/10 rounded-lg border border-red-500/20">{error}</div>
      ) : (
        <div className="text-white flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-purple-500"></div>
          <p className="text-white/80 font-medium">Authenticating session...</p>
        </div>
      )}
    </div>
  );
}
