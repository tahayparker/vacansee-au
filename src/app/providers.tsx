"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import PlasmaBackground from "@/components/PlasmaBackground";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Onboarding } from "@/components/Onboarding";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { TimeFormatProvider } from "@/contexts/TimeFormatContext";
import { CampusProvider } from "@/contexts/CampusContext";
import { ToastProvider } from "@/components/ui/toast";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { fontOptimization } from "@/lib/fonts";
import { cn } from "@/lib/utils";

const CENTERED_PATHS = new Set([
  "/maintenance",
  "/unauthorized",
  "/auth/login",
]);

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isMaintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  // Register service worker for PWA functionality
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((error) =>
          console.error("Service Worker registration failed:", error),
        );
    }
  }, []);

  // Preload fonts for better performance
  useEffect(() => {
    fontOptimization.preloadFonts();
  }, []);

  // Ensure pages start at the top on navigation
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  const mainClassName = cn(
    "flex flex-col flex-grow items-center z-10 w-full px-4 sm:px-8",
    pathname === "/" && !isMaintenanceMode
      ? "justify-center pt-16 md:pt-0"
      : CENTERED_PATHS.has(pathname)
        ? "justify-center pt-16"
        : "pt-4",
  );

  return (
    <ToastProvider>
      <div className="bg-background text-foreground min-h-screen flex flex-col relative">
        <PlasmaBackground />
        <TimeFormatProvider>
          <CampusProvider>
            <SiteHeader maintenanceMode={isMaintenanceMode} />
            <main className={mainClassName}>{children}</main>
            <SiteFooter />
          </CampusProvider>
        </TimeFormatProvider>

        <ScrollToTop />
        <Onboarding />
        <PWAInstallPrompt />

        <Analytics />
        <SpeedInsights />
      </div>
    </ToastProvider>
  );
}
