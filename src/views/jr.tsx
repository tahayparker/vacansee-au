"use client";

import { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useTemporaryCampusFilter } from "@/hooks/useTemporaryCampusFilter";
import { useJrSchedule } from "@/hooks/useJrSchedule";
import { JrSidebar } from "@/components/jr/JrSidebar";
import { JrCalendarHeader } from "@/components/jr/JrCalendarHeader";
import { JrDayView } from "@/components/jr/JrDayView";
import { JrWeekView } from "@/components/jr/JrWeekView";
import { JrMonthView } from "@/components/jr/JrMonthView";
import { getCurrentDateString } from "@/services/timeService";
import {
  formatDateKey,
  getMonthGridDates,
  getWeekDates,
  parseDateKey,
  shiftAnchorDate,
} from "@/services/jrScheduleService";
import type { JrCalendarView, JrBooking } from "@/types/jr";

export default function JrCalendarPage() {
  const { loading: authLoading, isAuthenticated } = useRequireAuth();
  const { selectedCampuses, setSelectedCampuses, campusReady } =
    useTemporaryCampusFilter();

  const { rooms, bookingIndex, isLoading, isRefreshing, error, refresh } =
    useJrSchedule(isAuthenticated && campusReady);

  const [view, setView] = useState<JrCalendarView>("day");
  const [anchorDate, setAnchorDate] = useState<Date>(() =>
    parseDateKey(getCurrentDateString()),
  );
  const [includeWeekends, setIncludeWeekends] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<JrBooking | null>(
    null,
  );

  const dateKey = useMemo(() => formatDateKey(anchorDate), [anchorDate]);
  const weekDates = useMemo(
    () => getWeekDates(anchorDate, includeWeekends),
    [anchorDate, includeWeekends],
  );
  const monthDates = useMemo(() => getMonthGridDates(anchorDate), [anchorDate]);

  const handleNavigate = (direction: 1 | -1) => {
    setAnchorDate((prev) => shiftAnchorDate(prev, view, direction));
  };

  const handleToday = () => setAnchorDate(parseDateKey(getCurrentDateString()));

  const handleSelectDay = (date: Date) => {
    setAnchorDate(date);
    setView("day");
  };

  const sidebarProps = {
    anchorDate,
    onGoToDate: setAnchorDate,
    campuses: selectedCampuses,
    onCampusesChange: setSelectedCampuses,
    rooms,
    roomsLoading: isLoading,
    selectedRooms,
    onSelectedRoomsChange: setSelectedRooms,
    includeWeekends,
    onIncludeWeekendsChange: setIncludeWeekends,
    selectedBooking,
    onClearBooking: () => setSelectedBooking(null),
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

  return (
    <div className="flex h-[calc(100dvh-5rem)] w-full flex-col px-3 pt-20 pb-3 md:h-[calc(100dvh-6rem)] md:px-4 md:pt-24 md:pb-4">
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="hidden lg:flex">
          <JrSidebar {...sidebarProps} />
        </div>

        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetContent
            side="left"
            className="w-80 bg-black/95 border-white/10 p-0"
          >
            <SheetTitle className="sr-only">Calendar filters</SheetTitle>
            <JrSidebar {...sidebarProps} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <JrCalendarHeader
            anchorDate={anchorDate}
            view={view}
            includeWeekends={includeWeekends}
            onViewChange={setView}
            onNavigate={handleNavigate}
            onToday={handleToday}
            onRefresh={refresh}
            isRefreshing={isRefreshing}
            onOpenMobileFilters={() => setMobileFiltersOpen(true)}
          />

          <div className="min-h-0 flex-1">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <LoadingSpinner
                  size="large"
                  message="Loading room schedules..."
                />
              </div>
            ) : error ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
                <AlertCircle className="size-8 text-red-400" />
                <p className="text-red-200">{error}</p>
                <Button
                  variant="destructive"
                  onClick={refresh}
                  className="bg-red-600/50 hover:bg-red-600/60"
                >
                  Try Again
                </Button>
              </div>
            ) : view === "day" ? (
              <JrDayView
                bookingIndex={bookingIndex}
                dateKey={dateKey}
                rooms={selectedRooms}
                onSelectBooking={setSelectedBooking}
              />
            ) : view === "week" ? (
              <JrWeekView
                bookingIndex={bookingIndex}
                dates={weekDates}
                rooms={selectedRooms}
                onSelectBooking={setSelectedBooking}
              />
            ) : (
              <JrMonthView
                bookingIndex={bookingIndex}
                dates={monthDates}
                rooms={selectedRooms}
                anchorDate={anchorDate}
                includeWeekends={includeWeekends}
                onSelectDay={handleSelectDay}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
