"use client";

import { useEffect, useState } from "react";
import { isWeekend } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { CampusMultiSelect } from "@/components/CampusMultiSelect";
import { RoomMultiSelect } from "@/components/jr/RoomMultiSelect";
import type { UowCampus } from "@/constants";
import type { Room } from "@/types/shared";

interface JrSidebarProps {
  anchorDate: Date;
  onGoToDate: (date: Date) => void;
  campuses: UowCampus[];
  onCampusesChange: (campuses: UowCampus[]) => void;
  rooms: Room[];
  roomsLoading: boolean;
  selectedRooms: string[];
  onSelectedRoomsChange: (rooms: string[]) => void;
  includeWeekends: boolean;
  onIncludeWeekendsChange: (value: boolean) => void;
}

export function JrSidebar({
  anchorDate,
  onGoToDate,
  campuses,
  onCampusesChange,
  rooms,
  roomsLoading,
  selectedRooms,
  onSelectedRoomsChange,
  includeWeekends,
  onIncludeWeekendsChange,
}: JrSidebarProps) {
  const roomsForSelectedCampuses =
    campuses.length === 0
      ? rooms
      : rooms.filter(
          (room) => room.campus === null || campuses.includes(room.campus as UowCampus),
        );

  // Keeps the mini calendar's displayed month in sync with whatever date the
  // main calendar is currently showing (e.g. after using the header's
  // prev/next/today controls, or selecting a day in month view), while still
  // letting the user freely page the mini calendar without affecting it.
  const [displayMonth, setDisplayMonth] = useState(anchorDate);
  useEffect(() => {
    setDisplayMonth(anchorDate);
  }, [anchorDate]);

  return (
    <div className="flex h-full w-full flex-col gap-5 overflow-y-auto p-4 lg:w-80 lg:shrink-0 lg:border-r lg:border-white/10">
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
          Date
        </label>
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={anchorDate}
            onSelect={(date) => date && onGoToDate(date)}
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            weekStartsOn={1}
            showYearSwitcher
            modifiers={{ weekend: isWeekend }}
            modifiersClassNames={{ weekend: "text-gray-500" }}
            className="bg-transparent p-0 text-white [--cell-size:2.375rem]"
            classNames={{
              today: "rounded-md text-white ring-1 ring-inset ring-purple-400/60",
              outside: "text-gray-500 aria-selected:text-gray-500",
            }}
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
          Campus
        </label>
        <CampusMultiSelect
          variant="button"
          selected={campuses}
          onChange={onCampusesChange}
        />
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
          Rooms
        </label>
        <RoomMultiSelect
          rooms={roomsForSelectedCampuses}
          selected={selectedRooms}
          onChange={onSelectedRoomsChange}
          isLoading={roomsLoading}
        />
      </div>

      <div className="flex items-center justify-between rounded-md border border-white/20 bg-black/20 px-3 py-2.5">
        <span className="text-sm text-white">Show weekends</span>
        <Switch
          checked={includeWeekends}
          onCheckedChange={onIncludeWeekendsChange}
          className="data-[state=checked]:bg-purple-500"
        />
      </div>
    </div>
  );
}
