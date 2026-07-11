"use client";

import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { LogOut, OctagonMinus } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function UnauthorizedPage() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSignOutLoading, setIsSignOutLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [hasValidated, setHasValidated] = useState(false);

  useEffect(() => {
    const validateAccess = async () => {
      // Skip validation if we've already validated successfully
      if (hasValidated) return;

      try {
        // Check if user has an active session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          // User is signed in, redirect to homepage
          console.log("User is already signed in, redirecting to homepage");
          router.replace("/");
          return;
        }

        // Check if they came from auth flow with signup_disabled error
        const authError = searchParams?.get("auth_error");

        if (authError !== "signup_disabled") {
          // User didn't come from legitimate auth error, redirect to homepage
          console.log("No valid auth error found, redirecting to homepage");
          router.replace("/");
          return;
        }

        // Valid access - user is not signed in and came from signup_disabled error
        // Mark as validated before cleaning URL
        setHasValidated(true);
        setIsValidating(false);

        // Clean up URL parameters
        router.replace("/unauthorized");
      } catch (error) {
        console.error("Error validating access:", error);
        // On error, redirect to homepage for safety
        router.replace("/");
      }
    };

    validateAccess();
  }, [searchParams, supabase.auth, router, hasValidated]);

  const handleSignOut = async () => {
    setIsSignOutLoading(true);
    console.log("Signing out...");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
      setIsSignOutLoading(false);
    } else {
      console.log("Sign out successful, redirecting to /");
      router.push("/");
    }
  };

  // Show loading state while validating access
  if (isValidating) {
    return (
      <div className="relative text-center max-w-2xl py-10">
        <div className="flex justify-center items-center min-h-[200px]">
          <LoadingSpinner size="medium" />
        </div>
      </div>
    );
  }

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
    <div className="relative text-center max-w-2xl py-10">
      {/* Background Glow */}
      <div className="absolute inset-0 -z-10 overflow-visible">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-red-600/20 rounded-full blur-[120px]" />
      </div>

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8 rounded-xl border border-red-500/60 bg-red-950/25 p-8 shadow-lg backdrop-blur-lg"
      >
        <motion.div variants={itemVariants}>
          <OctagonMinus className="mx-auto h-12 w-12 text-red-400" />
        </motion.div>
        <motion.h1
          variants={itemVariants}
          className="text-3xl font-bold tracking-tight text-red-200"
        >
          Unauthorized Access
        </motion.h1>
        <motion.p variants={itemVariants} className="text-md text-red-100/90">
          Your account is not authorized to access vacansee-au.
        </motion.p>
        <motion.p variants={itemVariants} className="text-sm text-red-100/90">
          If you have been given access, please try using the account you signed
          up with.
          <br />
          <br />
          If you believe this is an error, please contact the administrator for
          assistance.
          <br />
          <br />
          Please click the button below to go home. Your account will be signed
          out.
        </motion.p>
        <motion.div
          variants={itemVariants}
          className="flex justify-center pt-4"
        >
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={isSignOutLoading}
            className="rounded-full border-white/40 bg-transparent px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-white/10 hover:border-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 flex items-center gap-2 disabled:opacity-60"
          >
            {isSignOutLoading ? (
              <LoadingSpinner size="small" className="mr-2" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Go Home
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
