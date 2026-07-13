"use client";

import { format, isToday, isWeekend } from "date-fns";
import { cn } from "@/lib/utils";
import {
  formatDateKey,
  getBookingsForDateRoom,
  isCurrentMonth,
  timeStringToMinutes,
} from "@/services/jrScheduleService";
import type { JrBooking } from "@/types/jr";

interface JrMonthViewProps {
  bookingIndex: Map<string, Map<string, JrBooking[]>>;
  dates: Date[];
  rooms: string[];
  anchorDate: Date;
  includeWeekends: boolean;
  onSelectDay: (date: Date) => void;
}

const MAX_VISIBLE_EVENTS = 3;

export function JrMonthView({
  bookingIndex,
  dates,
  rooms,
  anchorDate,
  includeWeekends,
  onSelectDay,
}: JrMonthViewProps) {
  const weekRowCount = Math.ceil(dates.length / 7);

  if (rooms.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        Select at least one room to see its schedule.
      </div>
    );
  }

  return (
    <div
      className="grid h-full grid-cols-7 gap-px overflow-auto bg-white/5"
      style={{ gridTemplateRows: `auto repeat(${weekRowCount}, 1fr)` }}
    >
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
        <div
          key={label}
          className="bg-black/40 py-1.5 text-center text-xs font-medium uppercase tracking-wide text-gray-400 backdrop-blur-xl"
        >
          {label}
        </div>
      ))}
      {dates.map((date) => {
        const dateKey = formatDateKey(date);
        const dayBookings = rooms
          .flatMap((room) =>
            getBookingsForDateRoom(bookingIndex, dateKey, room).map(
              (booking) => ({
                booking,
                room,
              }),
            ),
          )
          .sort(
            (a, b) =>
              timeStringToMinutes(a.booking.startTime) -
              timeStringToMinutes(b.booking.startTime),
          );
        const weekend = isWeekend(date);
        const dimmed = weekend && !includeWeekends;
        const visible = dayBookings.slice(0, MAX_VISIBLE_EVENTS);
        const extraCount = dayBookings.length - visible.length;

        return (
          <button
            key={dateKey}
            type="button"
            onClick={() => onSelectDay(date)}
            className={cn(
              "flex min-h-24 flex-col items-stretch gap-1 bg-black/20 p-1.5 text-left transition-colors hover:bg-white/10",
              !isCurrentMonth(date, anchorDate) && "opacity-40",
              dimmed && "bg-black/10",
            )}
          >
            <span
              className={cn(
                "flex size-6 items-center justify-center self-start rounded-full text-xs text-white",
                isToday(date) && "bg-purple-600/80 font-semibold",
              )}
            >
              {format(date, "d")}
            </span>
            <div className="flex flex-col gap-0.5">
              {visible.map(({ booking, room }, i) => (
                <span
                  key={`${dateKey}-${room}-${booking.startTime}-${i}`}
                  className="truncate rounded bg-purple-600/70 px-1 py-0.5 text-[10px] leading-tight text-white"
                >
                  {booking.startTime} {booking.subjectCode}
                  {rooms.length > 1 ? ` · ${room}` : ""}
                </span>
              ))}
              {extraCount > 0 && (
                <span className="px-1 text-[10px] text-purple-300">
                  +{extraCount} more
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
