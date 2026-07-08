/**
 * Shared type definitions used across the vacansee-au application
 *
 * These types represent domain models and common structures
 * that are used by multiple components and services.
 */

import { DAYS_OF_WEEK } from "@/constants";

// ============================================================================
// DOMAIN TYPES
// ============================================================================

/**
 * Represents a room in the university
 */
export interface Room {
  /** Full room name (e.g. "25-153" or "Online") */
  name: string;
  /** Building number or location name */
  building: string;
  /** Room number after the first hyphen; empty for standalone buildings */
  roomNumber: string;
  /** Campus name; null for locations without a campus */
  campus: string | null;
  /** Maximum capacity of the room (null if unknown) */
  capacity: number | null;
  /** Teaching space type from UOW room catalogue */
  roomType: string | null;
  /** AV / equipment tier */
  equipmentTier: string | null;
  /** Special features (video conferencing, whiteboard, etc.) */
  specialFeatures: string | null;
  /** Similar venues listed in the catalogue */
  similarVenues: string | null;
  /** Local path to front-of-room photo under /public */
  frontImage: string | null;
  /** Local path to rear-of-room photo under /public */
  rearImage: string | null;
}

/**
 * Represents a scheduled class or booking
 */
export interface Timing {
  /** Subject code (e.g., "CS101") */
  subjectCode: string;
  /** Class name/section */
  class: string;
  /** Day of the week */
  day: (typeof DAYS_OF_WEEK)[number];
  /** Start time in HH:mm format */
  startTime: string;
  /** End time in HH:mm format */
  endTime: string;
  /** Room where the class is held */
  room: string;
  /** Instructor name */
  teacher: string;
}

/**
 * Availability status for a room
 */
export interface RoomAvailability {
  /** Room information */
  room: Room;
  /** Whether the room is currently available */
  isAvailable: boolean;
  /** Next available time (if currently occupied) */
  nextAvailableAt?: string;
  /** Current booking details (if occupied) */
  currentBooking?: Timing;
}

// ============================================================================
// SCHEDULE TYPES
// ============================================================================

/**
 * Room schedule data for graph visualization
 */
export interface RoomScheduleData {
  /** Room identifier */
  room: string;
  /** Availability array (1 = available, 0 = occupied) for each time slot */
  availability: number[];
}

/**
 * Schedule data for a specific day
 */
export interface DaySchedule {
  /** Day of the week */
  day: string;
  /** All rooms and their schedules for this day */
  rooms: RoomScheduleData[];
}

/**
 * Complete weekly schedule
 */
export type WeeklySchedule = DaySchedule[];

// ============================================================================
// UI STATE TYPES
// ============================================================================

/**
 * Loading state for async operations
 */
export type LoadingState = "idle" | "loading" | "success" | "error";

/**
 * Size variants for components
 */
export type SizeVariant = "small" | "medium" | "large";

/**
 * Time format preference
 */
export type TimeFormat = "12h" | "24h";

/**
 * Grouping mode for graphs
 */
export type GroupingMode = "rooms" | "date";

/**
 * Selection mode for filters
 */
export type SelectionMode = "range" | "individual";

// ============================================================================
// USER PREFERENCES
// ============================================================================

/**
 * User preferences stored in localStorage or database
 */
export interface UserPreferences {
  /** Preferred time format */
  timeFormat: TimeFormat;
  /** Whether onboarding has been completed */
  onboardingCompleted: boolean;
  /** Recently searched rooms */
  recentSearches: string[];
}

// ============================================================================
// SEARCH TYPES
// ============================================================================

/**
 * Search query parameters
 */
export interface SearchQuery {
  /** Search term */
  query: string;
  /** Fuzzy search threshold (0-1, lower = stricter) */
  threshold?: number;
  /** Maximum number of results */
  limit?: number;
}

/**
 * Search result item
 */
export interface SearchResult<T> {
  /** The matched item */
  item: T;
  /** Relevance score (0-1, higher = better match) */
  score?: number;
}

// ============================================================================
// AVAILABILITY CHECK TYPES
// ============================================================================

/**
 * Conflict details when a room is occupied
 */
export interface ConflictDetails {
  /** Subject being taught */
  subject: string;
  /** Class start time */
  startTime: string;
  /** Class end time */
  endTime: string;
  /** Room location */
  room: string;
  /** Type of class */
  classType: string;
}

/**
 * Result of an availability check
 */
export interface AvailabilityCheckResult {
  /** Whether the room is available */
  available: boolean;
  /** Details of what was checked */
  checked: {
    roomName: string;
    date: string;
    startTime: string;
    endTime: string;
  };
  /** Conflicting classes (if unavailable) */
  classes?: ConflictDetails[];
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

/**
 * Analytics event data
 */
export interface AnalyticsEvent {
  /** Event category */
  category: string;
  /** Event action */
  action: string;
  /** Event label (optional) */
  label?: string;
  /** Event value (optional) */
  value?: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Standard error response format
 */
export interface ErrorResponse {
  /** Error message */
  error: string;
  /** Error code (optional) */
  code?: string;
  /** Additional error details */
  details?: Record<string, any>;
  /** Request ID for debugging */
  requestId?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Make all properties of T optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extract values from a readonly array type
 */
export type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;

/**
 * Nullable type helper
 */
export type Nullable<T> = T | null;

/**
 * Optional type helper
 */
export type Optional<T> = T | undefined;
