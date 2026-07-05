/**
 * Font Configuration
 *
 * Centralized font loading and configuration for the application.
 * Optimizes font loading performance and ensures consistency.
 */

import { Montserrat } from "next/font/google";
import localFont from "next/font/local";

/**
 * Montserrat font configuration
 * Optimized for performance with specific weights and subsets
 */
export const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap", // Improves loading performance
  preload: true,
  fallback: [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "sans-serif",
  ],
});

/**
 * Qurova custom font configuration
 * Local font with optimized loading
 */
export const qurovaFont = localFont({
  src: "../../public/fonts/Qurova-SemiBold.otf",
  weight: "600",
  display: "swap",
  variable: "--font-qurova",
  preload: true,
  fallback: [
    "Montserrat",
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "sans-serif",
  ],
});

/**
 * Font class names for easy application
 */
export const fontClasses = {
  montserrat: montserrat.className,
  qurova: qurovaFont.className,
  montserratVariable: montserrat.variable,
  qurovaVariable: qurovaFont.variable,
} as const;

/**
 * CSS variables for font families
 */
export const fontVariables = {
  montserrat: "var(--font-montserrat)",
  qurova: "var(--font-qurova)",
} as const;

/**
 * Font loading optimization utilities
 */
export const fontOptimization = {
  /**
   * Preload critical fonts
   */
  preloadFonts: () => {
    if (typeof window !== "undefined") {
      // Preload Montserrat
      const montserratLink = document.createElement("link");
      montserratLink.rel = "preload";
      montserratLink.href =
        "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap";
      montserratLink.as = "style";
      document.head.appendChild(montserratLink);

      // Preload local font
      const qurovaLink = document.createElement("link");
      qurovaLink.rel = "preload";
      qurovaLink.href = "/fonts/Qurova-SemiBold.otf";
      qurovaLink.as = "font";
      qurovaLink.type = "font/otf";
      qurovaLink.crossOrigin = "anonymous";
      document.head.appendChild(qurovaLink);
    }
  },

  /**
   * Get font display strategy based on connection speed
   */
  getFontDisplayStrategy: () => {
    if (typeof navigator !== "undefined" && "connection" in navigator) {
      const connection = (navigator as any).connection;
      if (connection && connection.effectiveType) {
        // Use 'swap' for slow connections, 'optional' for fast connections
        return connection.effectiveType === "slow-2g" ||
          connection.effectiveType === "2g"
          ? "swap"
          : "optional";
      }
    }
    return "swap"; // Default to swap for better UX
  },
} as const;
