"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DoorOpen, AlertCircle, Clock } from "lucide-react";
import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Button } from "@/components/ui/button";
import { useTimeFormat } from "@/contexts/TimeFormatContext";
import { APP_TIMEZONE } from "@/constants";
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
  rooms: AvailableRoomInfo[];
}

interface ApiErrorResponse {
  error: string;
}

export default function AvailableNowPage() {
  const { loading: authLoading, isAuthenticated } = useRequireAuth();

  const [availableRooms, setAvailableRooms] = useState<AvailableRoomInfo[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const { selectedCampuses, setSelectedCampuses, campusReady } =
    useTemporaryCampusFilter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { use24h } = useTimeFormat();

  const fetchData = useCallback(async () => {
    if (selectedCampuses.length === 0) {
      setAvailableRooms([]);
      setCheckedAt(null);
      setIsLoading(false);
      return;
    }

    setError(null);
    setCheckedAt(null);
    setAvailableRooms([]);

    try {
      const response = await fetch("/api/available-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campuses: selectedCampuses }),
      });

      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errData = (await response.json()) as ApiErrorResponse;
          errorMsg = errData.error || errorMsg;
        } catch {
          /* ignore */
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

      setAvailableRooms(processRoomsList(data.rooms));
      setCheckedAt(data.checkedAt);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load available rooms.",
      );
      setAvailableRooms([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCampuses]);

  useEffect(() => {
    if (!campusReady) return;
    setIsLoading(true);
    fetchData();
  }, [campusReady, fetchData]);

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
            onClick={() => {
              setIsLoading(true);
              fetchData();
            }}
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
            key="loader-now"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center items-center py-20"
          >
            <LoadingSpinner size="large" />
          </motion.div>
        ) : availableRooms.length === 0 ? (
          <motion.p
            key="empty-now"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-gray-400 py-10"
          >
            No rooms are currently available.
          </motion.p>
        ) : (
          <motion.ul
            key="list-now"
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
                className="w-fit bg-black/20 border border-white/15 rounded-full shadow-lg backdrop-blur-sm px-4 py-2 flex items-center gap-2.5 hover:bg-white/10 hover:border-white/25 transition-all duration-100 group cursor-default"
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
            Available Now
          </h1>
          {!isLoading && !error && selectedCampuses.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-lg text-purple-500 font-medium align-middle">
              <DoorOpen className="w-5 h-5" />({availableRooms.length})
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-gray-400 mb-8 text-center">
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
      </motion.div>

      <div className="flex-grow">{renderContent()}</div>
    </div>
  );
}
