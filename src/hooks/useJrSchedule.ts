"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Room } from "@/types/shared";
import type { JrBooking, JrBookingsResponse } from "@/types/jr";
import { processRoomsList } from "@/services/roomService";
import { buildBookingIndex } from "@/services/jrScheduleService";

interface RoomsListResponse {
  total: number;
  rooms: Room[];
}

interface UseJrScheduleResult {
  rooms: Room[];
  bookingIndex: Map<string, Map<string, JrBooking[]>>;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  fetchedAt: string | null;
  refresh: () => Promise<void>;
}

/**
 * Bulk-loads rooms + all date-specific bookings once, then exposes an
 * in-memory index. Filtering/view changes downstream are pure client-side
 * lookups with no further network requests.
 */
export function useJrSchedule(enabled: boolean): UseJrScheduleResult {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<JrBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const load = useCallback(async (forceRefresh: boolean) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const bookingsUrl = forceRefresh
        ? "/api/jr/bookings?refresh=1"
        : "/api/jr/bookings";
      const [roomsRes, bookingsRes] = await Promise.all([
        fetch("/api/rooms"),
        fetch(bookingsUrl),
      ]);

      if (!roomsRes.ok) throw new Error("Failed to load rooms.");
      if (!bookingsRes.ok) throw new Error("Failed to load bookings.");

      const roomsData: RoomsListResponse = await roomsRes.json();
      const bookingsData: JrBookingsResponse = await bookingsRes.json();

      setRooms(processRoomsList(roomsData.rooms));
      setBookings(bookingsData.bookings);
      setFetchedAt(bookingsData.fetchedAt);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load calendar data.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    load(false);
  }, [enabled, load]);

  const bookingIndex = useMemo(() => buildBookingIndex(bookings), [bookings]);

  const refresh = useCallback(() => load(true), [load]);

  return {
    rooms,
    bookingIndex,
    isLoading,
    isRefreshing,
    error,
    fetchedAt,
    refresh,
  };
}
