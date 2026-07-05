/**
 * Shared Animation Variants
 *
 * Centralized Framer Motion animation variants for consistent
 * animations across the application
 */

import type { Variants, Transition } from "framer-motion";
import { ANIMATION_DURATION } from "@/constants";

// ============================================================================
// TRANSITIONS
// ============================================================================

/**
 * Standard spring transition
 */
export const springTransition: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 35,
};

/**
 * Smooth ease transition
 */
export const easeTransition: Transition = {
  duration: ANIMATION_DURATION.NORMAL / 1000,
  ease: "easeOut",
};

/**
 * Fast ease transition
 */
export const fastTransition: Transition = {
  duration: ANIMATION_DURATION.FAST / 1000,
  ease: "easeInOut",
};

/**
 * Slow ease transition
 */
export const slowTransition: Transition = {
  duration: ANIMATION_DURATION.SLOW / 1000,
  ease: "easeOut",
};

// ============================================================================
// COMMON VARIANTS
// ============================================================================

/**
 * Fade in/out animation
 */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: easeTransition },
  exit: { opacity: 0, transition: fastTransition },
};

/**
 * Slide up animation
 */
export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: easeTransition,
  },
  exit: { opacity: 0, y: -20, transition: fastTransition },
};

/**
 * Slide down animation
 */
export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: easeTransition,
  },
  exit: { opacity: 0, y: 20, transition: fastTransition },
};

/**
 * Slide from left animation
 */
export const slideLeftVariants: Variants = {
  hidden: { opacity: 0, x: -15 },
  visible: {
    opacity: 1,
    x: 0,
    transition: easeTransition,
  },
  exit: { opacity: 0, x: 15, transition: fastTransition },
};

/**
 * Slide from right animation
 */
export const slideRightVariants: Variants = {
  hidden: { opacity: 0, x: 15 },
  visible: {
    opacity: 1,
    x: 0,
    transition: easeTransition,
  },
  exit: { opacity: 0, x: -15, transition: fastTransition },
};

/**
 * Scale animation
 */
export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: easeTransition,
  },
  exit: { opacity: 0, scale: 0.8, transition: fastTransition },
};

// ============================================================================
// CONTAINER VARIANTS
// ============================================================================

/**
 * Container with stagger children
 */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

/**
 * Fast stagger container
 */
export const fastStaggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

/**
 * Slow stagger container
 */
export const slowStaggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

// ============================================================================
// PAGE VARIANTS
// ============================================================================

/**
 * Page container animation
 */
export const pageContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: "easeIn" } },
};

/**
 * Page header animation
 */
export const headerSectionVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.1, duration: 0.4, ease: "easeOut" },
  },
};

/**
 * Page content animation
 */
export const contentSectionVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.2, duration: 0.4, ease: "easeOut" },
  },
};

// ============================================================================
// LIST ITEM VARIANTS
// ============================================================================

/**
 * List item animation (for use with stagger container)
 */
export const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

/**
 * Table row animation with custom index
 */
export const tableRowVariants: Variants = {
  hidden: { opacity: 0, x: -15 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.025,
      duration: 0.3,
      ease: "easeOut",
    },
  }),
  exit: { opacity: 0, x: 15, transition: { duration: 0.15, ease: "easeIn" } },
};

// ============================================================================
// MODAL/OVERLAY VARIANTS
// ============================================================================

/**
 * Modal backdrop animation
 */
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: "linear" } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: "linear" } },
};

/**
 * Modal content animation
 */
export const modalVariants: Variants = {
  hidden: { opacity: 0, y: -20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

/**
 * Mobile panel slide in from top
 */
export const mobilePanelVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2, ease: "easeIn" } },
};

// ============================================================================
// BUTTON/INTERACTIVE VARIANTS
// ============================================================================

/**
 * Button hover animation
 */
export const buttonHoverVariants: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.05, transition: fastTransition },
  tap: { scale: 0.95, transition: { duration: 0.1 } },
};

/**
 * Icon hover animation
 */
export const iconHoverVariants: Variants = {
  rest: { scale: 1, rotate: 0 },
  hover: { scale: 1.1, rotate: 5, transition: fastTransition },
};

// ============================================================================
// LABEL EXPAND VARIANTS (for navigation)
// ============================================================================

/**
 * Label expand animation (used in navigation items)
 */
export const labelExpandVariants: Variants = {
  hidden: { width: 0, opacity: 0, marginLeft: 0 },
  visible: {
    width: "auto",
    opacity: 1,
    marginLeft: "0.375rem",
    transition: { duration: 0.2, ease: "easeInOut" },
  },
  exit: {
    width: 0,
    opacity: 0,
    marginLeft: 0,
    transition: { duration: 0.2, ease: "easeInOut" },
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a custom stagger container with specified delay
 *
 * @param staggerDelay - Delay between children in seconds
 * @param delayChildren - Initial delay before first child
 * @returns Variants object
 */
export function createStaggerContainer(
  staggerDelay: number = 0.1,
  delayChildren: number = 0.05,
): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren,
      },
    },
  };
}

/**
 * Create a custom slide animation
 *
 * @param direction - Direction to slide from ('up' | 'down' | 'left' | 'right')
 * @param distance - Distance to slide in pixels
 * @returns Variants object
 */
export function createSlideVariants(
  direction: "up" | "down" | "left" | "right",
  distance: number = 20,
): Variants {
  const axis = direction === "up" || direction === "down" ? "y" : "x";
  const value =
    direction === "down" || direction === "right" ? distance : -distance;

  if (axis === "y") {
    return {
      hidden: { opacity: 0, y: value },
      visible: {
        opacity: 1,
        y: 0,
        transition: easeTransition,
      },
      exit: {
        opacity: 0,
        y: -value,
        transition: fastTransition,
      },
    };
  } else {
    return {
      hidden: { opacity: 0, x: value },
      visible: {
        opacity: 1,
        x: 0,
        transition: easeTransition,
      },
      exit: {
        opacity: 0,
        x: -value,
        transition: fastTransition,
      },
    };
  }
}

/**
 * Create a delayed animation variant
 *
 * @param baseVariants - Base variants to delay
 * @param delay - Delay in seconds
 * @returns Variants object with delay applied
 */
export function withDelay(baseVariants: Variants, delay: number): Variants {
  return {
    ...baseVariants,
    visible: {
      ...baseVariants.visible,
      transition: {
        ...(typeof baseVariants.visible === "object"
          ? baseVariants.visible.transition
          : {}),
        delay,
      },
    },
  };
}
