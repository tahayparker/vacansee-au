import { JrEventBlock } from "@/components/jr/JrEventBlock";
import {
  ROW_HEIGHT_PX,
  TOTAL_GRID_HEIGHT_PX,
  WORK_DAY_SLOTS,
  getBookingsForDateRoom,
  getEventPixelStyle,
  layoutOverlappingBookings,
} from "@/services/jrScheduleService";
import type { JrBooking } from "@/types/jr";

interface JrRoomLaneProps {
  bookingIndex: Map<string, Map<string, JrBooking[]>>;
  dateKey: string;
  room: string;
  showRoomLabel?: boolean;
}

/** A single room's bookings for a single date, rendered as an event lane. */
export function JrRoomLane({
  bookingIndex,
  dateKey,
  room,
  showRoomLabel = true,
}: JrRoomLaneProps) {
  const bookings = getBookingsForDateRoom(bookingIndex, dateKey, room);
  const laidOut = layoutOverlappingBookings(bookings);

  return (
    <div
      className="relative flex-1 border-l border-b border-white/10"
      style={{ height: TOTAL_GRID_HEIGHT_PX }}
    >
      {WORK_DAY_SLOTS.map((slot, i) => (
        <div
          key={slot}
          style={{ height: ROW_HEIGHT_PX }}
          className={i % 2 === 0 ? "border-t border-white/15" : "border-t border-white/5"}
        />
      ))}
      {laidOut.map(({ booking, column, columnCount }, i) => {
        const style = getEventPixelStyle(booking.startTime, booking.endTime);
        if (!style) return null;
        const widthPct = 100 / columnCount;
        return (
          <JrEventBlock
            key={`${booking.subjectCode}-${booking.startTime}-${i}`}
            booking={booking}
            top={style.top}
            height={style.height}
            leftPct={column * widthPct}
            widthPct={widthPct}
            showRoomLabel={showRoomLabel}
          />
        );
      })}
    </div>
  );
}
