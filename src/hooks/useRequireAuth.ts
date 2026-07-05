// src/hooks/useRequireAuth.ts
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

/**
 * Custom hook to protect pages requiring authentication.
 * Redirects to login if user is not authenticated.
 *
 * @returns Object containing user, loading state, and authenticated status
 */
export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = getSupabaseBrowserClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const currentUrl = () => {
      const query = typeof window !== "undefined" ? window.location.search : "";
      return `${pathname ?? "/"}${query}`;
    };

    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (!user) {
          const returnUrl = currentUrl();
          router.replace(`/auth/login?next=${encodeURIComponent(returnUrl)}`);
          setIsAuthenticated(false);
        } else {
          setUser(user);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("[useRequireAuth] Error checking authentication:", error);
        if (isMounted) {
          router.replace("/auth/login");
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;

        if (event === "SIGNED_OUT" || !session) {
          setUser(null);
          setIsAuthenticated(false);
          router.replace("/auth/login");
        } else if (event === "SIGNED_IN" && session) {
          setUser(session.user);
          setIsAuthenticated(true);
        }
      },
    );

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [router, pathname, supabase]);

  return { user, loading, isAuthenticated };
}
