import { JrRoomLane } from "@/components/jr/JrRoomLane";
import { JrTimeGutter } from "@/components/jr/JrTimeGutter";
import type { JrBooking } from "@/types/jr";

interface JrDayViewProps {
  bookingIndex: Map<string, Map<string, JrBooking[]>>;
  dateKey: string;
  rooms: string[];
  onSelectBooking?: (booking: JrBooking) => void;
}

const MIN_COLUMN_WIDTH = 220;

export function JrDayView({
  bookingIndex,
  dateKey,
  rooms,
  onSelectBooking,
}: JrDayViewProps) {
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
        {rooms.map((room) => (
          <div
            key={room}
            style={{ minWidth: MIN_COLUMN_WIDTH }}
            className="sticky top-0 z-10 flex-1 border-l border-white/10 bg-black/40 px-2 py-2 text-center text-sm font-medium text-white backdrop-blur-xl"
          >
            {room}
          </div>
        ))}
      </div>
      <div className="flex w-full">
        <JrTimeGutter />
        {rooms.map((room) => (
          <div
            key={room}
            style={{ minWidth: MIN_COLUMN_WIDTH }}
            className="flex-1"
          >
            <JrRoomLane
              bookingIndex={bookingIndex}
              dateKey={dateKey}
              room={room}
              onSelectBooking={onSelectBooking}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
