"use client";

import React, { useEffect, useState } from "react";
import SpotlightCard from "@/components/SpotlightCard";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, RotateCcw } from "lucide-react";
import { useTimeFormat } from "@/contexts/TimeFormatContext";
import { useCampus } from "@/contexts/CampusContext";
import { UOW_CAMPUSES } from "@/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { imageOptimization } from "@/lib/images";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import type { User } from "@supabase/supabase-js";

export default function Profile() {
  // Check authentication first
  const { loading: authLoading, isAuthenticated } = useRequireAuth();
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [optimizedAvatarUrl, setOptimizedAvatarUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [resetting, setResetting] = useState<boolean>(false);
  const [resetDone, setResetDone] = useState<boolean>(false);
  const { use24h, setTimeFormat } = useTimeFormat();
  const { campus, setCampus } = useCampus();
  const { resetOnboarding } = useUserPreferences();

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    try {
      await supabase.auth.signOut();

      // Clear all storage
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (storageError) {
        console.warn("Could not clear storage:", storageError);
      }

      // Clear all cookies
      try {
        document.cookie.split(";").forEach((c) => {
          const cookieName = c.split("=")[0].trim();
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        });
      } catch (cookieError) {
        console.warn("Could not clear cookies:", cookieError);
      }

      // Force hard redirect
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth
      .getUser()
      .then(async ({ data }: { data: { user: User | null } }) => {
        const user = data.user;
        if (!user) {
          setIsLoading(false);
          return;
        }
        const meta = (user.user_metadata || {}) as Record<string, any>;
        // Common OAuth metadata keys: name, full_name, picture, avatar_url
        const userName = meta.name || meta.full_name || "";
        const userAvatar = meta.avatar_url || meta.picture || "";
        setName(userName || user.email?.split("@")[0] || "");
        setEmail(user.email || "");

        // Optimize avatar image if available
        if (userAvatar) {
          try {
            const optimizedUrl = await imageOptimization.avatar(userAvatar, 96);
            setOptimizedAvatarUrl(optimizedUrl);
          } catch (error) {
            console.warn("Failed to optimize avatar image:", error);
            setOptimizedAvatarUrl(userAvatar);
          }
        }

        setIsLoading(false);
      })
      .catch((error: unknown) => {
        console.error("Error fetching user data:", error);
        setIsLoading(false);
      });
  }, []);

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Don't render page content if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const handleResetOnboarding = async () => {
    try {
      setResetting(true);
      setResetDone(false);
      // Clear session guard so the tour can re-open immediately
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem("vacansee-au_onboarding_done");
        } catch {}
      }
      await resetOnboarding();
      setResetDone(true);
    } catch (e) {
      console.error("Failed to reset onboarding", e);
    } finally {
      setResetting(false);
    }
  };

  // Show loading spinner while fetching user data (no card until data is ready)
  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 w-full px-4"
        style={{ minHeight: "calc(100vh - 80px)" }}
      >
        <LoadingSpinner size="medium" message="Loading profile..." />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-4 w-full px-4"
      style={{ minHeight: "calc(100vh - 80px)" }}
    >
      <style jsx>{`
        :global(.pc-card-wrapper:hover),
        :global(.pc-card-wrapper.active) {
          --card-opacity: 0 !important;
        }
        :global(.pc-card) {
          height: 90vh !important;
          max-height: 700px !important;
          border: 1px solid rgb(147, 51, 234) !important;
        }
        :global(.pc-inside) {
          border: 1px solid rgb(147, 51, 234) !important;
        }
        /* Ensure readable black text on any background */
        :global(.pc-details) {
          mix-blend-mode: normal !important;
        }
        :global(.pc-details h3),
        :global(.pc-details p) {
          background: none !important;
          -webkit-text-fill-color: initial !important;
          background-clip: initial !important;
          -webkit-background-clip: initial !important;
          color: #0a0a0a !important; /* black */
          text-shadow: 0 1px 2px rgba(255, 255, 255, 0.6) !important; /* subtle lift on darker areas */
        }
        :global(.pc-details h3) {
          margin-bottom: 8px !important; /* spacing between name and title */
          font-weight: 700 !important;
        }
        :global(.pc-details p) {
          font-size: 20px !important; /* slightly larger title */
          top: 0px !important;
          font-weight: 600 !important;
        }
      `}</style>
      <SpotlightCard className="w-full max-w-md">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl font-bold text-white overflow-hidden">
            {optimizedAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={optimizedAvatarUrl}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              (name || email || " ").charAt(0).toUpperCase()
            )}
          </div>
          <div className="w-full max-w-xs mx-auto">
            <h2 className="text-2xl font-bold text-white mb-1">
              {name || " "}
            </h2>
            <p className="text-neutral-300">{email || " "}</p>
            <div className="mt-4">
              <Button
                onClick={handleSignOut}
                variant="destructive"
                className="w-full flex items-center gap-2 justify-center"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </SpotlightCard>
      <SpotlightCard className="w-full max-w-md">
        <div className="space-y-4">
          <h3 className="text-xl text-center font-semibold text-white">
            Settings
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-md text-white">Time format</span>
            <Tabs
              value={use24h ? "24h" : "12h"}
              onValueChange={(val) => setTimeFormat(val === "24h")}
            >
              <TabsList className="bg-black/40 border border-white/10 w-[180px]">
                <TabsTrigger
                  value="12h"
                  className="text-white data-[state=active]:bg-purple-500 data-[state=active]:text-white transition-all duration-300 ease-in-out"
                >
                  12h
                </TabsTrigger>
                <TabsTrigger
                  value="24h"
                  className="text-white data-[state=active]:bg-purple-500 data-[state=active]:text-white transition-all duration-300 ease-in-out"
                >
                  24h
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-md text-white shrink-0">Campus</span>
            <Select
              value={campus}
              onValueChange={(value) => setCampus(value as typeof campus)}
            >
              <SelectTrigger className="w-[180px] bg-black/40 border border-white/10 text-white">
                <SelectValue placeholder="Select campus" />
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-white/20 text-white">
                {UOW_CAMPUSES.map((name) => (
                  <SelectItem
                    key={name}
                    value={name}
                    className="focus:bg-purple-500/30 focus:text-white"
                  >
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-white/60">
            Your default campus for pages in this app.
          </p>

          <div className="h-px bg-white/10 my-2" />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-md text-white">Onboarding</span>
              <Button
                onClick={handleResetOnboarding}
                disabled={resetting}
                variant="outline"
                className="w-[180px] flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {resetting ? "Resetting…" : "Reset onboarding"}
              </Button>
            </div>
            <p className="text-sm text-white/60">
              See the welcome tour again to revisit key features.
            </p>
            {resetDone && (
              <span className="text-xs text-green-400">
                Reset. The tour will appear now.
              </span>
            )}
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
}
