/**
 * Standardized Loading Spinner Component
 *
 * Provides consistent loading indicators across the application
 * with different size variants and optional messages
 */

import React, { JSX } from "react";
import { cn } from "@/lib/utils";

/**
 * Size variants for the spinner
 */
export type SpinnerSize = "small" | "medium" | "large";

/**
 * Props for LoadingSpinner component
 */
export interface LoadingSpinnerProps {
  /** Size variant of the spinner */
  size?: SpinnerSize;
  /** Optional loading message to display */
  message?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to center the spinner */
  centered?: boolean;
  /** Whether to use full viewport height */
  fullHeight?: boolean;
}

/**
 * Size class mappings for the spinner
 */
const sizeClasses: Record<SpinnerSize, string> = {
  small: "h-4 w-4",
  medium: "h-10 w-10",
  large: "h-12 w-12",
};

/**
 * Border width classes for different sizes
 */
const borderClasses: Record<SpinnerSize, string> = {
  small: "border-b-2",
  medium: "border-b-2",
  large: "border-b-2", // Kept thin as requested
};

/**
 * Text size classes for loading messages
 */
const textSizeClasses: Record<SpinnerSize, string> = {
  small: "text-sm",
  medium: "text-base",
  large: "text-lg",
};

/**
 * Standardized loading spinner component
 *
 * @example
 * ```tsx
 * // Simple spinner
 * <LoadingSpinner />
 *
 * // With message
 * <LoadingSpinner message="Loading data..." />
 *
 * // Large centered spinner
 * <LoadingSpinner size="large" centered />
 *
 * // Full height loading screen
 * <LoadingSpinner size="large" message="Loading..." fullHeight />
 * ```
 */
export function LoadingSpinner({
  size = "medium",
  message,
  className,
  centered = false,
  fullHeight = false,
}: LoadingSpinnerProps): JSX.Element {
  const spinnerElement = (
    <div
      className={cn(
        "inline-flex flex-col items-center justify-center gap-3",
        centered && !fullHeight && "mx-auto",
        className,
      )}
    >
      {/* Inline spinner for consistency with the rest of the app */}
      <div
        className={cn(
          "animate-spin rounded-full border-purple-500",
          sizeClasses[size],
          borderClasses[size], // Use dynamic border width
          "transition-all duration-200",
        )}
        aria-label="Loading"
        role="status"
      />

      {/* Optional loading message */}
      {message && (
        <p
          className={cn(
            textSizeClasses[size],
            "text-white/70 font-medium animate-pulse",
          )}
        >
          {message}
        </p>
      )}

      {/* Screen reader text */}
      <span className="sr-only">Loading{message ? `: ${message}` : "..."}</span>
    </div>
  );

  // If fullHeight is true, wrap in a full-height container
  if (fullHeight) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {spinnerElement}
      </div>
    );
  }

  // If centered without fullHeight, wrap in a flex container
  if (centered) {
    return (
      <div className="flex items-center justify-center w-full py-8">
        {spinnerElement}
      </div>
    );
  }

  // Default: just return the spinner
  return spinnerElement;
}

/**
 * Loading spinner specifically for full-page loading
 * Uses large size and full height by default
 */
export function FullPageLoader({ message }: { message?: string }): JSX.Element {
  return <LoadingSpinner size="large" message={message} fullHeight />;
}

/**
 * Loading spinner for inline use (small size)
 */
export function InlineLoader({
  message,
  className,
}: {
  message?: string;
  className?: string;
}): JSX.Element {
  return (
    <LoadingSpinner
      size="small"
      message={message}
      className={cn("inline-flex", className)}
    />
  );
}

/**
 * Loading spinner for button states
 */
export function ButtonLoader({
  className,
}: {
  className?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        "h-4 w-4 animate-spin rounded-full border-purple-500",
        borderClasses.small,
        className,
      )}
      aria-label="Loading"
    />
  );
}

/**
 * Loading overlay component
 * Displays a loading spinner over content with a backdrop
 */
export function LoadingOverlay({
  isLoading,
  message,
  children,
}: {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
          <LoadingSpinner size="large" message={message} />
        </div>
      )}
    </div>
  );
}

export default LoadingSpinner;
