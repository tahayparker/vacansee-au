"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
}

export function JrEventBlock({
  booking,
  top,
  height,
  leftPct = 0,
  widthPct = 100,
  showRoomLabel = true,
}: JrEventBlockProps) {
  const durationMinutes =
    timeStringToMinutes(booking.endTime) - timeStringToMinutes(booking.startTime);
  const isHourOrLess = durationMinutes <= 60;

  const showClassType = height >= 48;
  const showBottomLine = showRoomLabel && height >= 62;

  const timeLine = isHourOrLess
    ? `${booking.startTime}–${booking.endTime} · ${booking.campus}`
    : `${booking.startTime}–${booking.endTime}`;
  const bottomLine = isHourOrLess
    ? booking.room
    : `${booking.room} · ${booking.campus}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
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
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        className="w-64 bg-black/80 backdrop-blur-md border-white/20 text-white text-sm space-y-1.5"
      >
        <p className="font-semibold text-purple-300">{booking.subjectCode}</p>
        <p className="text-gray-300">{booking.classType}</p>
        <p className="text-gray-300">
          {booking.startTime} – {booking.endTime}
        </p>
        <p className="text-gray-400">
          {booking.room} · {booking.campus}
        </p>
      </PopoverContent>
    </Popover>
  );
}
