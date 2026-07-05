"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DoorOpen, AlertCircle, Clock } from "lucide-react";
import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { montserrat } from "@/lib/fonts";
import { useTimeFormat } from "@/contexts/TimeFormatContext";
import { APP_TIMEZONE, ROOM_GROUPINGS } from "@/constants";
import { useTemporaryCampusFilter } from "@/hooks/useTemporaryCampusFilter";
import { CampusMultiSelect } from "@/components/CampusMultiSelect";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import type { Room } from "@/types/shared";
import { processRoomsList } from "@/services/roomService";

type AvailableRoomInfo = Room;

interface ApiResponseData {
  checkedAt: string;
  campuses: string[];
  offsetMinutes: number;
  targetTime: string;
  rooms: AvailableRoomInfo[];
}

interface ApiErrorResponse {
  error: string;
}

const durationOptions = [
  { label: "30 minutes", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "1.5 hours", value: 90 },
  { label: "2 hours", value: 120 },
];

const roomGroupings: Record<string, string[]> = ROOM_GROUPINGS;
const mainGroupRooms = Object.keys(roomGroupings);

export default function AvailableSoonPage() {
  const { loading: authLoading, isAuthenticated } = useRequireAuth();

  const [availableRooms, setAvailableRooms] = useState<AvailableRoomInfo[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<number>(
    durationOptions[0].value,
  );
  const { selectedCampuses, setSelectedCampuses, campusReady } =
    useTemporaryCampusFilter();
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { use24h } = useTimeFormat();

  const fetchData = useCallback(
    async (duration: number) => {
      if (selectedCampuses.length === 0) {
        setAvailableRooms([]);
        setCheckedAt(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setCheckedAt(null);
      setAvailableRooms([]);

      try {
        const response = await fetch("/api/available-soon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            durationMinutes: duration,
            campuses: selectedCampuses,
          }),
        });
        const responseTimestamp = new Date();

        if (!response.ok) {
          let errorMsg = `HTTP error! status: ${response.status}`;
          try {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const errData = (await response.json()) as ApiErrorResponse;
              if (errData && typeof errData.error === "string") {
                errorMsg = errData.error;
              }
            } else {
              const textError = await response.text();
              errorMsg = textError.length < 100 ? textError : errorMsg;
            }
          } catch {
            /* ignore parse errors */
          }
          throw new Error(errorMsg);
        }

        const data: ApiResponseData = await response.json();
        if (
          !data ||
          !Array.isArray(data.rooms) ||
          typeof data.checkedAt !== "string"
        ) {
          throw new Error("Invalid data format received from API");
        }

        const initialRooms = processRoomsList(data.rooms);
        const availableBuildings = new Set(
          initialRooms.map((room) => room.building),
        );
        const relatedRoomsToExclude = new Set<string>();
        mainGroupRooms.forEach((mainRoomCode) => {
          if (!availableBuildings.has(mainRoomCode)) {
            const relatedCodes = roomGroupings[mainRoomCode];
            if (relatedCodes) {
              relatedCodes.forEach((code) => relatedRoomsToExclude.add(code));
            }
          }
        });
        const filteredRooms = initialRooms.filter(
          (room) => !relatedRoomsToExclude.has(room.building),
        );

        setAvailableRooms(filteredRooms);
        setCheckedAt(data.checkedAt || responseTimestamp.toISOString());
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred.",
        );
        setAvailableRooms([]);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedCampuses],
  );

  useEffect(() => {
    if (!campusReady) return;
    fetchData(selectedDuration);
  }, [selectedDuration, selectedCampuses, campusReady, fetchData]);

  const formattedCheckedTime = useMemo(() => {
    if (!checkedAt) return "--:--";
    try {
      const dateObj = parseISO(checkedAt);
      const timeFormat = use24h ? "HH:mm" : "h:mm a";
      return formatInTimeZone(dateObj, APP_TIMEZONE, timeFormat);
    } catch {
      return "Invalid Time";
    }
  }, [checkedAt, use24h]);

  const formattedCheckedDay = useMemo(() => {
    if (!checkedAt) return "Loading...";
    try {
      const dateObj = parseISO(checkedAt);
      return formatInTimeZone(dateObj, APP_TIMEZONE, "EEEE, MMM d");
    } catch {
      return "Invalid Date";
    }
  }, [checkedAt]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { delayChildren: 0, staggerChildren: 0.02 },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 280, damping: 22 },
    },
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

  const renderContent = () => {
    if (selectedCampuses.length === 0) {
      return (
        <p className="text-center text-gray-400 py-10">
          Select at least one campus to see available rooms.
        </p>
      );
    }

    if (error && !isLoading) {
      return (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mt-8 text-center bg-red-950/70 border border-red-500/60 rounded-lg p-6 text-red-200 max-w-md mx-auto flex flex-col items-center gap-4"
        >
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="font-semibold text-red-100">Error loading rooms:</p>
          <p className="text-sm">{error}</p>
          <Button
            variant="destructive"
            onClick={() => fetchData(selectedDuration)}
            className="mt-4 px-4 py-2 bg-red-600/50 hover:bg-red-600/60 rounded-md text-red-100 text-sm font-medium transition-colors"
          >
            Try Again
          </Button>
        </motion.div>
      );
    }

    return (
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loader-soon"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center items-center py-20"
          >
            <LoadingSpinner size="large" />
          </motion.div>
        ) : availableRooms.length === 0 ? (
          <motion.p
            key="empty-soon"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-gray-400 py-10"
          >
            No rooms seem to be available around {formattedCheckedTime}.
          </motion.p>
        ) : (
          <motion.ul
            key={`list-soon-${selectedDuration}`}
            className="flex flex-wrap justify-center gap-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {availableRooms.map((room) => (
              <motion.li
                key={`${room.campus ?? "none"}-${room.name}`}
                variants={itemVariants}
                layout
                className="w-fit bg-black/20 border border-white/15 rounded-full shadow-lg backdrop-blur-sm px-4 py-2 flex items-center gap-2.5 hover:bg-white/10 hover:border-white/25 transition-all duration-200 group cursor-default"
              >
                <DoorOpen className="w-4 h-4 text-purple-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span
                  className="text-white text-sm font-medium truncate"
                  title={room.name}
                >
                  {room.name}
                  {room.capacity !== null && (
                    <span className="text-xs text-gray-400 ml-1.5">
                      ({room.capacity})
                    </span>
                  )}
                </span>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 py-6 pt-20 md:pt-24 flex-grow flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
      >
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-center text-white inline-block mr-2">
            Available Soon
          </h1>
          {!isLoading && !error && selectedCampuses.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-lg text-purple-500 font-medium align-middle">
              <DoorOpen className="w-5 h-5" /> ({availableRooms.length})
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-gray-400 mb-6 text-center">
          <Clock className="w-4 h-4 shrink-0" />
          <span>
            Available at ~
            <span className="font-medium text-gray-300">
              {formattedCheckedTime}
            </span>{" "}
            on{" "}
            <span className="font-medium text-gray-300">
              {formattedCheckedDay}
            </span>
          </span>
          <CampusMultiSelect
            selected={selectedCampuses}
            onChange={setSelectedCampuses}
          />
        </div>
        <div className="flex items-center justify-center gap-2 mb-8">
          <label
            htmlFor="duration-select"
            className="text-sm font-medium text-gray-300"
          >
            Available in:
          </label>
          <Select
            value={selectedDuration.toString()}
            onValueChange={(value) => setSelectedDuration(parseInt(value, 10))}
          >
            <SelectTrigger
              id="duration-select"
              className={`w-[135px] bg-black/20 border-white/20 text-white focus:ring-purple-500 focus:border-purple-500 font-sans ${montserrat.variable}`}
            >
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent
              className={`bg-black/80 backdrop-blur-md border-white/20 text-white font-sans ${montserrat.variable}`}
            >
              {durationOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value.toString()}
                  className="focus:bg-purple-500/30 focus:text-white"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>
      <div className="flex-grow">{renderContent()}</div>
    </div>
  );
}
