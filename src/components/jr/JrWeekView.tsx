import { format } from "date-fns";
import { JrRoomLane } from "@/components/jr/JrRoomLane";
import { JrTimeGutter } from "@/components/jr/JrTimeGutter";
import { formatDateKey } from "@/services/jrScheduleService";
import type { JrBooking } from "@/types/jr";

interface JrWeekViewProps {
  bookingIndex: Map<string, Map<string, JrBooking[]>>;
  dates: Date[];
  rooms: string[];
}

const MIN_COLUMN_WIDTH = 150;

export function JrWeekView({ bookingIndex, dates, rooms }: JrWeekViewProps) {
  if (rooms.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        Select at least one room to see its schedule.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="flex w-full">
        <div className="sticky left-0 top-0 z-20 w-14 shrink-0 bg-black/40 backdrop-blur-xl" />
        {dates.map((date) => (
          <div
            key={date.toISOString()}
            style={{ minWidth: rooms.length * MIN_COLUMN_WIDTH }}
            className="sticky top-0 z-10 flex h-8 flex-1 items-center justify-center border-l border-white/10 bg-black/40 text-sm font-medium text-white backdrop-blur-xl"
          >
            {format(date, "EEE d MMM")}
          </div>
        ))}
      </div>
      <div className="flex w-full">
        <div className="sticky left-0 top-8 z-20 w-14 shrink-0 bg-black/40 backdrop-blur-xl" />
        {dates.map((date) =>
          rooms.map((room) => (
            <div
              key={`${date.toISOString()}-${room}`}
              style={{ minWidth: MIN_COLUMN_WIDTH }}
              className="sticky top-8 z-10 flex h-7 flex-1 items-center justify-center border-l border-white/5 bg-black/40 text-xs text-gray-400 backdrop-blur-xl"
            >
              {room}
            </div>
          )),
        )}
      </div>
      <div className="flex w-full">
        <JrTimeGutter />
        {dates.map((date) =>
          rooms.map((room) => (
            <div
              key={`${date.toISOString()}-${room}-lane`}
              style={{ minWidth: MIN_COLUMN_WIDTH }}
              className="flex-1"
            >
              <JrRoomLane
                bookingIndex={bookingIndex}
                dateKey={formatDateKey(date)}
                room={room}
              />
            </div>
          )),
        )}
      </div>
    </div>
  );
}
