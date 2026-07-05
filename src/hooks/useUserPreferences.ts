// src/hooks/useUserPreferences.ts
import { useState, useEffect, useCallback } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

export interface UserPreferences {
  hasSeenOnboarding: boolean;
  hasSeenPwaPrompt: boolean;
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>({
    hasSeenOnboarding: false,
    hasSeenPwaPrompt: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load preferences from Supabase user_metadata on mount
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const loadPreferences = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setIsAuthenticated(true);
          setPreferences({
            hasSeenOnboarding: user.user_metadata?.hasSeenOnboarding ?? false,
            hasSeenPwaPrompt: user.user_metadata?.hasSeenPwaPrompt ?? false,
          });
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Error loading user preferences:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();

    // Listen for auth state changes, including USER_UPDATED when metadata changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (
          (event === "SIGNED_IN" || event === "USER_UPDATED") &&
          session?.user
        ) {
          setIsAuthenticated(true);
          setPreferences({
            hasSeenOnboarding:
              session.user.user_metadata?.hasSeenOnboarding ?? false,
            hasSeenPwaPrompt:
              session.user.user_metadata?.hasSeenPwaPrompt ?? false,
          });
        } else if (event === "SIGNED_OUT") {
          setIsAuthenticated(false);
          setPreferences({
            hasSeenOnboarding: false,
            hasSeenPwaPrompt: false,
          });
        }
      },
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Mark onboarding as seen
  const markOnboardingAsSeen = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({
        data: { hasSeenOnboarding: true },
      });

      if (error) {
        console.error("Error updating onboarding preference:", error);
        throw error;
      }

      setPreferences((prev) => ({ ...prev, hasSeenOnboarding: true }));
    } catch (error) {
      console.error("Failed to update onboarding preference:", error);
      throw error;
    }
  }, [isAuthenticated]);

  // Reset onboarding to show the tour again
  const resetOnboarding = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({
        data: { hasSeenOnboarding: false },
      });
      if (error) {
        console.error("Error resetting onboarding preference:", error);
        throw error;
      }
      setPreferences((prev) => ({ ...prev, hasSeenOnboarding: false }));
    } catch (error) {
      console.error("Failed to reset onboarding preference:", error);
      throw error;
    }
  }, [isAuthenticated]);

  // Mark PWA prompt as seen
  const markPwaPromptAsSeen = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({
        data: { hasSeenPwaPrompt: true },
      });

      if (error) {
        console.error("Error updating PWA prompt preference:", error);
        throw error;
      }

      setPreferences((prev) => ({ ...prev, hasSeenPwaPrompt: true }));
    } catch (error) {
      console.error("Failed to update PWA prompt preference:", error);
      throw error;
    }
  }, [isAuthenticated]);

  return {
    preferences,
    isLoading,
    isAuthenticated,
    markOnboardingAsSeen,
    resetOnboarding,
    markPwaPromptAsSeen,
  };
}
