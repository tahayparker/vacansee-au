"use client";

import { timeStringToMinutes } from "@/services/jrScheduleService";
import type { JrBooking } from "@/types/jr";

interface JrEventBlockProps {
  booking: JrBooking;
  top: number;
  height: number;
  /** Left offset as a % of the lane width (for side-by-side overlaps). */
  leftPct?: number;
  /** Width as a % of the lane width (for side-by-side overlaps). */
  widthPct?: number;
  showRoomLabel?: boolean;
  onSelect?: (booking: JrBooking) => void;
}

export function JrEventBlock({
  booking,
  top,
  height,
  leftPct = 0,
  widthPct = 100,
  showRoomLabel = true,
  onSelect,
}: JrEventBlockProps) {
  const durationMinutes =
    timeStringToMinutes(booking.endTime) -
    timeStringToMinutes(booking.startTime);
  const isHourOrLess = durationMinutes <= 60;

  const showClassType = height >= 48;
  const showBottomLine = showRoomLabel && height >= 62;

  const timeLine = isHourOrLess
    ? `${booking.startTime}\u2013${booking.endTime} \u00b7 ${booking.campus}`
    : `${booking.startTime}\u2013${booking.endTime}`;
  const bottomLine = isHourOrLess
    ? booking.room
    : `${booking.room} \u00b7 ${booking.campus}`;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(booking)}
      style={{
        top: top + 1,
        height: height - 2,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
      }}
      className="absolute overflow-hidden rounded-md border-l-[3px] border-purple-400 bg-purple-950/85 px-1.5 py-1 text-left text-white shadow-sm transition-colors hover:bg-purple-900/90"
    >
      <p className="truncate text-[13px] font-bold leading-tight">
        {booking.subjectCode}
      </p>
      {showClassType && (
        <p className="truncate text-[11px] leading-tight text-purple-200/90">
          {booking.classType}
        </p>
      )}
      <p className="truncate text-[11px] leading-tight text-purple-200/80">
        {timeLine}
      </p>
      {showBottomLine && (
        <p className="truncate text-[11px] leading-tight text-purple-200/80">
          {bottomLine}
        </p>
      )}
    </button>
  );
}
