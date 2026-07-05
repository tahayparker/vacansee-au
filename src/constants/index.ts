/**
 * Shared constants used throughout the vacansee-au application
 *
 * This file serves as the single source of truth for all constant values
 * to ensure consistency across the application and make updates easier.
 */

// ============================================================================
// TIME & DATE CONSTANTS
// ============================================================================

/**
 * Days of the week starting with Monday (index 0)
 * This matches the university timetable format
 */
export const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/**
 * Full half-hour grid used by scheduleData.json (06:00–23:30).
 * availability[i] covers SCHEDULE_TIME_SLOTS[i] → SCHEDULE_TIME_SLOTS[i + 1].
 */
export const SCHEDULE_TIME_SLOTS = [
  "06:00",
  "06:30",
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
  "22:30",
  "23:00",
  "23:30",
] as const;

/** Column header labels — start time of each availability slot in scheduleData.json */
export const SCHEDULE_SLOT_LABELS = SCHEDULE_TIME_SLOTS.slice(
  0,
  SCHEDULE_TIME_SLOTS.length - 1,
);

/**
 * All time intervals for room scheduling (30-minute intervals)
 * Times are in 24-hour format (HH:mm)
 */
export const TIME_INTERVALS = [
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
] as const;

/**
 * UOW campuses with physical room availability (matches SOLSS scrape order).
 * Excludes UOW Online — online-only locations have no room inventory.
 */
export const UOW_CAMPUSES = [
  "Wollongong",
  "Eurobodalla",
  "Bega Valley",
  "Innovation Campus",
  "Shoalhaven",
  "Liverpool",
  "Southern Highlands",
  "Sutherland",
  "Sydney",
] as const;

export type UowCampus = (typeof UOW_CAMPUSES)[number];

/** Default campus when the user has not set a preference. */
export const DEFAULT_CAMPUS: UowCampus = "Wollongong";

/**
 * Timezone used for all date/time calculations.
 * UOW's Wollongong campus operates on AEST/AEDT (Australia/Sydney).
 */
export const APP_TIMEZONE = "Australia/Sydney" as const;

/**
 * Time format options for the availability check form
 */
export const MIN_HOUR = 7;
export const MAX_HOUR = 23;

// ============================================================================
// ROOM CONSTANTS
// ============================================================================

/**
 * Room groupings - some rooms are subdivisions of larger rooms.
 * When the main room is occupied, the sub-rooms cannot be used.
 *
 * Format: { "mainRoom": ["subRoom1", "subRoom2"] }
 *
 * Empty for UOW: AU room codes (e.g. "233-G12", "20-5") use a different
 * naming scheme; combo rules can be added once the mapping is known.
 */
export const ROOM_GROUPINGS: Record<string, string[]> = {};

/**
 * Room name patterns to exclude from availability listings
 * These are typically consultation rooms or online-only classes
 */
export const EXCLUDED_ROOM_PATTERNS = ["consultation", "online"] as const;

// ============================================================================
// API CONSTANTS
// ============================================================================

/**
 * Cache duration for API responses (in seconds)
 */
export const CACHE_TTL = {
  /** Schedule data cache (5 minutes) */
  SCHEDULE: 300,
  /** Rooms list cache (1 hour) */
  ROOMS: 3600,
  /** Availability data cache (2 minutes) */
  AVAILABILITY: 120,
} as const;

/**
 * Rate limiting configuration (requests per time window)
 */
export const RATE_LIMIT = {
  /** Maximum requests per window */
  MAX_REQUESTS: 100,
  /** Time window in milliseconds (1 minute) */
  WINDOW_MS: 60 * 1000,
} as const;

// ============================================================================
// UI CONSTANTS
// ============================================================================

/**
 * Animation duration constants (in milliseconds)
 */
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

/**
 * Debounce delays for user inputs (in milliseconds)
 */
export const DEBOUNCE_DELAY = {
  SEARCH: 300,
  FORM_INPUT: 500,
} as const;

/**
 * Graph color coding for availability
 */
export const AVAILABILITY_COLORS = {
  AVAILABLE: "bg-green-500/70",
  OCCUPIED: "bg-red-600/80",
} as const;

/**
 * Loading spinner size variants
 */
export const SPINNER_SIZE = {
  SMALL: "h-4 w-4",
  MEDIUM: "h-8 w-8",
  LARGE: "h-12 w-12",
} as const;

// ============================================================================
// STORAGE KEYS
// ============================================================================

/**
 * LocalStorage keys for persisting user preferences and state
 */
export const STORAGE_KEYS = {
  TIME_FORMAT: "vacansee-au_time_format",
  RECENT_SEARCHES: "vacansee-au_recent_searches",
  ONBOARDING_COMPLETED: "vacansee-au_onboarding_completed",
  CUSTOM_GRAPH_FILTERS: "vacansee-au_custom_graph_filters",
} as const;

/**
 * Maximum number of recent searches to store
 */
export const MAX_RECENT_SEARCHES = 10;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * Feature flags for enabling/disabling features
 * Useful for gradual rollouts or A/B testing
 */
export const FEATURES = {
  ONBOARDING: true,
  ANALYTICS: true,
  PWA: true,
  CSV_EXPORT: true,
  SHAREABLE_URLS: true,
} as const;

// ============================================================================
// EXTERNAL URLS
// ============================================================================

/**
 * External URLs used in the application
 */
export const EXTERNAL_URLS = {
  GITHUB_REPO: "https://github.com/tahayparker/vacansee-au",
  AUTHOR_WEBSITE: "https://tahayparker.vercel.app/contact",
  SCHEDULE_DATA_URL:
    "https://raw.githubusercontent.com/tahayparker/vacansee-au/refs/heads/main/public/scheduleData.json",
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];
export type TimeInterval = (typeof TIME_INTERVALS)[number];
