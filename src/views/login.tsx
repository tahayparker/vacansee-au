"use client";

import { JSX, SVGProps, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Provider, Session } from "@supabase/supabase-js";
import Cookies from "js-cookie";
import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

// --- SVG Icons ---
export function Azure(
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>,
) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 448 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fill="#ffffff"
        d="M0 32h214.6v214.6H0V32zm233.4 0H448v214.6H233.4V32zM0 265.4h214.6V480H0V265.4zm233.4 0H448V480H233.4V265.4z"
      />
    </svg>
  );
}

// --- Login Page Component ---
export default function LoginPage() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const errorQuery = searchParams?.get("error");
    if (errorQuery) {
      const decodedError = decodeURIComponent(errorQuery.replace(/\+/g, " "));
      setErrorMessage(decodedError);
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.delete("error");
      const qs = params.toString();
      const safePathname = pathname || "/";
      router.replace(qs ? `${safePathname}?${qs}` : safePathname);
    }
  }, [searchParams, pathname, router]);

  const getRedirectPathFromQuery = (): string => {
    const raw = searchParams?.get("next");
    if (!raw || raw.length === 0) return "/";
    if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
      return "/";
    }
    if (typeof window === "undefined") return raw;
    try {
      const u = new URL(raw, window.location.origin);
      if (u.origin !== window.location.origin) return "/";
      return u.pathname + u.search + u.hash;
    } catch {
      return "/";
    }
  };

  const handleOAuthLogin = async (provider: Provider) => {
    setIsLoading(true);
    setErrorMessage(null);
    const redirectURL = window.location.origin + "/api/auth/callback";

    const redirectPath = getRedirectPathFromQuery();
    if (redirectPath && redirectPath !== "/") {
      Cookies.set("supabase-redirect-path", redirectPath, {
        path: "/",
        expires: 1 / 288,
      });
      console.log("Stored redirect path in cookie:", redirectPath);
    } else {
      Cookies.remove("supabase-redirect-path", { path: "/" });
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: { redirectTo: redirectURL },
    });

    if (error) {
      console.error(`Error initiating login with ${provider}:`, error.message);
      setErrorMessage(
        `Failed to start login with ${provider}: ${error.message}. Please try again.`,
      );
      Cookies.remove("supabase-redirect-path", { path: "/" });
      setIsLoading(false);
    } else {
      console.log(`Redirecting to ${provider} for authentication...`);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        // Inline same-origin validation. Keeps the guard shape visible
        // to CodeQL (js/client-side-unvalidated-url-redirection) rather
        // than hiding it behind a helper it cannot trace.
        const raw = Cookies.get("supabase-redirect-path");
        let finalRedirectUrl = "/";
        if (
          typeof raw === "string" &&
          raw.startsWith("/") &&
          !raw.startsWith("//") &&
          !raw.startsWith("/\\")
        ) {
          try {
            const u = new URL(raw, window.location.origin);
            if (u.origin === window.location.origin) {
              finalRedirectUrl = u.pathname + u.search + u.hash;
            }
          } catch {
            /* keep "/" */
          }
        }
        Cookies.remove("supabase-redirect-path", { path: "/" });
        console.log(
          "User already logged in (useEffect check), redirecting to:",
          finalRedirectUrl,
        );
        router.replace(finalRedirectUrl);
      }
    };
    checkSession();
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: string, session: Session | null) => {
        if (event === "SIGNED_IN" && session) {
          // Inline same-origin validation (see useEffect above).
          const raw = Cookies.get("supabase-redirect-path");
          let finalRedirectUrl = "/";
          if (
            typeof raw === "string" &&
            raw.startsWith("/") &&
            !raw.startsWith("//") &&
            !raw.startsWith("/\\")
          ) {
            try {
              const u = new URL(raw, window.location.origin);
              if (u.origin === window.location.origin) {
                finalRedirectUrl = u.pathname + u.search + u.hash;
              }
            } catch {
              /* keep "/" */
            }
          }
          Cookies.remove("supabase-redirect-path", { path: "/" });
          console.log(
            "Auth state changed to SIGNED_IN (listener), redirecting to:",
            finalRedirectUrl,
          );
          router.replace(finalRedirectUrl);
        } else if (event === "SIGNED_OUT") {
          console.log("Auth state changed to SIGNED_OUT (listener)");
        }
      },
    );
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <div className="w-full flex items-center justify-center py-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md space-y-6 rounded-xl border border-white/20 bg-white/10 p-8 shadow-lg backdrop-blur-lg"
      >
        <motion.div
          variants={itemVariants}
          className="space-y-2 text-center text-white"
        >
          <h1 className="text-3xl font-bold tracking-tight">Sign In</h1>
          <p className="text-md text-gray-300">
            Choose your preferred provider to continue
          </p>
        </motion.div>

        {errorMessage && (
          <motion.div
            variants={itemVariants}
            className="rounded-md border border-red-500/60 bg-red-950/50 p-4 text-center text-sm text-red-200 flex items-center justify-center gap-2"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        <motion.div variants={itemVariants} className="space-y-4">
          <button
            type="button"
            onClick={() => handleOAuthLogin("azure")}
            disabled={isLoading}
            className="w-full rounded-full border border-solid border-white/[.3] transition-colors flex items-center justify-center gap-3 hover:bg-white/[.1] hover:border-white/[.5] font-medium text-base h-12 px-5 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Azure className="size-5" />
            <span>{isLoading ? "Processing..." : "Sign in with Azure"}</span>
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
