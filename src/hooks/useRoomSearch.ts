/**
 * useRoomSearch Hook
 *
 * Custom hook for fuzzy searching rooms using Fuse.js
 * Provides debounced search with caching
 */

import { useState, useEffect, useMemo } from "react";
import Fuse from "fuse.js";
import type { Room } from "@/types/shared";
import { DEBOUNCE_DELAY } from "@/constants";

/**
 * Options for room search
 */
export interface UseRoomSearchOptions {
  /** Fuzzy search threshold (0-1, lower = stricter) */
  threshold?: number;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Maximum number of results to return */
  limit?: number;
  /** Keys to search in (default: name, building, room number, campus) */
  searchKeys?: string[];
}

/**
 * Return type for useRoomSearch hook
 */
export interface UseRoomSearchResult {
  /** Filtered and searched rooms */
  results: Room[];
  /** Current search query */
  query: string;
  /** Set the search query */
  setQuery: (query: string) => void;
  /** Whether search is in progress */
  isSearching: boolean;
  /** Number of total results before limit */
  totalResults: number;
}

/**
 * Custom hook for fuzzy room search
 *
 * @param rooms - Array of rooms to search
 * @param options - Search options
 * @returns Search results and controls
 *
 * @example
 * ```tsx
 * const { results, query, setQuery, isSearching } = useRoomSearch(allRooms, {
 *   threshold: 0.3,
 *   limit: 50
 * });
 *
 * return (
 *   <div>
 *     <input value={query} onChange={(e) => setQuery(e.target.value)} />
 *     {isSearching && <LoadingSpinner size="small" />}
 *     {results.map(room => <RoomCard key={room.name} room={room} />)}
 *   </div>
 * );
 * ```
 */
export function useRoomSearch(
  rooms: Room[],
  options: UseRoomSearchOptions = {},
): UseRoomSearchResult {
  const {
    threshold = 0.4,
    debounceMs = DEBOUNCE_DELAY.SEARCH,
    limit,
    searchKeys = ["name", "building", "roomNumber", "campus"],
  } = options;

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Debounce the search query
  useEffect(() => {
    setIsSearching(true);
    const timeout = setTimeout(() => {
      setDebouncedQuery(query);
      setIsSearching(false);
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [query, debounceMs]);

  // Create Fuse instance
  const fuse = useMemo(() => {
    if (rooms.length === 0) return null;

    return new Fuse(rooms, {
      keys: searchKeys,
      threshold,
      includeScore: true,
      minMatchCharLength: 1,
    });
  }, [rooms, searchKeys, threshold]);

  // Perform search
  const results = useMemo(() => {
    // If no query, return all rooms
    if (!debouncedQuery.trim()) {
      return limit ? rooms.slice(0, limit) : rooms;
    }

    // If no fuse instance, return empty
    if (!fuse) {
      return [];
    }

    // Perform fuzzy search
    const searchResults = fuse.search(debouncedQuery);
    const filteredRooms = searchResults.map((result) => result.item);

    // Apply limit if specified
    return limit ? filteredRooms.slice(0, limit) : filteredRooms;
  }, [debouncedQuery, fuse, rooms, limit]);

  return {
    results,
    query,
    setQuery,
    isSearching: isSearching && query !== debouncedQuery,
    totalResults: debouncedQuery.trim() ? results.length : rooms.length,
  };
}
