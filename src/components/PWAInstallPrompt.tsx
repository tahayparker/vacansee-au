/**
 * PWA Install Prompt Component
 *
 * Shows an install prompt for users to install the app on their device.
 * Handles the beforeinstallprompt event and provides a custom install UI.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserPreferences } from "@/hooks/useUserPreferences";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { preferences, isAuthenticated, isLoading, markPwaPromptAsSeen } =
    useUserPreferences();

  useEffect(() => {
    // Set client-side flag
    setIsClient(true);

    // Check if app is already installed
    const checkIfInstalled = () => {
      // Check if running in standalone mode
      const standalone = window.matchMedia(
        "(display-mode: standalone)",
      ).matches;
      setIsStandalone(standalone);

      // Check if running on iOS
      const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      setIsIOS(iOS);

      // Check if already installed (PWA)
      const isInstalled = standalone || (window.navigator as any).standalone;
      setIsInstalled(isInstalled);
    };

    checkIfInstalled();

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show install prompt after a delay (don't be too pushy)
      // Only show if user is authenticated and hasn't seen it before
      setTimeout(() => {
        if (
          !isInstalled &&
          !isStandalone &&
          isAuthenticated &&
          !preferences.hasSeenPwaPrompt &&
          !isLoading
        ) {
          setShowInstallPrompt(true);
          // Mark as seen in Supabase
          markPwaPromptAsSeen().catch((err) =>
            console.error("Failed to mark PWA prompt as seen:", err),
          );
        }
      }, 3000);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [
    isInstalled,
    isStandalone,
    isAuthenticated,
    preferences,
    isLoading,
    markPwaPromptAsSeen,
  ]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === "accepted") {
        console.log("User accepted the install prompt");
      } else {
        console.log("User dismissed the install prompt");
      }

      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error("Error showing install prompt:", error);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  // Don't render on server-side
  if (!isClient) {
    return null;
  }

  // Don't show if already installed, not authenticated, or user has seen it before
  if (
    isInstalled ||
    isStandalone ||
    !isAuthenticated ||
    preferences.hasSeenPwaPrompt ||
    isLoading
  ) {
    return null;
  }

  // iOS-specific install instructions
  if (isIOS && !isStandalone) {
    return (
      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
          >
            <div className="bg-black/90 backdrop-blur-md border border-purple-500/30 rounded-lg p-4 shadow-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-purple-500" />
                  <h3 className="text-white font-semibold text-sm">
                    Install vacansee-au
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-gray-300 text-xs space-y-2">
                <p>Install vacansee-au on your iPhone for quick access:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>
                    Tap the Share button{" "}
                    <span className="text-purple-500">⎋</span>
                  </li>
                  <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
                  <li>Tap &quot;Add&quot; to install</li>
                </ol>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Standard PWA install prompt
  return (
    <AnimatePresence>
      {showInstallPrompt && deferredPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
        >
          <div className="bg-black/90 backdrop-blur-md border border-purple-500/30 rounded-lg p-4 shadow-lg">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-purple-500" />
                <h3 className="text-white font-semibold text-sm">
                  Install vacansee-au
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-gray-300 text-xs mb-3">
              Install vacansee-au on your device for quick access to room
              availability.
            </p>

            <div className="flex gap-2">
              <Button
                onClick={handleInstallClick}
                size="sm"
                className="flex-1 bg-purple-500 hover:bg-purple-500 text-white text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Install
              </Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
                size="sm"
                className="text-gray-400 border-gray-600 hover:bg-gray-800 text-xs"
              >
                Later
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
