"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { AlertCircle, Search, ArrowUp, ArrowDown } from "lucide-react";
import Fuse from "fuse.js";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useRequireAuth } from "@/hooks/useRequireAuth";

import type { Room } from "@/types/shared";
import { compareRoomsByBuilding } from "@/services/roomParsing";

type SortKey = "name" | "campus" | "capacity";

function EmptyCell() {
  return <span className="text-gray-500">--</span>;
}

function displayCell(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return <EmptyCell />;
  }
  return value;
}

function PhotoLinks({
  frontImage,
  rearImage,
}: {
  frontImage: string | null;
  rearImage: string | null;
}) {
  const links: { label: string; href: string }[] = [];
  if (frontImage) links.push({ label: "Pic 1", href: frontImage });
  if (rearImage) links.push({ label: "Pic 2", href: rearImage });

  if (links.length === 0) return <EmptyCell />;

  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
      {links.map((link, index) => (
        <span key={link.label}>
          {index > 0 && (
            <span className="text-gray-600 mr-2" aria-hidden="true">
              ·
            </span>
          )}
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 hover:underline"
          >
            {link.label}
          </a>
        </span>
      ))}
    </span>
  );
}

type RoomData = Room;

interface SortConfig {
  key: SortKey | null;
  direction: "asc" | "desc";
}

const COL_COUNT = 8;

export default function RoomDetailsPage() {
  const { loading: authLoading, isAuthenticated } = useRequireAuth();

  const [allRooms, setAllRooms] = useState<RoomData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "name",
    direction: "asc",
  });

  const isSearching = searchQuery.trim() !== "";

  useEffect(() => {
    const fetchRooms = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/rooms");
        if (!response.ok) {
          let errorMsg = `HTTP error! status: ${response.status}`;
          try {
            const errData = await response.json();
            errorMsg = errData.error || errorMsg;
          } catch {
            /* ignore */
          }
          throw new Error(errorMsg);
        }
        const data: { total: number; rooms: RoomData[] } =
          await response.json();
        setAllRooms(data.rooms);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load room details.";
        console.error("Error fetching room details:", err);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRooms();
  }, []);

  const fuse = useMemo(() => {
    if (allRooms.length === 0) return null;
    return new Fuse(allRooms, {
      keys: [
        { name: "name", weight: 0.35 },
        { name: "building", weight: 0.1 },
        { name: "campus", weight: 0.15 },
        { name: "roomType", weight: 0.15 },
        { name: "equipmentTier", weight: 0.15 },
        { name: "specialFeatures", weight: 0.05 },
        { name: "similarVenues", weight: 0.05 },
      ],
      threshold: 0.4,
      includeScore: false,
    });
  }, [allRooms]);

  const processedRooms = useMemo(() => {
    let results: RoomData[];
    if (!fuse || !isSearching) {
      results = [...allRooms];
    } else {
      results = fuse.search(searchQuery).map((result) => result.item);
    }

    results = results.filter(
      (room) =>
        !room.name.toLowerCase().includes("consultation") &&
        !room.name.toLowerCase().includes("online"),
    );

    if (sortConfig.key !== null && !isSearching) {
      const key = sortConfig.key;
      results.sort((a, b) => {
        let comparison = 0;

        if (key === "capacity") {
          const aCap = a.capacity === null ? -Infinity : a.capacity;
          const bCap = b.capacity === null ? -Infinity : b.capacity;
          comparison = aCap - bCap;

          if (sortConfig.direction === "desc") {
            comparison = comparison * -1;
          }

          if (comparison === 0) {
            comparison = compareRoomsByBuilding(a.name, b.name);
          }

          return comparison;
        }

        if (key === "campus") {
          const av = (a.campus ?? "").toLowerCase();
          const bv = (b.campus ?? "").toLowerCase();
          if (av < bv) comparison = -1;
          else if (av > bv) comparison = 1;
          if (comparison === 0) {
            comparison = compareRoomsByBuilding(a.name, b.name);
          }
        } else if (key === "name") {
          comparison = compareRoomsByBuilding(a.name, b.name);
        }

        return sortConfig.direction === "asc" ? comparison : comparison * -1;
      });
    }
    return results;
  }, [searchQuery, isSearching, allRooms, fuse, sortConfig]);

  const handleSort = (key: SortKey) => {
    if (isSearching) return;
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (isSearching || sortConfig.key !== key) {
      return null;
    }
    if (sortConfig.direction === "asc") {
      return (
        <ArrowUp className="ml-1.5 h-4 w-4 text-purple-500 flex-shrink-0" />
      );
    }
    return (
      <ArrowDown className="ml-1.5 h-4 w-4 text-purple-500 flex-shrink-0" />
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.03, delayChildren: 0.1 },
    },
  };
  const itemVariant = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" },
    },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
  };
  const pageHeaderVariant = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { delay: 0.1, duration: 0.4, ease: "easeOut" },
    },
  };
  const searchBarVariant = {
    hidden: { opacity: 0, y: -10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { delay: 0.2, duration: 0.4, ease: "easeOut" },
    },
  };
  const tableContainerVariant = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { delay: 0.3, duration: 0.5, ease: "easeOut" },
    },
  };

  const sortableTh = (key: SortKey) =>
    cn(
      "group px-4 py-3 text-left text-sm font-semibold text-white border-b border-white/20 whitespace-nowrap",
      !isSearching && "cursor-pointer",
      isSearching && "cursor-default",
    );

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
    <div className="w-full max-w-[95rem] mx-auto px-4 py-6 pt-20 md:pt-24 flex flex-col items-center">
      <motion.div
        variants={pageHeaderVariant}
        initial="hidden"
        animate="visible"
        className="flex-shrink-0"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center text-white">
          Room Details
        </h1>
      </motion.div>

      <motion.div
        variants={searchBarVariant}
        initial="hidden"
        animate="visible"
        className="relative mb-6 flex-shrink-0 w-full max-w-4xl"
      >
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <Input
          type="text"
          placeholder={`Search ${allRooms.length} rooms by name, campus, type, or equipment...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 h-11 py-2.5 bg-black/30 border-white/25 text-white placeholder:text-gray-500 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 rounded-full"
        />
      </motion.div>

      <motion.div
        variants={tableContainerVariant}
        initial="hidden"
        animate="visible"
        className="border border-white/20 rounded-lg shadow-lg overflow-hidden bg-black/60 backdrop-blur-md flex flex-col min-h-0 w-full mb-6"
      >
        <div className="overflow-x-auto overflow-y-auto hide-scrollbar max-h-[65vh]">
          <table className="w-full min-w-[72rem] border-collapse">
            <thead className="sticky top-0 z-10 bg-gradient-to-b from-black/90 via-black/80 to-black/70 backdrop-blur-lg">
              <tr>
                <th
                  className={sortableTh("name")}
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center">
                    Room {getSortIcon("name")}
                  </div>
                </th>
                <th
                  className={sortableTh("campus")}
                  onClick={() => handleSort("campus")}
                >
                  <div className="flex items-center">
                    Campus {getSortIcon("campus")}
                  </div>
                </th>
                <th
                  className={cn(sortableTh("capacity"), "text-center")}
                  onClick={() => handleSort("capacity")}
                >
                  <div className="flex items-center justify-center">
                    Cap. {getSortIcon("capacity")}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white border-b border-white/20 whitespace-nowrap">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white border-b border-white/20 min-w-[10rem]">
                  Equipment
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white border-b border-white/20 min-w-[10rem]">
                  Features
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white border-b border-white/20 min-w-[8rem]">
                  Similar
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-white border-b border-white/20 whitespace-nowrap">
                  Photos
                </th>
              </tr>
            </thead>
            <motion.tbody
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="divide-y divide-white/15"
            >
              {isLoading && (
                <tr>
                  <td
                    colSpan={COL_COUNT}
                    className="h-40 text-center text-gray-400 py-4 px-6"
                  >
                    <div className="flex justify-center items-center">
                      <LoadingSpinner size="medium" />
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && error && (
                <tr>
                  <td colSpan={COL_COUNT} className="h-24 text-center p-4">
                    <div className="flex items-center justify-center text-red-400 gap-2 bg-red-950/40 border border-red-500/50 p-3 rounded-md max-w-md mx-auto">
                      <AlertCircle className="w-5 h-5" />
                      <span>Error: {error}</span>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && !error && processedRooms.length === 0 && (
                <tr>
                  <td
                    colSpan={COL_COUNT}
                    className="h-24 text-center text-gray-400 italic py-4 px-6"
                  >
                    {isSearching
                      ? "No rooms found matching your search."
                      : "No room data available."}
                  </td>
                </tr>
              )}
              {!isLoading && !error && processedRooms.length > 0 && (
                <AnimatePresence>
                  {processedRooms.map((room) => (
                    <motion.tr
                      key={room.name}
                      variants={itemVariant}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      layout
                      className="hover:bg-white/10 transition-colors duration-150"
                    >
                      <td className="font-medium text-white py-3 px-4 text-sm whitespace-nowrap">
                        {displayCell(room.name)}
                      </td>
                      <td className="text-gray-300 py-3 px-4 text-sm whitespace-nowrap">
                        {displayCell(room.campus)}
                      </td>
                      <td className="text-gray-300 py-3 px-4 text-sm text-center whitespace-nowrap">
                        {displayCell(room.capacity)}
                      </td>
                      <td className="text-gray-300 py-3 px-4 text-sm">
                        {displayCell(room.roomType)}
                      </td>
                      <td className="text-gray-300 py-3 px-4 text-sm">
                        {displayCell(room.equipmentTier)}
                      </td>
                      <td className="text-gray-300 py-3 px-4 text-sm">
                        {displayCell(room.specialFeatures)}
                      </td>
                      <td className="text-gray-300 py-3 px-4 text-sm">
                        {displayCell(room.similarVenues)}
                      </td>
                      <td className="text-gray-300 py-3 px-4 text-sm text-center whitespace-nowrap">
                        <PhotoLinks
                          frontImage={room.frontImage}
                          rearImage={room.rearImage}
                        />
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
              {!isLoading &&
                !error &&
                processedRooms.length > 0 &&
                isSearching && (
                  <tr className="bg-transparent">
                    <td
                      colSpan={COL_COUNT}
                      className="text-center text-xs text-gray-400 py-3 px-6 border-t border-white/15"
                    >
                      End of search results
                    </td>
                  </tr>
                )}
            </motion.tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
