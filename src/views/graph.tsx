"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  pageContainerVariants,
  headerSectionVariants,
  tableRowVariants,
  fadeVariants,
} from "@/lib/animations";
import { isWeekend } from "date-fns";
import { AlertCircle, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTimeFormat } from "@/contexts/TimeFormatContext";
import { formatTime } from "@/lib/utils";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { CampusMultiSelect } from "@/components/CampusMultiSelect";
import { useTemporaryCampusFilter } from "@/hooks/useTemporaryCampusFilter";
import { formatDateKey, parseDateKey } from "@/services/jrScheduleService";
import { getRoomDisplayLabel, compareRoomsByBuilding } from "@/services/roomParsing";
import { SCHEDULE_SLOT_LABELS, type UowCampus } from "@/constants";

interface FrontendRoomData {
  room: string;
  campus?: string | null;
  availability: number[];
}

interface FrontendScheduleDay {
  date: string;
  day: string;
  rooms: FrontendRoomData[];
}

const timeIntervals = [...SCHEDULE_SLOT_LABELS];

export default function GraphPage() {
  const { loading: authLoading, isAuthenticated } = useRequireAuth();
  const { selectedCampuses, setSelectedCampuses, campusReady } =
    useTemporaryCampusFilter();

  const [scheduleData, setScheduleData] = useState<FrontendScheduleDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [displayMonth, setDisplayMonth] = useState<Date>(() => new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { use24h } = useTimeFormat();

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetch("/api/schedule")
      .then((response) => {
        if (!response.ok) {
          return response
            .json()
            .then((errData) => {
              throw new Error(
                errData.error || `HTTP error! status: ${response.status}`,
              );
            })
            .catch(() => {
              throw new Error(`HTTP error! status: ${response.status}`);
            });
        }
        return response.json();
      })
      .then((data) => {
        const normalized: FrontendScheduleDay[] = data
          .filter(
            (entry: FrontendScheduleDay) =>
              entry?.date && /^\d{4}-\d{2}-\d{2}$/.test(entry.date),
          )
          .map((entry: FrontendScheduleDay) => ({
            date: entry.date,
            day: entry.day || entry.date,
            rooms: entry.rooms ?? [],
          }));

        if (normalized.length === 0) {
          throw new Error("No date-keyed schedule data available");
        }

        setScheduleData(normalized);
      })
      .catch((fetchError) => {
        console.error("Error fetching schedule:", fetchError);
        setError(fetchError.message || "Failed to load schedule.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const availableDates = useMemo(
    () => scheduleData.map((d) => d.date).sort(),
    [scheduleData],
  );

  useEffect(() => {
    if (selectedDate !== null || availableDates.length === 0) return;
    const todayKey = formatDateKey(new Date());
    setSelectedDate(
      availableDates.find((d) => d >= todayKey) ?? availableDates[0],
    );
  }, [availableDates, selectedDate]);

  useEffect(() => {
    if (selectedDate) {
      setDisplayMonth(parseDateKey(selectedDate));
    }
  }, [selectedDate]);

  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null;
    return scheduleData.find((d) => d.date === selectedDate) ?? null;
  }, [scheduleData, selectedDate]);

  const filteredRooms = useMemo(() => {
    if (!selectedDayData) return [];
    return selectedDayData.rooms.filter((room) => {
      if (!room?.room) return false;
      if (selectedCampuses.length === 0) return true;
      const campus = room.campus ?? "";
      return campus && selectedCampuses.includes(campus as UowCampus);
    });
  }, [selectedDayData, selectedCampuses]);

  const getCellColor = (avail: number) => {
    return avail === 1 ? "bg-green-500/70" : "bg-red-600/80";
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const selectedDateLabel = selectedDate
    ? parseDateKey(selectedDate).toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <motion.div
      variants={pageContainerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-full mx-auto px-0 py-6 pt-20 md:pt-24 flex flex-col h-screen"
    >
      <motion.div
        variants={headerSectionVariants}
        className="px-4 md:px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 flex-shrink-0"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-center md:text-left text-white flex-shrink-0">
          Room Availability Graph
        </h1>
        <div className="flex items-center justify-center md:justify-end gap-2 flex-grow">
          <CampusMultiSelect
            variant="button"
            selected={selectedCampuses}
            onChange={setSelectedCampuses}
            disabled={!campusReady}
            className="w-full sm:w-[180px]"
          />
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                disabled={availableDates.length === 0}
                className="w-full sm:w-[220px] justify-between border border-white/20 bg-black/20 hover:bg-black/30 hover:border-white/30 text-white font-normal disabled:opacity-70"
              >
                <span className="truncate">
                  {selectedDateLabel ?? "Select a date"}
                </span>
                <CalendarDays className="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-auto p-0 bg-black/80 backdrop-blur-md border-white/20"
            >
              <Calendar
                mode="single"
                selected={selectedDate ? parseDateKey(selectedDate) : undefined}
                onSelect={(date) => {
                  if (!date) return;
                  setSelectedDate(formatDateKey(date));
                  setDatePickerOpen(false);
                }}
                month={displayMonth}
                onMonthChange={setDisplayMonth}
                weekStartsOn={1}
                showYearSwitcher
                modifiers={{ weekend: isWeekend }}
                modifiersClassNames={{ weekend: "text-white/70" }}
                className="p-3 text-white [--cell-size:2.375rem]"
                classNames={{
                  today:
                    "rounded-md text-white ring-1 ring-inset ring-purple-400/60",
                  outside: "text-gray-500 aria-selected:text-gray-500",
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loader-graph"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-grow items-center justify-center pt-10"
          >
            <LoadingSpinner size="large" />
          </motion.div>
        ) : error ? (
          <motion.div
            key="error-graph"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-7xl mx-auto px-4 py-10 text-center pt-10"
          >
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-6 text-red-300 max-w-md mx-auto flex flex-col items-center gap-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="font-medium">Error loading schedule:</p>
              <p className="text-sm">{error}</p>
            </div>
          </motion.div>
        ) : filteredRooms.length > 0 ? (
          <motion.div
            key={`table-container-${selectedDate}`}
            variants={fadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative flex-grow flex flex-col min-h-0 px-4 pb-4"
          >
            <div className="w-full overflow-auto flex-grow min-h-0 hide-scrollbar border-l border-t border-b border-white/15 rounded-lg shadow-lg bg-black/20 backdrop-blur-sm">
              <table className="border-separate border-spacing-0 w-full min-w-[1400px]">
                <thead className="sticky top-0 z-30">
                  <tr>
                    <th className="sticky left-0 top-0 bg-black text-white z-40 px-3 py-3 border-r border-b border-white/15 text-right text-sm font-semibold whitespace-nowrap">
                      Room
                    </th>
                    {timeIntervals.map((time, index) => (
                      <th
                        key={time}
                        className={`sticky top-0 bg-black text-white z-30 px-3 py-3 border-b border-white/15 text-center text-xs md:text-sm font-medium whitespace-nowrap ${index === timeIntervals.length - 1 ? "" : "border-r border-white/15"}`}
                        style={{ minWidth: "65px" }}
                      >
                        {formatTime(time, use24h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="relative z-0">
                  <AnimatePresence initial={false}>
                    {filteredRooms
                      .sort((a, b) => compareRoomsByBuilding(a.room, b.room))
                      .map((roomData, roomIndex) => (
                        <motion.tr
                          key={roomData.room}
                          custom={roomIndex}
                          variants={tableRowVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          layout="position"
                          className="group"
                        >
                          <td className="sticky left-0 bg-black group-hover:bg-zinc-900 text-white z-20 px-3 py-1.5 border-r border-b border-white/10 text-right text-sm whitespace-nowrap transition-colors duration-100">
                            <div className="flex flex-col items-end gap-0.5">
                              <span>{getRoomDisplayLabel(roomData.room)}</span>
                              {roomData.campus && (
                                <span className="text-xs text-gray-400">
                                  {roomData.campus}
                                </span>
                              )}
                            </div>
                          </td>
                          {Array.from({ length: timeIntervals.length }, (_, idx) => {
                            const avail = roomData.availability[idx] ?? 0;
                            return (
                              <td
                                key={idx}
                                className={`relative z-0 border-b border-black/50 ${getCellColor(avail)} transition-colors duration-150 group-hover:brightness-110 ${idx === timeIntervals.length - 1 ? "" : "border-r border-black/100"}`}
                                title={`${getRoomDisplayLabel(roomData.room)} - ${timeIntervals[idx]} - ${avail === 1 ? "Available" : "Occupied"}`}
                                style={{ minWidth: "65px" }}
                              >
                                <div className="h-6"></div>
                              </td>
                            );
                          })}
                        </motion.tr>
                      ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.p
            key="empty-graph"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-gray-400 py-10 px-4"
          >
            {selectedCampuses.length === 0
              ? "Select at least one campus to view rooms."
              : `No schedule data available for ${selectedDateLabel ?? "the selected date"}.`}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
