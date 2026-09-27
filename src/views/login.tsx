"use client";

import { useState, useEffect, FormEvent, JSX, SVGProps } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Provider, Session } from "@supabase/supabase-js";
import Cookies from "js-cookie";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  ArrowLeft,
  Sparkles,
  KeyRound,
} from "lucide-react";

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

type AuthTab = "magic-link" | "password";

export default function LoginPage() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState<AuthTab>("magic-link");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
    } else {
      Cookies.remove("supabase-redirect-path", { path: "/" });
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: { redirectTo: redirectURL },
    });

    if (error) {
      setErrorMessage(
        `Failed to start login with ${provider}: ${error.message}. Please try again.`,
      );
      Cookies.remove("supabase-redirect-path", { path: "/" });
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
    } else {
      const next = getRedirectPathFromQuery();
      router.replace(next);
    }
  };

  const handleMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const next = getRedirectPathFromQuery();
    const redirectUrl = `${window.location.origin}/api/auth/callback${next && next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
        shouldCreateUser: false,
      },
    });

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage(
        "Magic link sent! Check your email and click the link to sign in.",
      );
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const redirectUrl = `${window.location.origin}/api/auth/callback?type=recovery&next=/auth/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage("Password reset email sent! Check your inbox.");
      setIsForgotPassword(false);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
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
        router.replace(finalRedirectUrl);
      }
    };
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: string, session: Session | null) => {
        if (event === "SIGNED_IN" && session) {
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
          router.replace(finalRedirectUrl);
        }
      },
    );
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  return (
    <div className="w-full flex items-center justify-center py-10 px-4">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md space-y-6 rounded-2xl border border-white/20 bg-black/40 p-8 shadow-2xl backdrop-blur-xl"
      >
        {isForgotPassword && (
          <motion.div variants={itemVariants}>
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back to Sign In</span>
            </button>
          </motion.div>
        )}

        <motion.div
          variants={itemVariants}
          className="space-y-2 text-center text-white"
        >
          <h1 className="text-3xl font-bold tracking-tight">
            {isForgotPassword ? "Reset Password" : "Sign In"}
          </h1>
          <p className="text-sm text-white/60">
            {isForgotPassword
              ? "Enter your email to receive a password reset link"
              : "Choose your preferred sign-in method to continue"}
          </p>
        </motion.div>

        {errorMessage && (
          <motion.div
            variants={itemVariants}
            className="rounded-lg border border-red-500/60 bg-red-950/50 p-3.5 text-sm text-red-200 flex items-start gap-2.5"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400 mt-0.5" />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            variants={itemVariants}
            className="rounded-lg border border-green-500/60 bg-green-950/50 p-3.5 text-sm text-green-200 flex items-start gap-2.5"
          >
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-400 mt-0.5" />
            <span>{successMessage}</span>
          </motion.div>
        )}

        {isForgotPassword ? (
          <motion.form
            variants={itemVariants}
            onSubmit={handleForgotPassword}
            className="space-y-4"
          >
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="reset-email"
                className="text-xs font-medium text-white/80 uppercase tracking-wider"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@uow.edu.au"
                  required
                  disabled={isLoading}
                  className="w-full rounded-full border border-white/20 bg-white/5 px-4 py-2.5 pl-10 text-sm text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-purple-600 hover:bg-purple-500 transition-colors flex items-center justify-center gap-2 font-medium text-sm h-11 px-5 text-white disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Sending reset link...</span>
                </>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>
          </motion.form>
        ) : (
          <>
            {/* Single-Click SSO Button */}
            <motion.div variants={itemVariants} className="space-y-3">
              <button
                type="button"
                onClick={() => handleOAuthLogin("azure")}
                disabled={isLoading}
                className="w-full rounded-full border border-white/30 transition-colors flex items-center justify-center gap-3 hover:bg-white/10 hover:border-white/50 font-medium text-sm h-11 px-5 text-white disabled:opacity-50"
              >
                <Azure className="size-4" />
                <span>
                  {isLoading ? "Processing..." : "Sign in with Microsoft"}
                </span>
              </button>
            </motion.div>

            {/* Divider */}
            <motion.div
              variants={itemVariants}
              className="flex items-center gap-3 text-xs text-white/40 uppercase tracking-wider"
            >
              <div className="flex-1 h-px bg-white/10" />
              <span>or continue with email</span>
              <div className="flex-1 h-px bg-white/10" />
            </motion.div>

            {/* Tab switch: Magic Link vs Password */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-2 p-1 rounded-full bg-white/5 border border-white/10"
            >
              <button
                type="button"
                onClick={() => {
                  setActiveTab("magic-link");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-full transition-all ${
                  activeTab === "magic-link"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Magic Link</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("password");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-full transition-all ${
                  activeTab === "password"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Password</span>
              </button>
            </motion.div>

            {/* Magic Link Form */}
            {activeTab === "magic-link" && (
              <motion.form
                key="magic-link-form"
                variants={itemVariants}
                onSubmit={handleMagicLink}
                className="space-y-4"
              >
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="ml-email"
                    className="text-xs font-medium text-white/80 uppercase tracking-wider"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input
                      id="ml-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@uow.edu.au"
                      required
                      autoComplete="email"
                      disabled={isLoading}
                      className="w-full rounded-full border border-white/20 bg-white/5 px-4 py-2.5 pl-10 text-sm text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-full bg-purple-600 hover:bg-purple-500 transition-colors flex items-center justify-center gap-2 font-medium text-sm h-11 px-5 text-white disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Sending magic link...</span>
                    </>
                  ) : (
                    <span>Send Magic Link</span>
                  )}
                </button>
              </motion.form>
            )}

            {/* Password Form */}
            {activeTab === "password" && (
              <motion.form
                key="password-form"
                variants={itemVariants}
                onSubmit={handlePasswordLogin}
                className="space-y-4"
              >
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="pwd-email"
                    className="text-xs font-medium text-white/80 uppercase tracking-wider"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input
                      id="pwd-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@uow.edu.au"
                      required
                      autoComplete="email"
                      disabled={isLoading}
                      className="w-full rounded-full border border-white/20 bg-white/5 px-4 py-2.5 pl-10 text-sm text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="pwd-password"
                      className="text-xs font-medium text-white/80 uppercase tracking-wider"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input
                      id="pwd-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      disabled={isLoading}
                      className="w-full rounded-full border border-white/20 bg-white/5 px-4 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-white/30 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-full bg-purple-600 hover:bg-purple-500 transition-colors flex items-center justify-center gap-2 font-medium text-sm h-11 px-5 text-white disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </motion.form>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
