import {
  ROW_HEIGHT_PX,
  TOTAL_GRID_HEIGHT_PX,
  WORK_DAY_SLOTS,
} from "@/services/jrScheduleService";

/** Sticky time-of-day labels aligned to the 07:00-17:00 half-hour grid rows. */
export function JrTimeGutter() {
  return (
    <div
      className="sticky left-0 z-10 w-14 shrink-0 bg-black/40 backdrop-blur-xl"
      style={{ height: TOTAL_GRID_HEIGHT_PX }}
    >
      <div className="relative h-full">
        {WORK_DAY_SLOTS.map((slot, i) =>
          i % 2 === 0 ? (
            <span
              key={slot}
              style={{ top: i * ROW_HEIGHT_PX + 4 }}
              className="absolute right-2 text-[10px] leading-none text-gray-400 tabular-nums"
            >
              {slot}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}
