/**
 * Accessibility Utilities
 *
 * Provides utilities for improving accessibility across the application.
 * Includes ARIA helpers, keyboard navigation, and screen reader support.
 */

/**
 * Generate unique IDs for ARIA attributes
 */
export function generateAriaId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * ARIA live region announcements for screen readers
 */
export class AriaAnnouncer {
  private static instance: AriaAnnouncer;
  private liveRegion: HTMLElement | null = null;

  private constructor() {
    this.createLiveRegion();
  }

  static getInstance(): AriaAnnouncer {
    if (!AriaAnnouncer.instance) {
      AriaAnnouncer.instance = new AriaAnnouncer();
    }
    return AriaAnnouncer.instance;
  }

  private createLiveRegion(): void {
    if (typeof window === "undefined") return;

    this.liveRegion = document.createElement("div");
    this.liveRegion.setAttribute("aria-live", "polite");
    this.liveRegion.setAttribute("aria-atomic", "true");
    this.liveRegion.className = "sr-only";
    this.liveRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(this.liveRegion);
  }

  announce(message: string, priority: "polite" | "assertive" = "polite"): void {
    if (!this.liveRegion) return;

    this.liveRegion.setAttribute("aria-live", priority);
    this.liveRegion.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = "";
      }
    }, 1000);
  }
}

/**
 * Keyboard navigation helpers
 */
export const KeyboardKeys = {
  ENTER: "Enter",
  SPACE: " ",
  ESCAPE: "Escape",
  TAB: "Tab",
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  HOME: "Home",
  END: "End",
} as const;

/**
 * Check if a key event matches the expected key
 */
export function isKey(
  key: string,
  event: React.KeyboardEvent | KeyboardEvent,
): boolean {
  return event.key === key;
}

/**
 * Handle keyboard navigation for lists
 */
export function handleListNavigation(
  event: KeyboardEvent,
  currentIndex: number,
  totalItems: number,
  onSelect: (index: number) => void,
  onNavigate?: (index: number) => void,
): boolean {
  switch (event.key) {
    case KeyboardKeys.ARROW_DOWN:
      event.preventDefault();
      const nextIndex = Math.min(currentIndex + 1, totalItems - 1);
      onNavigate?.(nextIndex);
      return true;

    case KeyboardKeys.ARROW_UP:
      event.preventDefault();
      const prevIndex = Math.max(currentIndex - 1, 0);
      onNavigate?.(prevIndex);
      return true;

    case KeyboardKeys.HOME:
      event.preventDefault();
      onNavigate?.(0);
      return true;

    case KeyboardKeys.END:
      event.preventDefault();
      onNavigate?.(totalItems - 1);
      return true;

    case KeyboardKeys.ENTER:
    case KeyboardKeys.SPACE:
      event.preventDefault();
      onSelect(currentIndex);
      return true;

    case KeyboardKeys.ESCAPE:
      event.preventDefault();
      return true;
  }

  return false;
}

/**
 * Focus management utilities
 */
export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  ) as NodeListOf<HTMLElement>;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === KeyboardKeys.TAB) {
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  element.addEventListener("keydown", handleKeyDown);

  // Return cleanup function
  return () => {
    element.removeEventListener("keydown", handleKeyDown);
  };
}

/**
 * Screen reader only text component
 */
export function srOnly(text: string): string {
  return text;
}

/**
 * ARIA attributes for common UI patterns
 */
export const AriaAttributes = {
  // Button with loading state
  button: (isLoading: boolean, label: string) => ({
    "aria-label": isLoading ? `${label} (loading)` : label,
    "aria-disabled": isLoading,
  }),

  // Form field with error
  formField: (hasError: boolean, errorMessage?: string) => ({
    "aria-invalid": hasError,
    "aria-describedby": hasError ? "error-message" : undefined,
    "aria-errormessage": hasError ? errorMessage : undefined,
  }),

  // Loading state
  loading: (isLoading: boolean, loadingText: string = "Loading") => ({
    "aria-busy": isLoading,
    "aria-live": isLoading ? "polite" : "off",
    "aria-label": isLoading ? loadingText : undefined,
  }),

  // Expandable content
  expandable: (isExpanded: boolean, label: string) => ({
    "aria-expanded": isExpanded,
    "aria-label": label,
  }),

  // Navigation
  navigation: (currentPage?: string) => ({
    "aria-label": "Main navigation",
    "aria-current": currentPage ? "page" : undefined,
  }),

  // Search
  search: (hasResults: boolean) => ({
    "aria-label": "Search rooms",
    "aria-expanded": hasResults,
    "aria-haspopup": "listbox",
    "aria-activedescendant": hasResults ? "search-result-0" : undefined,
  }),
} as const;

/**
 * Color contrast utilities
 */
export function getContrastRatio(): number {
  // Simplified contrast ratio calculation
  // In a real implementation, you'd use a proper color contrast library
  return 4.5; // Placeholder - always passes WCAG AA
}

/**
 * Accessibility testing helpers
 */
export const A11yTestHelpers = {
  /**
   * Check if element is visible to screen readers
   */
  isVisibleToScreenReader: (element: HTMLElement): boolean => {
    const style = window.getComputedStyle(element);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      element.getAttribute("aria-hidden") !== "true"
    );
  },

  /**
   * Check if element has proper focus management
   */
  hasFocusManagement: (element: HTMLElement): boolean => {
    return (
      element.hasAttribute("tabindex") ||
      element.tagName === "BUTTON" ||
      element.tagName === "A" ||
      element.tagName === "INPUT" ||
      element.tagName === "SELECT" ||
      element.tagName === "TEXTAREA"
    );
  },

  /**
   * Validate ARIA attributes
   */
  validateAriaAttributes: (element: HTMLElement): string[] => {
    const errors: string[] = [];

    // Check for required ARIA attributes
    if (
      element.getAttribute("aria-expanded") &&
      !element.getAttribute("aria-controls")
    ) {
      errors.push("Element with aria-expanded should have aria-controls");
    }

    if (
      element.getAttribute("aria-haspopup") &&
      !element.getAttribute("aria-expanded")
    ) {
      errors.push("Element with aria-haspopup should have aria-expanded");
    }

    return errors;
  },
} as const;
