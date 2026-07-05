/**
 * Scroll to Top Button Component
 *
 * A floating button that appears when the user scrolls down
 * and smoothly scrolls back to the top when clicked.
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollToTopProps {
  /** Scroll position (in pixels) at which button becomes visible */
  showAfter?: number;
  /** Additional CSS classes */
  className?: string;
}

export function ScrollToTop({ showAfter = 300, className }: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > showAfter) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Initial check
    toggleVisibility();

    // Add scroll event listener
    window.addEventListener("scroll", toggleVisibility);

    // Cleanup
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, [showAfter]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          className={cn(
            "fixed bottom-8 right-8 z-50",
            "w-12 h-12 rounded-full",
            "bg-purple-500/90 hover:bg-purple-500/90",
            "backdrop-blur-sm",
            "text-white",
            "shadow-lg hover:shadow-xl",
            "transition-all duration-200",
            "flex items-center justify-center",
            "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-black/90",
            className,
          )}
          aria-label="Scroll to top"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to programmatically check if scroll-to-top should be visible
 * Useful for other components that want to react to scroll position
 */
export function useScrollPosition(threshold: number = 300) {
  const [isPastThreshold, setIsPastThreshold] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      setIsPastThreshold(window.scrollY > threshold);
    };

    checkScroll();
    window.addEventListener("scroll", checkScroll);
    return () => window.removeEventListener("scroll", checkScroll);
  }, [threshold]);

  return isPastThreshold;
}
