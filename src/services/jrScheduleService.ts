/**
 * JR Schedule Service
 *
 * Pure helpers for the `/jr` Outlook-style room calendar: building an
 * in-memory booking index, computing day/week/month ranges, and mapping
 * bookings to pixel positions within the 07:00-17:00 workday grid.
 *
 * All calendar dates are plain "yyyy-MM-dd" strings (matching
 * `AU-Timings.Date`) parsed/formatted with date-fns in local time, so
 * round-tripping is stable regardless of the browser's timezone.
 */

import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { JrBooking, JrCalendarView } from "@/types/jr";

export const WORK_START_MINUTES = 7 * 60; // 07:00
export const WORK_END_MINUTES = 17 * 60; // 17:00
export const WORK_DAY_MINUTES = WORK_END_MINUTES - WORK_START_MINUTES;
export const SLOT_MINUTES = 30;

/** Half-hour slot start times across the workday, e.g. ["07:00", "07:30", ..., "16:30"]. */
export const WORK_DAY_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (
    let minutes = WORK_START_MINUTES;
    minutes < WORK_END_MINUTES;
    minutes += SLOT_MINUTES
  ) {
    slots.push(minutesToTimeString(minutes));
  }
  return slots;
})();

export function minutesToTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function timeStringToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Parse a "yyyy-MM-dd" string into a local-time Date (no timezone shift). */
export function parseDateKey(dateKey: string): Date {
  return parse(dateKey, "yyyy-MM-dd", new Date());
}

/** Format a Date into a "yyyy-MM-dd" key using local time. */
export function formatDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Position (top/height as % of the workday) for a booking within the grid.
 * Clamped to the 07:00-17:00 window; returns null if fully outside it.
 */
export function getEventPosition(
  startTime: string,
  endTime: string,
): { topPct: number; heightPct: number } | null {
  const start = Math.max(timeStringToMinutes(startTime), WORK_START_MINUTES);
  const end = Math.min(timeStringToMinutes(endTime), WORK_END_MINUTES);
  if (end <= WORK_START_MINUTES || start >= WORK_END_MINUTES || end <= start) {
    return null;
  }
  return {
    topPct: ((start - WORK_START_MINUTES) / WORK_DAY_MINUTES) * 100,
    heightPct: ((end - start) / WORK_DAY_MINUTES) * 100,
  };
}

/** Pixel height of each half-hour row in the time grid. */
export const ROW_HEIGHT_PX = 48;

/** Total pixel height of the 07:00-17:00 grid (20 rows). */
export const TOTAL_GRID_HEIGHT_PX = WORK_DAY_SLOTS.length * ROW_HEIGHT_PX;

/** Pixel top/height for a booking within the fixed-height time grid. */
export function getEventPixelStyle(
  startTime: string,
  endTime: string,
): { top: number; height: number } | null {
  const position = getEventPosition(startTime, endTime);
  if (!position) return null;
  return {
    top: (position.topPct / 100) * TOTAL_GRID_HEIGHT_PX,
    height: Math.max((position.heightPct / 100) * TOTAL_GRID_HEIGHT_PX, 34),
  };
}

/** Build a date -> room -> bookings index for O(1) range lookups. */
export function buildBookingIndex(
  bookings: JrBooking[],
): Map<string, Map<string, JrBooking[]>> {
  const index = new Map<string, Map<string, JrBooking[]>>();
  for (const booking of bookings) {
    let byRoom = index.get(booking.date);
    if (!byRoom) {
      byRoom = new Map();
      index.set(booking.date, byRoom);
    }
    const list = byRoom.get(booking.room);
    if (list) {
      list.push(booking);
    } else {
      byRoom.set(booking.room, [booking]);
    }
  }
  return index;
}

/** Bookings for a specific date + room, sorted by start time. */
export function getBookingsForDateRoom(
  index: Map<string, Map<string, JrBooking[]>>,
  dateKey: string,
  room: string,
): JrBooking[] {
  const list = index.get(dateKey)?.get(room);
  if (!list) return [];
  return [...list].sort(
    (a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime),
  );
}

export interface LaidOutBooking {
  booking: JrBooking;
  /** 0-based column index within its overlap cluster. */
  column: number;
  /** Total number of side-by-side columns in this booking's overlap cluster. */
  columnCount: number;
}

/**
 * Lay out (possibly overlapping) bookings into side-by-side columns so
 * simultaneous classes in the same room render distinctly instead of
 * stacking into blended, inconsistent-looking blocks.
 */
export function layoutOverlappingBookings(
  bookings: JrBooking[],
): LaidOutBooking[] {
  const sorted = [...bookings].sort(
    (a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime),
  );

  const result: LaidOutBooking[] = [];
  let cluster: { booking: JrBooking; column: number }[] = [];
  let columnEnds: number[] = [];
  let clusterMaxEnd = -Infinity;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const columnCount = columnEnds.length;
    for (const item of cluster) {
      result.push({ booking: item.booking, column: item.column, columnCount });
    }
    cluster = [];
    columnEnds = [];
    clusterMaxEnd = -Infinity;
  };

  for (const booking of sorted) {
    const start = timeStringToMinutes(booking.startTime);
    const end = timeStringToMinutes(booking.endTime);

    if (cluster.length > 0 && start >= clusterMaxEnd) {
      flushCluster();
    }

    let column = columnEnds.findIndex((colEnd) => colEnd <= start);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(end);
    } else {
      columnEnds[column] = end;
    }

    cluster.push({ booking, column });
    clusterMaxEnd = Math.max(clusterMaxEnd, end);
  }
  flushCluster();

  return result;
}

/** Weekday dates (Mon-Fri, optionally +Sat/Sun) for the week containing `anchor`. */
export function getWeekDates(anchor: Date, includeWeekends: boolean): Date[] {
  const monday = startOfWeek(anchor, { weekStartsOn: 1 });
  const dayCount = includeWeekends ? 7 : 5;
  return Array.from({ length: dayCount }, (_, i) => addDays(monday, i));
}

/** Full month grid (complete weeks) for the month containing `anchor`. */
export function getMonthGridDates(anchor: Date): Date[] {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function isCurrentMonth(date: Date, anchor: Date): boolean {
  return isSameMonth(date, anchor);
}

/** Move the anchor date forward/backward by one unit of the given view. */
export function shiftAnchorDate(
  anchor: Date,
  view: JrCalendarView,
  direction: 1 | -1,
): Date {
  if (view === "day") return addDays(anchor, direction);
  if (view === "week") return addWeeks(anchor, direction);
  return addMonths(anchor, direction);
}

/** Contextual header title for the current view + anchor date. */
export function formatCalendarHeaderTitle(
  anchor: Date,
  view: JrCalendarView,
  includeWeekends: boolean,
): string {
  if (view === "day") {
    return format(anchor, "EEEE, d MMMM yyyy");
  }
  if (view === "month") {
    return format(anchor, "MMMM yyyy");
  }
  const dates = getWeekDates(anchor, includeWeekends);
  const first = dates[0];
  const last = dates[dates.length - 1];
  const sameMonth = isSameMonth(first, last);
  const firstLabel = format(first, sameMonth ? "d" : "d MMM");
  const lastLabel = format(last, "d MMM yyyy");
  return `${firstLabel} \u2013 ${lastLabel}`;
}
