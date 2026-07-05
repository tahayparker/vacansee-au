"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { DEFAULT_CAMPUS, type UowCampus } from "@/constants";
import { parseCampus } from "@/lib/campus";

interface CampusContextValue {
  campus: UowCampus;
  setCampus: (campus: UowCampus) => Promise<void>;
  isLoading: boolean;
}

const CampusContext = createContext<CampusContextValue | undefined>(undefined);

export function CampusProvider({ children }: { children: React.ReactNode }) {
  const [campus, setCampusState] = useState<UowCampus>(DEFAULT_CAMPUS);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.user_metadata?.campus) {
          setCampusState(parseCampus(user.user_metadata.campus));
        }
      } catch (error) {
        console.error("Error loading campus preference:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreference();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user?.user_metadata?.campus) {
          setCampusState(parseCampus(session.user.user_metadata.campus));
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  const setCampus = useCallback(
    async (newCampus: UowCampus) => {
      const previous = campus;
      try {
        setCampusState(newCampus);
        const { error } = await supabase.auth.updateUser({
          data: { campus: newCampus },
        });
        if (error) {
          setCampusState(previous);
          throw error;
        }
      } catch (error) {
        console.error("Failed to update campus preference:", error);
        throw error;
      }
    },
    [campus, supabase],
  );

  return (
    <CampusContext.Provider value={{ campus, setCampus, isLoading }}>
      {children}
    </CampusContext.Provider>
  );
}

export function useCampus() {
  const context = useContext(CampusContext);
  if (context === undefined) {
    throw new Error("useCampus must be used within a CampusProvider");
  }
  return context;
}
