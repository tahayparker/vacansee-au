// src/contexts/TimeFormatContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface TimeFormatContextValue {
  use24h: boolean;
  setTimeFormat: (use24h: boolean) => Promise<void>;
  isLoading: boolean;
}

const TimeFormatContext = createContext<TimeFormatContextValue | undefined>(
  undefined,
);

export function TimeFormatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [use24h, setUse24h] = useState<boolean>(true); // Default to 24h format
  const [isLoading, setIsLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();

  // Load preference from Supabase user_metadata on mount
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.user_metadata?.use24h !== undefined) {
          setUse24h(user.user_metadata.use24h);
        }
        // If not set, keep default (true)
      } catch (error) {
        console.error("Error loading time format preference:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreference();
  }, [supabase]);

  // Update preference in both state and Supabase
  const setTimeFormat = useCallback(
    async (newUse24h: boolean) => {
      try {
        setUse24h(newUse24h);

        // Persist to Supabase user_metadata
        const { error } = await supabase.auth.updateUser({
          data: { use24h: newUse24h },
        });

        if (error) {
          console.error("Error updating time format preference:", error);
          // Revert on error
          setUse24h(!newUse24h);
          throw error;
        }
      } catch (error) {
        console.error("Failed to update time format:", error);
        throw error;
      }
    },
    [supabase],
  );

  return (
    <TimeFormatContext.Provider value={{ use24h, setTimeFormat, isLoading }}>
      {children}
    </TimeFormatContext.Provider>
  );
}

export function useTimeFormat() {
  const context = useContext(TimeFormatContext);
  if (context === undefined) {
    throw new Error("useTimeFormat must be used within a TimeFormatProvider");
  }
  return context;
}
