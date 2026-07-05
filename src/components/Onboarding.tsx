/**
 * Onboarding Component
 *
 * Shows a welcome tour for first-time users explaining the app's features.
 * Uses localStorage to track if user has completed onboarding.
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  DoorOpen,
  Clock,
  Search,
  List,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Settings as SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUserPreferences } from "@/hooks/useUserPreferences";

const ONBOARDING_SESSION_FLAG = "vacansee-au_onboarding_done";

// ============================================================================
// TYPES
// ============================================================================

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  tip?: string;
}

interface OnboardingProps {
  /** Callback when onboarding is completed */
  onComplete?: () => void;
  /** Whether to show onboarding (overrides localStorage check) */
  forceShow?: boolean;
}

// ============================================================================
// ONBOARDING STEPS
// ============================================================================

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: "Welcome to vacansee-au ✨",
    description:
      "The fastest way to find an available room on campus. Here’s a super-quick tour (under 30s).",
    icon: <DoorOpen className="w-12 h-12 text-purple-500" />,
    tip: "You can re-open this anytime from Profile.",
  },
  {
    title: "Available now",
    description: "See which rooms are free right this minute.",
    icon: <Clock className="w-12 h-12 text-green-400" />,
    tip: "Times are shown in Sydney (AEST/AEDT) timezone.",
  },
  {
    title: "Plan ahead",
    description:
      "Check which rooms free up soon (e.g. in 30m or 1h) so you can plan the rest of your day.",
    icon: <Clock className="w-12 h-12 text-blue-400" />,
    tip: "Switch ranges to preview upcoming availability.",
  },
  {
    title: "Search & filters",
    description: "Look up specific rooms and quickly check a particular time.",
    icon: <Search className="w-12 h-12 text-yellow-400" />,
    tip: "Search by name or code to jump straight there.",
  },
  {
    title: "Room details",
    description:
      "Browse all rooms with names and codes so you always pick the right room.",
    icon: <List className="w-12 h-12 text-pink-400" />,
    tip: "Everything is organized A→Z for easy scanning.",
  },
  {
    title: "Graphs",
    description:
      "Visualize busy vs free times across the week to plan smarter.",
    icon: <BarChart3 className="w-12 h-12 text-indigo-400" />,
    tip: "Export graphs as PNG to share with your team.",
  },
  {
    title: "Install the app",
    description:
      "Add vacansee-au to your home screen for one‑tap access. We’ll prompt you when it’s available.",
    icon: <Smartphone className="w-12 h-12 text-teal-400" />,
    tip: "Look for the install prompt.",
  },
  {
    title: "Profile & settings",
    description:
      "Update time format, view your info, and re-open this tour anytime from Settings.",
    icon: <SettingsIcon className="w-12 h-12 text-purple-500" />,
    tip: "Find it under your profile.",
  },
  {
    title: "You're all set 🎉",
    description: "That’s everything you need. Welcome to vacansee-au!",
    icon: <DoorOpen className="w-12 h-12 text-purple-500" />,
    tip: "Enjoy!",
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function Onboarding({ onComplete, forceShow = false }: OnboardingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { preferences, isAuthenticated, isLoading, markOnboardingAsSeen } =
    useUserPreferences();

  // Check if user has completed onboarding
  useEffect(() => {
    if (forceShow) {
      setIsOpen(true);
      setCurrentStep(0);
      return;
    }

    // Only show if user is authenticated and hasn't seen onboarding
    const seenThisSession =
      typeof window !== "undefined" &&
      sessionStorage.getItem(ONBOARDING_SESSION_FLAG) === "true";
    if (
      !isLoading &&
      isAuthenticated &&
      !preferences.hasSeenOnboarding &&
      !seenThisSession
    ) {
      setIsOpen(true);
      setCurrentStep(0);
    }
  }, [forceShow, isLoading, isAuthenticated, preferences]);

  // Ensure we always start from the first step when the modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  const handleComplete = async () => {
    // Mark as seen in Supabase user metadata
    if (isAuthenticated) {
      try {
        await markOnboardingAsSeen();
      } catch (error) {
        console.error("Error saving onboarding status:", error);
      }
    }

    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(ONBOARDING_SESSION_FLAG, "true");
      } catch {}
    }
    setIsOpen(false);
    setCurrentStep(0);
    onComplete?.();
  };

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const step = ONBOARDING_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]"
            onClick={handleSkip}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            <div
              className="bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Progress Bar */}
              <div className="h-1 bg-white/10">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Content */}
              <div className="p-8 relative">
                {/* Close Button */}
                <button
                  onClick={handleComplete}
                  className="absolute top-4 right-4 z-10 text-white/50 hover:text-white/80 transition-colors pointer-events-auto"
                  aria-label="Close onboarding"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Step Content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* Icon */}
                    <div className="flex justify-center">{step.icon}</div>

                    {/* Title */}
                    <h2 className="text-2xl font-bold text-white text-center">
                      {step.title}
                    </h2>

                    {/* Description */}
                    <p className="text-white/70 text-center leading-relaxed">
                      {step.description}
                    </p>

                    {/* Tip */}
                    {step.tip && (
                      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                        <p className="text-sm text-purple-500 text-center">
                          💡 {step.tip}
                        </p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="mt-8 flex items-center justify-between gap-4">
                  {/* Previous Arrow */}
                  <Button
                    onClick={handlePrevious}
                    disabled={isFirstStep}
                    variant="outline"
                    aria-label="Previous"
                    className={cn(
                      "h-10 w-10 p-0 rounded-full flex items-center justify-center",
                      isFirstStep && "invisible",
                    )}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>

                  {/* Step Indicator */}
                  <div className="flex items-center gap-2">
                    {ONBOARDING_STEPS.map((_, index) => (
                      <div
                        key={index}
                        className={cn(
                          "w-2 h-2 rounded-full transition-all duration-300",
                          index === currentStep
                            ? "bg-purple-500 w-6"
                            : "bg-white/20",
                        )}
                      />
                    ))}
                  </div>

                  {/* Next/Finish Arrow */}
                  <Button
                    onClick={handleNext}
                    aria-label={isLastStep ? "Finish" : "Next"}
                    className="h-10 w-10 p-0 rounded-full flex items-center justify-center bg-purple-500 hover:bg-purple-500"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>

                {/* Skip Link */}
                {!isLastStep && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={handleSkip}
                      className="text-sm text-white/50 hover:text-white/70 transition-colors"
                    >
                      Skip tour
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to check if user has completed onboarding
 * @deprecated Use useUserPreferences hook instead
 */
export function useOnboardingStatus() {
  const { preferences, isAuthenticated } = useUserPreferences();

  return {
    hasCompletedOnboarding: isAuthenticated
      ? preferences.hasSeenOnboarding
      : true,
    resetOnboarding: () => {
      console.warn(
        "resetOnboarding is deprecated. User preferences are now stored in Supabase user metadata.",
      );
    },
  };
}
