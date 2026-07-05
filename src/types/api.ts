/**
 * API-specific type definitions and Zod validation schemas
 *
 * This file contains types for API requests/responses and their
 * corresponding Zod schemas for runtime validation.
 */

import { z } from "zod";

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

/**
 * Schema for room data
 */
export const RoomSchema = z.object({
  name: z.string().min(1, "Room name is required"),
  building: z.string().min(1, "Building is required"),
  roomNumber: z.string(),
  campus: z.string().nullable(),
  capacity: z.number().int().positive().nullable(),
});

/**
 * Schema for availability check request
 */
export const AvailabilityCheckRequestSchema = z
  .object({
    roomName: z.string().min(1, "Room name is required"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Start time must be in HH:mm format"),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "End time must be in HH:mm format"),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

/**
 * Schema for conflict details
 */
export const ConflictDetailsSchema = z.object({
  subject: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  room: z.string(),
  classType: z.string(),
});

/**
 * Schema for availability check response
 */
export const AvailabilityCheckResponseSchema = z.object({
  available: z.boolean(),
  checked: z.object({
    roomName: z.string(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
  }),
  classes: z.array(ConflictDetailsSchema).optional(),
});

/**
 * Schema for room schedule data
 */
export const RoomScheduleDataSchema = z.object({
  room: z.string(),
  campus: z.string().nullable().optional(),
  availability: z.array(z.number().int().min(0).max(1)),
});

/**
 * Schema for a single date's schedule
 */
export const DayScheduleSchema = z.object({
  /** ISO date key, e.g. "2026-01-26" */
  date: z.string(),
  /** Weekday label for display, e.g. "Monday" */
  day: z.string(),
  rooms: z.array(RoomScheduleDataSchema),
});

/**
 * Schema for weekly schedule (array of day schedules)
 */
export const WeeklyScheduleSchema = z.array(DayScheduleSchema);

/**
 * Schema for error responses
 */
export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.any()).optional(),
  requestId: z.string().optional(),
});

// ============================================================================
// API REQUEST TYPES
// ============================================================================

/**
 * Request body for checking room availability
 */
export type AvailabilityCheckRequest = z.infer<
  typeof AvailabilityCheckRequestSchema
>;

/**
 * Request parameters for room search
 */
export interface RoomSearchRequest {
  /** Search query string */
  query?: string;
  /** Limit number of results */
  limit?: number;
}

/**
 * Request parameters for available soon endpoint
 */
export interface AvailableSoonRequest {
  /** Time offset in minutes (30, 60, 90, 120) */
  offsetMinutes?: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Response from availability check endpoint
 */
export type AvailabilityCheckResponse = z.infer<
  typeof AvailabilityCheckResponseSchema
>;

/**
 * Response from available now endpoint
 */
export interface AvailableNowResponse {
  /** Timestamp when availability was checked */
  checkedAt: string;
  /** Campuses used for the query */
  campuses: string[];
  /** List of currently available rooms */
  rooms: Array<{
    name: string;
    building: string;
    roomNumber: string;
    campus: string | null;
    capacity: number | null;
  }>;
}

/**
 * Response from available soon endpoint
 */
export interface AvailableSoonResponse {
  /** Timestamp when availability was checked */
  checkedAt: string;
  /** Campuses used for the query */
  campuses: string[];
  /** Offset used for calculation */
  offsetMinutes: number;
  /** Target time after offset */
  targetTime: string;
  /** List of rooms that will be available soon */
  rooms: Array<{
    name: string;
    building: string;
    roomNumber: string;
    campus: string | null;
    capacity: number | null;
    /** When the room becomes available */
    availableAt?: string;
  }>;
}

/**
 * Response from rooms list endpoint
 */
export interface RoomsListResponse {
  /** Total number of rooms */
  total: number;
  /** List of rooms */
  rooms: Array<{
    name: string;
    building: string;
    roomNumber: string;
    campus: string | null;
    capacity: number | null;
  }>;
  /** Pagination info (if applicable) */
  pagination?: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Response from schedule endpoint
 */
export type ScheduleResponse = z.infer<typeof WeeklyScheduleSchema>;

/**
 * Standard error response
 */
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ============================================================================
// API SUCCESS WRAPPER
// ============================================================================

/**
 * Generic success response wrapper
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  requestId?: string;
  timestamp?: string;
}

/**
 * Generic error response wrapper
 */
export interface ApiErrorResponse {
  success: false;
  error: ErrorResponse;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Extract the data type from an API response
 */
export type ExtractData<T> = T extends ApiSuccessResponse<infer U> ? U : never;

/**
 * Type guard to check if response is successful
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>,
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse(
  response: ApiResponse,
): response is ApiErrorResponse {
  return response.success === false;
}
