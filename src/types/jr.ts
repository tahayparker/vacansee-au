/**
 * JR Room Calendar types
 *
 * Domain types for the `/jr` Outlook-style room availability calendar.
 * Bookings are date-specific occurrences sourced from `AU-Timings.Date`.
 */

/** A single class occurrence booked into a room on a specific date. */
export interface JrBooking {
  /** ISO date (YYYY-MM-DD) the booking occurs on. */
  date: string;
  /** Room identifier (e.g. "25-153"). */
  room: string;
  /** Campus the room belongs to. */
  campus: string;
  /** Start time in HH:mm format. */
  startTime: string;
  /** End time in HH:mm format. */
  endTime: string;
  /** Subject code (e.g. "ACCY121"). */
  subjectCode: string;
  /** Class type (e.g. "Tutorial", "Lecture"). */
  classType: string;
  /** Free-text booking description (may be empty for regular classes). */
  description: string;
}

/** Response shape for GET /api/jr/bookings. */
export interface JrBookingsResponse {
  /** When this dataset was fetched/cached. */
  fetchedAt: string;
  /** Total number of bookings returned. */
  total: number;
  /** Min/max dates present in the dataset (YYYY-MM-DD), if any. */
  dateRange: { min: string; max: string } | null;
  /** All bookings. */
  bookings: JrBooking[];
}

export type JrCalendarView = "day" | "week" | "month";
