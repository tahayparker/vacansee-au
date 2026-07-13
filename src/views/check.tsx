"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
// --- Import AlertCircle with other icons ---
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  X,
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronsUpDown,
  CircleX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn, formatTime } from "@/lib/utils";
import {
  format,
  setHours,
  setMinutes,
  startOfDay,
  addMinutes,
  isWeekend,
} from "date-fns";
import { formatDateKey, parseDateKey } from "@/services/jrScheduleService";
import Fuse from "fuse.js";
import { useTimeFormat } from "@/contexts/TimeFormatContext";
import {
  useFormPersistence,
  useSearchPersistence,
} from "@/hooks/useFormPersistence";
import { montserrat } from "@/lib/fonts";
import {
  AriaAttributes,
  KeyboardKeys,
  isKey,
  AriaAnnouncer,
} from "@/lib/accessibility";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useRequireAuth } from "@/hooks/useRequireAuth";

import type { Room } from "@/types/shared";

type RoomListData = Room;
interface ConflictDetails {
  subject: string;
  startTime: string;
  endTime: string;
  room: string;
  classType: string;
}
interface CheckResult {
  available: boolean;
  checked: {
    roomName: string;
    date: string;
    startTime: string;
    endTime: string;
  };
  classes?: ConflictDetails[];
}

const MIN_HOUR = 7;
const MAX_HOUR = 23;

// --- Helper Functions (Unchanged) ---
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  const referenceDate = startOfDay(new Date());
  const start = setMinutes(setHours(referenceDate, MIN_HOUR), 0);
  const end = setMinutes(setHours(referenceDate, MAX_HOUR), 0);
  let current = start;
  while (current <= end) {
    slots.push(format(current, "HH:mm"));
    current = addMinutes(current, 30);
  }
  return slots;
}
const timeSlots = generateTimeSlots();

const resultVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 520, damping: 32, mass: 0.7 },
  },
  exit: { opacity: 0, transition: { duration: 0.08 } },
};

function getSydneyDate(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Australia/Sydney" }),
  );
}

function formatDateLabel(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// --- Main Page Component ---
export default function CheckAvailabilityPage() {
  // Check authentication first
  const { loading: authLoading, isAuthenticated } = useRequireAuth();

  // --- Form persistence ---
  const form = useFormPersistence(
    {
      selectedRoomName: "",
      date: "",
      startTime: "",
      endTime: "",
    },
    {
      debounceDelay: 500,
      persist: true,
      storageKey: "check-availability-form",
      clearOnSubmit: true,
    },
  );

  // --- Search persistence ---
  const search = useSearchPersistence("", {
    debounceDelay: 300,
    persist: true,
    storageKey: "room-search-query",
  });

  // --- Other state ---
  const [selectedRoom, setSelectedRoom] = useState<RoomListData | null>(null);
  const [allRooms, setAllRooms] = useState<RoomListData[]>([]);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState<Date>(() => new Date());
  const [isChecking, setIsChecking] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [roomFetchError, setRoomFetchError] = useState<string | null>(null);
  const { use24h } = useTimeFormat();

  // --- Fetch Rooms (Unchanged) ---
  useEffect(() => {
    const fetchRooms = async () => {
      setIsLoadingRooms(true);
      setRoomFetchError(null);
      setFormError(null);
      try {
        const response = await fetch("/api/rooms");
        if (!response.ok) {
          let errorMsg = "Failed to fetch rooms list";
          try {
            const errData = await response.json();
            errorMsg = errData.error || `API Error (${response.status})`;
          } catch {
            /* ignore parsing error */
          }
          throw new Error(errorMsg);
        }
        const data: { total: number; rooms: RoomListData[] } =
          await response.json();
        setAllRooms(data.rooms);
        setRoomFetchError(null);
      } catch (err: any) {
        console.error("Error fetching rooms:", err);
        setRoomFetchError(err.message || "Could not load room list.");
        setAllRooms([]);
      } finally {
        setIsLoadingRooms(false);
      }
    };
    fetchRooms();
  }, []);

  // --- Fuzzy Search with persistence ---
  const fuse = useMemo(() => {
    if (allRooms.length === 0) return null;
    return new Fuse(allRooms, {
      keys: ["name", "building", "roomNumber", "campus"],
      threshold: 0.4,
    });
  }, [allRooms]);
  const filteredRooms = useMemo(() => {
    if (!fuse || search.query === "") return allRooms;
    return fuse.search(search.query).map((result) => result.item);
  }, [search.query, allRooms, fuse]);

  // --- Event Handlers with persistence ---
  const handleNow = useCallback(() => {
    const now = getSydneyDate();
    const currentMinutes = now.getMinutes();
    const startMinutes = currentMinutes < 30 ? 0 : 30;
    const startTimeExact = setMinutes(
      setHours(now, now.getHours()),
      startMinutes,
    );
    const endMinutes = startMinutes === 0 ? 30 : 0;
    const endHour = startMinutes === 0 ? now.getHours() : now.getHours() + 1;
    const endTimeExact = setMinutes(setHours(now, endHour), endMinutes);
    const todayKey = formatDateKey(now);

    form.setFields({
      date: form.values.date || todayKey,
      startTime: format(startTimeExact, "HH:mm"),
      endTime: timeSlots.includes(format(endTimeExact, "HH:mm"))
        ? format(endTimeExact, "HH:mm")
        : timeSlots[timeSlots.length - 1],
    });
    setDisplayMonth(now);

    setFormError(null);
    setCheckResult(null);
  }, [form]);
  const handleAllDay = useCallback(() => {
    const now = getSydneyDate();
    const todayKey = formatDateKey(now);

    form.setFields({
      date: form.values.date || todayKey,
      startTime: timeSlots[0],
      endTime: timeSlots[timeSlots.length - 1],
    });
    setDisplayMonth(now);

    setFormError(null);
    setCheckResult(null);
  }, [form]);

  const handleReset = useCallback(() => {
    setSelectedRoom(null);
    search.clearQuery();
    form.reset();
    setFormError(null);
    setCheckResult(null);
    setComboboxOpen(false);
  }, [form, search]);
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);

      if (roomFetchError) {
        setFormError("Cannot check availability: Room list failed to load.");
        return;
      }

      if (
        !selectedRoom ||
        !form.values.date ||
        !form.values.startTime ||
        !form.values.endTime
      ) {
        setFormError("Please select a room, date, start time, and end time.");
        return;
      }

      if (form.values.startTime >= form.values.endTime) {
        setFormError("End time must be after start time.");
        return;
      }

      setIsChecking(true);
      try {
        const response = await fetch("/api/check-availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomName: selectedRoom.name,
            date: form.values.date,
            startTime: form.values.startTime,
            endTime: form.values.endTime,
          }),
        });

        if (!response.ok) {
          let errorMsg = `API Error: ${response.status}`;
          try {
            const errData = await response.json();
            errorMsg = errData.error || errorMsg;
          } catch {
            /* ignore */
          }
          throw new Error(errorMsg);
        }

        const data: CheckResult = await response.json();
        setCheckResult(data);

        // Clear form on successful submission
        form.handleSubmit(async () => {
          // Form is already cleared by the hook
        });
      } catch (err: any) {
        console.error("Check availability error:", err);
        setFormError(err.message || "Failed to check availability.");
        setCheckResult(null);
      } finally {
        setIsChecking(false);
      }
    },
    [selectedRoom, form, roomFetchError],
  );

  // --- Animation Variants ---
  const formItemVariant = {
    hidden: { opacity: 0, y: 15 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.07, duration: 0.4, ease: "easeOut" },
    }),
  };
  const alertVariants = {
    success: "bg-green-950/50 border-green-500/60",
    destructive: "bg-red-950/30 border-red-500/60",
  };

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Don't render page content if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // --- Render ---
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 pt-20 md:pt-24 flex-grow flex flex-col">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="text-3xl md:text-4xl font-bold mb-10 text-center text-white"
      >
        {" "}
        Check Room Availability{" "}
      </motion.h1>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5"
        onKeyDown={(e) => {
          if (isKey(KeyboardKeys.ESCAPE, e)) {
            e.preventDefault();
            setFormError(null);
            setCheckResult(null);
            AriaAnnouncer.getInstance().announce("Form cleared");
          }
        }}
        role="form"
        aria-label="Room availability check form"
      >
        {/* --- Form Elements (Unchanged structure) --- */}
        <motion.div
          variants={formItemVariant}
          initial="hidden"
          animate="visible"
          custom={0}
        >
          <label
            htmlFor="room-search"
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            Room
          </label>
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboboxOpen}
                disabled={isLoadingRooms || !!roomFetchError}
                className="w-full justify-between bg-black/20 border-white/20 hover:bg-black/30 hover:border-white/30 text-white disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <span className="flex items-center justify-between w-full">
                  <span className="truncate">
                    {" "}
                    {isLoadingRooms
                      ? "Loading rooms..."
                      : roomFetchError
                        ? "Error loading rooms"
                        : selectedRoom
                          ? `${selectedRoom.name}${selectedRoom.capacity !== null ? ` (${selectedRoom.capacity})` : ""}`
                          : "Select room..."}{" "}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className={`max-h-[--radix-popover-content-available-height] p-0 bg-black/80 backdrop-blur-md border-white/20 text-white font-sans ${montserrat.variable}`}
              style={{
                fontFamily: "inherit",
                width: "var(--radix-popover-trigger-width)",
              }}
            >
              {isLoadingRooms ? (
                <div className="flex items-center justify-center p-4 h-20">
                  <LoadingSpinner size="medium" />
                </div>
              ) : roomFetchError ? (
                <div className="p-4 text-center text-sm text-red-300">
                  {" "}
                  {roomFetchError}{" "}
                </div>
              ) : (
                <>
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search room..."
                      value={search.query}
                      onValueChange={search.setQuery}
                      className={`h-9 text-white placeholder:text-gray-400 border-0 border-b border-white/20 rounded-none ring-offset-0 focus-visible:ring-0 focus-visible:border-b-purple-500 font-sans ${montserrat.variable}`}
                      aria-label="Search for a room"
                      aria-describedby="room-search-help"
                    />
                    <CommandList className="hide-scrollbar">
                      {" "}
                      <CommandEmpty>No room found.</CommandEmpty>{" "}
                      <CommandGroup>
                        {" "}
                        {filteredRooms.map((room) => (
                          <CommandItem
                            key={room.name}
                            value={room.name}
                            onSelect={(currentValue) => {
                              const foundRoom = allRooms.find(
                                (r) =>
                                  r.name.toLowerCase() ===
                                  currentValue.toLowerCase(),
                              );
                              setSelectedRoom(foundRoom || null);
                              setComboboxOpen(false);
                              search.clearQuery();
                              if (foundRoom) {
                                form.setField(
                                  "selectedRoomName",
                                  foundRoom.name,
                                );
                              }
                            }}
                            className="font-sans aria-selected:bg-purple-500/30 aria-selected:text-white text-sm cursor-pointer"
                          >
                            {" "}
                            {room.name}{" "}
                            {room.capacity !== null && (
                              <span className="ml-2 text-xs text-gray-400">
                                {" "}
                                ({room.capacity}){" "}
                              </span>
                            )}{" "}
                          </CommandItem>
                        ))}{" "}
                      </CommandGroup>{" "}
                    </CommandList>
                  </Command>
                  <div id="room-search-help" className="sr-only">
                    Type to search for rooms. Use arrow keys to navigate and
                    Enter to select.
                  </div>
                </>
              )}
            </PopoverContent>
          </Popover>
        </motion.div>
        <motion.div
          variants={formItemVariant}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          <label
            htmlFor="date"
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            Date
          </label>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant="ghost"
                type="button"
                className="w-full justify-between border border-white/20 bg-black/20 hover:bg-black/30 hover:border-white/30 text-white font-normal"
                aria-label="Select date"
                aria-describedby="date-help"
              >
                <span className="truncate">
                  {form.values.date
                    ? formatDateLabel(form.values.date)
                    : "Select a date"}
                </span>
                <CalendarDays className="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={8}
              className="w-auto p-0 bg-black/80 backdrop-blur-md border-white/20"
            >
              <Calendar
                mode="single"
                selected={
                  form.values.date ? parseDateKey(form.values.date) : undefined
                }
                onSelect={(date) => {
                  if (!date) return;
                  form.setField("date", formatDateKey(date));
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
          <div id="date-help" className="sr-only">
            Choose the date to check room availability
          </div>
        </motion.div>
        <motion.div
          variants={formItemVariant}
          initial="hidden"
          animate="visible"
          custom={2}
        >
          <label
            htmlFor="startTime"
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            Start Time
          </label>
          <Select
            value={form.values.startTime}
            onValueChange={(value) => form.setField("startTime", value)}
          >
            <SelectTrigger
              id="startTime"
              className="w-full bg-black/20 border-white/20 text-white focus:ring-purple-500 focus:border-purple-500"
              aria-label="Select start time"
              aria-describedby="start-time-help"
            >
              {" "}
              <SelectValue placeholder="Select start time" />{" "}
            </SelectTrigger>
            <SelectContent
              className={`bg-black/80 backdrop-blur-md border-white/20 text-white max-h-60 font-sans ${montserrat.variable}`}
            >
              {" "}
              {timeSlots.map((t) => (
                <SelectItem
                  key={`start-${t}`}
                  value={t}
                  className="font-sans focus:bg-purple-500/30 focus:text-white"
                >
                  {formatTime(t, use24h)}
                </SelectItem>
              ))}{" "}
            </SelectContent>
            <div id="start-time-help" className="sr-only">
              Choose the start time for checking room availability
            </div>
          </Select>
        </motion.div>
        <motion.div
          variants={formItemVariant}
          initial="hidden"
          animate="visible"
          custom={3}
        >
          <label
            htmlFor="endTime"
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            End Time
          </label>
          <Select
            value={form.values.endTime}
            onValueChange={(value) => form.setField("endTime", value)}
          >
            <SelectTrigger
              id="endTime"
              className="w-full bg-black/20 border-white/20 text-white focus:ring-purple-500 focus:border-purple-500"
              aria-label="Select end time"
              aria-describedby="end-time-help"
            >
              {" "}
              <SelectValue placeholder="Select end time" />{" "}
            </SelectTrigger>
            <SelectContent
              className={`bg-black/80 backdrop-blur-md border-white/20 text-white max-h-60 font-sans ${montserrat.variable}`}
            >
              {" "}
              {timeSlots.map((t) => (
                <SelectItem
                  key={`end-${t}`}
                  value={t}
                  className="font-sans focus:bg-purple-500/30 focus:text-white"
                >
                  {formatTime(t, use24h)}
                </SelectItem>
              ))}{" "}
            </SelectContent>
            <div id="end-time-help" className="sr-only">
              Choose the end time for checking room availability
            </div>
          </Select>
        </motion.div>
        <motion.div
          variants={formItemVariant}
          initial="hidden"
          animate="visible"
          custom={4}
          className="md:col-span-2 grid grid-cols-2 md:flex md:flex-wrap gap-3 mt-3"
        >
          <Button
            type="submit"
            disabled={isChecking || isLoadingRooms || !!roomFetchError}
            className="md:flex-1 bg-purple-500 hover:bg-purple-500 text-white rounded-full px-5 py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
            {...AriaAttributes.button(isChecking, "Check room availability")}
          >
            {" "}
            {isChecking ? (
              <LoadingSpinner size="small" />
            ) : (
              <Search className="w-4 h-4" />
            )}{" "}
            <span className="md:hidden">Check</span>
            <span className="hidden md:inline">Check Availability</span>{" "}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleNow}
            className="md:w-auto rounded-full border-white/30 bg-white/10 hover:bg-white/20 px-5 py-2.5 text-sm font-medium flex items-center justify-center gap-2"
          >
            {" "}
            <Clock className="w-4 h-4" /> Now{" "}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleAllDay}
            className="md:w-auto rounded-full border-white/30 bg-white/10 hover:bg-white/20 px-5 py-2.5 text-sm font-medium flex items-center justify-center gap-2"
          >
            {" "}
            <CalendarIcon className="w-4 h-4" /> All Day{" "}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="text-red-400 hover:bg-red-950/50 hover:text-red-300 border-red-500/40 hover:border-red-500/60 bg-black/30 rounded-full px-5 py-2.5 text-sm font-medium flex items-center justify-center gap-2"
          >
            {" "}
            <X className="w-4 h-4" /> Reset{" "}
          </Button>
        </motion.div>
      </form>

      {/* --- Results Area --- */}
      <div className="mt-8">
        {formError && (
          <div key="form-error" className="mb-8">
            <Alert
              variant="destructive"
              className="bg-yellow-950/80 border-yellow-600/80 text-yellow-100"
            >
              <AlertCircle className="h-6 w-6 flex-shrink-0 self-start mt-1 text-yellow-300" />
              <div className="col-start-2">
                <AlertTitle className="text-lg font-semibold !text-yellow-100">
                  Input Error
                </AlertTitle>
                <AlertDescription className="text-yellow-100/90">
                  {formError}
                </AlertDescription>
              </div>
            </Alert>
          </div>
        )}
        <AnimatePresence>
          {isChecking && !checkResult && (
            <motion.div
              key="checking"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex items-center gap-2 text-sm text-gray-400"
            >
              <LoadingSpinner size="small" />
              Checking availability…
            </motion.div>
          )}
          {checkResult && (
            <motion.div
              key="check-result"
              variants={resultVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={cn(
                isChecking &&
                  "opacity-50 pointer-events-none transition-opacity duration-100",
              )}
            >
              <Alert
                variant={checkResult.available ? undefined : "destructive"}
                className={cn(
                  checkResult.available
                    ? alertVariants.success +
                        " flex items-center gap-3 !grid-cols-[auto_1fr]"
                    : alertVariants.destructive + " items-start",
                )}
              >
                {checkResult.available ? (
                  <>
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-300" />
                    <span className="text-base text-green-100 mt-0.75">
                      {" "}
                      Room{" "}
                      <span className="font-semibold">
                        {checkResult.checked.roomName}
                      </span>{" "}
                      is available.{" "}
                    </span>
                  </>
                ) : (
                  <>
                    <CircleX className="h-6 w-6 flex-shrink-0 self-start mt-1 !text-red-300" />
                    <div className="col-start-2">
                      <span className="block text-base text-red-100 font-medium mt-0.5">
                        {" "}
                        Room{" "}
                        <span className="font-semibold">
                          {checkResult.checked.roomName}
                        </span>{" "}
                        is not available.{" "}
                      </span>
                      {Array.isArray(checkResult.classes) &&
                      checkResult.classes.length > 0 ? (
                        <div className="mt-2 border-t border-red-400/80 pt-2">
                          <ul className="space-y-2.5">
                            {checkResult.classes?.map((c, index) => (
                              <li key={index} className="text-red-200/90">
                                <div className="text-sm font-medium text-red-100">
                                  {" "}
                                  {c.subject} {c.classType}{" "}
                                </div>
                                <div className="font-mono text-sm text-red-200/80">
                                  {" "}
                                  {c.startTime} - {c.endTime}{" "}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <AlertDescription className="text-sm text-red-200/90 pt-1">
                          {" "}
                          <span>
                            Between{" "}
                            <span className="font-semibold">
                              {checkResult.checked.startTime}
                            </span>{" "}
                            and{" "}
                            <span className="font-semibold">
                              {checkResult.checked.endTime}
                            </span>
                            .
                          </span>{" "}
                        </AlertDescription>
                      )}
                    </div>
                  </>
                )}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
