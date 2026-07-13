"use client";

import { useState, useEffect, useMemo, useRef, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  pageContainerVariants,
  headerSectionVariants,
  tableRowVariants,
  fadeVariants,
} from "@/lib/animations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircle,
  Download,
  Share2,
  FileImage,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  CalendarDays,
  Search,
} from "lucide-react";
import { formatTime, cn } from "@/lib/utils";
import {
  useFormPersistence,
  useSearchPersistence,
} from "@/hooks/useFormPersistence";
import { montserrat } from "@/lib/fonts";
import { useTimeFormat } from "@/contexts/TimeFormatContext";
import { useToast } from "@/components/ui/toast";
import Fuse from "fuse.js";
import html2canvas from "html2canvas-pro";
import * as XLSX from "xlsx-js-style";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDateKey, parseDateKey } from "@/services/jrScheduleService";
import { addDays, format as formatDateFns, isWeekend } from "date-fns";
import { ALL_CAMPUSES, isAllCampusesSelected } from "@/lib/campus";
import { SCHEDULE_SLOT_LABELS, type UowCampus } from "@/constants";

import {
  compareRoomsByBuilding,
  getRoomDisplayLabel,
} from "@/services/roomParsing";

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

interface TableRow {
  date: string;
  day: string;
  room: string;
  campus: string;
  availability: number[];
}

const allTimeIntervals = [...SCHEDULE_SLOT_LABELS];

function getDatesInRange(startKey: string, endKey: string): string[] {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  const from = start <= end ? start : end;
  const to = start <= end ? end : start;
  const dates: string[] = [];
  let current = from;
  while (current <= to) {
    dates.push(formatDateKey(current));
    current = addDays(current, 1);
  }
  return dates;
}

function formatDateRangeLabel(
  start: string | null,
  end: string | null,
): string {
  if (!start) return "Select dates";
  const fromLabel = formatDateFns(parseDateKey(start), "EEE d MMM yyyy");
  const effectiveEnd = end ?? start;
  if (effectiveEnd === start) return fromLabel;
  return `${fromLabel} - ${formatDateFns(parseDateKey(effectiveEnd), "EEE d MMM yyyy")}`;
}

const getCellColor = (avail: number) => {
  return avail === 1 ? "bg-green-500/70" : "bg-red-600/80";
};

type CustomGraphFilters = {
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  selectedTimeSlots: number[];
  selectedRooms: string[];
  timeMode: "range" | "individual";
  timeRangeStart: number | null;
  timeRangeEnd: number | null;
  sortBy: "date" | "room";
  excludeWeekends: boolean;
  excludeWithoutOccupancy: boolean;
};

const DEFAULT_FILTERS: CustomGraphFilters = {
  dateRangeStart: null,
  dateRangeEnd: null,
  selectedTimeSlots: [],
  selectedRooms: [],
  timeMode: "range",
  timeRangeStart: null,
  timeRangeEnd: null,
  sortBy: "date",
  excludeWeekends: false,
  excludeWithoutOccupancy: false,
};

function isConsecutiveTimeRange(arr: number[]): boolean {
  if (arr.length <= 1) return false;
  const sorted = [...arr].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false;
  }
  return true;
}

function rowHasOccupancyInSlots(
  availability: number[],
  selectedTimeSlots: number[],
): boolean {
  if (selectedTimeSlots.length === 0) return true;
  return selectedTimeSlots.some((idx) => availability[idx] === 0);
}

function getExcludeWithoutOccupancy(filters: CustomGraphFilters): boolean {
  return filters.excludeWithoutOccupancy;
}

function parseFiltersFromSearchParams(
  urlParams: URLSearchParams,
): CustomGraphFilters {
  const result = { ...DEFAULT_FILTERS };

  const dateFrom = urlParams.get("dateFrom") ?? urlParams.get("date");
  const dateTo = urlParams.get("dateTo");
  if (dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
    result.dateRangeStart = dateFrom;
    result.dateRangeEnd =
      dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo) ? dateTo : dateFrom;
  }

  const times = urlParams.get("times");
  if (times) {
    const timeIndices = times
      .split(",")
      .map(Number)
      .filter((n) => !isNaN(n));
    if (timeIndices.length > 0) {
      result.selectedTimeSlots = timeIndices;
      if (isConsecutiveTimeRange(timeIndices)) {
        const sorted = [...timeIndices].sort((a, b) => a - b);
        result.timeMode = "range";
        result.timeRangeStart = sorted[0];
        result.timeRangeEnd = sorted[sorted.length - 1];
      } else {
        result.timeMode = "individual";
      }
    }
  }

  const rooms = urlParams.get("rooms");
  if (rooms) {
    result.selectedRooms = rooms.split(",").filter(Boolean);
  }

  const sortBy = urlParams.get("sortBy");
  if (sortBy === "date" || sortBy === "room") {
    result.sortBy = sortBy;
  }
  if (urlParams.get("excludeWeekends") === "1") {
    result.excludeWeekends = true;
  }
  if (
    urlParams.get("excludeWithoutOccupancy") === "1" ||
    urlParams.get("excludeEmptyDates") === "1"
  ) {
    result.excludeWithoutOccupancy = true;
  }

  return result;
}

function parseCampusesFromSearchParams(
  urlParams: URLSearchParams,
): UowCampus[] {
  const raw = urlParams.get("campuses");
  if (!raw) return [];
  return raw
    .split(",")
    .filter((c): c is UowCampus =>
      (ALL_CAMPUSES as readonly string[]).includes(c),
    );
}

// --- Main Page Component ---
export default function CustomGraphPage() {
  // Check authentication first
  const { loading: authLoading, isAuthenticated } = useRequireAuth();

  const [scheduleData, setScheduleData] = useState<FrontendScheduleDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTableContained, setIsTableContained] = useState(true);

  // Check if we have URL params
  const hasUrlParams =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).toString().length > 0;
  const { use24h } = useTimeFormat();
  const { success, error: showError } = useToast();

  const [urlHydrated, setUrlHydrated] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).toString().length === 0;
  });

  // Filter state - only persist if no URL params
  const filters = useFormPersistence(DEFAULT_FILTERS, {
    persist: !hasUrlParams,
    storageKey: "custom-graph-filters",
    debounceDelay: 0,
  });

  // Local state for instant switch feedback; table update deferred via startTransition
  const [localExcludeWeekends, setLocalExcludeWeekends] = useState(
    () => filters.values.excludeWeekends,
  );
  const [localExcludeWithoutOccupancy, setLocalExcludeWithoutOccupancy] =
    useState(() => getExcludeWithoutOccupancy(filters.values));
  const [, startTransition] = useTransition();

  const [selectedCampuses, setSelectedCampuses] = useState<UowCampus[]>([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState<Date>(() => new Date());

  // Migrate legacy excludeEmptyDates from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("custom-graph-filters");
      if (stored) {
        const parsed = JSON.parse(stored);
        if ("excludeEmptyDates" in parsed) {
          const { excludeEmptyDates, ...rest } = parsed;
          window.localStorage.setItem(
            "custom-graph-filters",
            JSON.stringify(rest),
          );
        }
      }
    } catch {
      // ignore migration errors
    }
  }, []);

  // Room search with persistence and debouncing
  const roomSearch = useSearchPersistence("", {
    debounceDelay: 300,
    storageKey: "custom-graph-room-search",
  });

  // Graph ref for export
  const graphRef = useRef<HTMLDivElement>(null);

  // Apply share-link params on mount (overrides stale localStorage)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.toString().length === 0) {
      setUrlHydrated(true);
      return;
    }
    filters.setFields(parseFiltersFromSearchParams(params));
    const campuses = parseCampusesFromSearchParams(params);
    if (campuses.length > 0) {
      setSelectedCampuses(campuses);
    }
    setUrlHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Data Fetching ---
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
        if (!Array.isArray(data)) {
          throw new Error("Invalid schedule data format received from API");
        }
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
        setScheduleData(normalized);
      })
      .catch((error) => {
        console.error("Error fetching schedule:", error);
        setError(error.message || "Failed to load schedule.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // All dates present in the schedule data, sorted chronologically
  const availableDates = useMemo(() => {
    return [...scheduleData]
      .map((d) => d.date)
      .filter(Boolean)
      .sort();
  }, [scheduleData]);

  // Default the date filter once data loads (skip when opened via share link)
  useEffect(() => {
    if (!urlHydrated) return;
    if (filters.values.dateRangeStart !== null || availableDates.length === 0) {
      return;
    }
    const todayKey = formatDateKey(new Date());
    const defaultDate =
      availableDates.find((d) => d >= todayKey) ?? availableDates[0];
    filters.setFields({
      dateRangeStart: defaultDate,
      dateRangeEnd: defaultDate,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableDates, urlHydrated]);

  // Sync local toggle state from filter values when they change externally
  useEffect(() => {
    setLocalExcludeWeekends(filters.values.excludeWeekends);
  }, [filters.values.excludeWeekends]);
  useEffect(() => {
    setLocalExcludeWithoutOccupancy(getExcludeWithoutOccupancy(filters.values));
  }, [filters.values.excludeWithoutOccupancy]);

  useEffect(() => {
    if (filters.values.dateRangeStart) {
      setDisplayMonth(parseDateKey(filters.values.dateRangeStart));
    }
  }, [filters.values.dateRangeStart]);

  const selectedDates = useMemo(() => {
    if (!filters.values.dateRangeStart) return [];
    const end = filters.values.dateRangeEnd ?? filters.values.dateRangeStart;
    return getDatesInRange(filters.values.dateRangeStart, end);
  }, [filters.values.dateRangeStart, filters.values.dateRangeEnd]);

  const excludeWithoutOccupancy = getExcludeWithoutOccupancy(filters.values);

  const renderDates = useMemo(() => {
    return selectedDates.filter((dateKey) => {
      const date = parseDateKey(dateKey);
      if (filters.values.excludeWeekends && isWeekend(date)) return false;
      return true;
    });
  }, [selectedDates, filters.values.excludeWeekends]);

  const dateRangeLabel = useMemo(
    () =>
      formatDateRangeLabel(
        filters.values.dateRangeStart,
        filters.values.dateRangeEnd,
      ),
    [filters.values.dateRangeStart, filters.values.dateRangeEnd],
  );

  // Room -> campus lookup built from every date bucket (rooms may not appear
  // in every bucket, so union across all of them)
  const roomCampusMap = useMemo(() => {
    const map = new Map<string, string>();
    scheduleData.forEach((day) => {
      day.rooms.forEach((room) => {
        if (room?.room && room.campus && !map.has(room.room)) {
          map.set(room.room, room.campus);
        }
      });
    });
    return map;
  }, [scheduleData]);

  // Get all unique rooms from schedule data, restricted to the selected campus(es)
  const allRooms = useMemo(() => {
    if (selectedCampuses.length === 0) return [];
    const roomSet = new Set<string>();
    scheduleData.forEach((day) => {
      day.rooms.forEach((room) => {
        if (!room?.room) return;
        const campus = room.campus || roomCampusMap.get(room.room);
        if (campus && !selectedCampuses.includes(campus as UowCampus)) {
          return;
        }
        roomSet.add(room.room);
      });
    });
    return Array.from(roomSet).sort(compareRoomsByBuilding);
  }, [scheduleData, selectedCampuses, roomCampusMap]);

  // No auto-initialization of rooms - user must select them

  // Drop selected rooms that are no longer valid for the current campus filter
  useEffect(() => {
    if (!urlHydrated || selectedCampuses.length === 0) return;
    const stillValid = filters.values.selectedRooms.filter((r) =>
      allRooms.includes(r),
    );
    if (stillValid.length !== filters.values.selectedRooms.length) {
      filters.setField("selectedRooms", stillValid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRooms, urlHydrated, selectedCampuses.length]);

  // Infer campuses from shared room list when link has no campuses param
  useEffect(() => {
    if (!urlHydrated || selectedCampuses.length > 0) return;
    if (
      filters.values.selectedRooms.length === 0 ||
      scheduleData.length === 0
    ) {
      return;
    }
    const inferred = new Set<UowCampus>();
    filters.values.selectedRooms.forEach((room) => {
      const campus = roomCampusMap.get(room);
      if (campus && (ALL_CAMPUSES as readonly string[]).includes(campus)) {
        inferred.add(campus as UowCampus);
      }
    });
    if (inferred.size > 0) {
      setSelectedCampuses([...inferred]);
    }
  }, [
    urlHydrated,
    selectedCampuses.length,
    filters.values.selectedRooms,
    roomCampusMap,
    scheduleData.length,
  ]);

  useEffect(() => {
    if (
      filters.values.timeMode === "range" &&
      filters.values.selectedTimeSlots.length > 0
    ) {
      // Check if current selections form a consecutive range
      if (isConsecutiveTimeRange(filters.values.selectedTimeSlots)) {
        const sorted = [...filters.values.selectedTimeSlots].sort(
          (a, b) => a - b,
        );
        const newStart = sorted[0];
        const newEnd = sorted[sorted.length - 1];

        // Only update if different from current range values
        if (
          filters.values.timeRangeStart !== newStart ||
          filters.values.timeRangeEnd !== newEnd
        ) {
          filters.setField("timeRangeStart", newStart);
          filters.setField("timeRangeEnd", newEnd);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.values.timeMode]);

  // Update time selections based on range mode when range values change
  useEffect(() => {
    if (
      filters.values.timeMode === "range" &&
      filters.values.timeRangeStart !== null &&
      filters.values.timeRangeEnd !== null
    ) {
      const start = Math.min(
        filters.values.timeRangeStart,
        filters.values.timeRangeEnd,
      );
      const end = Math.max(
        filters.values.timeRangeStart,
        filters.values.timeRangeEnd,
      );
      const newSlots = Array.from(
        { length: end - start + 1 },
        (_, i) => start + i,
      );

      // Only update if different
      if (
        JSON.stringify(newSlots) !==
        JSON.stringify(filters.values.selectedTimeSlots)
      ) {
        filters.setField("selectedTimeSlots", newSlots);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.values.timeRangeStart, filters.values.timeRangeEnd]);

  // Fuzzy search for rooms
  const roomFuse = useMemo(() => {
    if (allRooms.length === 0) return null;
    return new Fuse(allRooms, {
      threshold: 0.4,
      includeScore: false,
    });
  }, [allRooms]);

  // Filter rooms based on search
  const filteredRooms = useMemo(() => {
    if (!roomSearch.query.trim()) return allRooms;
    if (!roomFuse) return allRooms;
    return roomFuse.search(roomSearch.query).map((result) => result.item);
  }, [allRooms, roomSearch.query, roomFuse]);

  // Generate filtered time intervals
  const filteredTimeIntervals = useMemo(() => {
    return filters.values.selectedTimeSlots
      .sort((a, b) => a - b)
      .map((idx) => allTimeIntervals[idx]);
  }, [filters.values.selectedTimeSlots]);

  // Generate table rows for the selected date range
  const tableRows = useMemo(() => {
    const rows: TableRow[] = [];
    if (renderDates.length === 0) return rows;

    renderDates.forEach((dateKey) => {
      const dayData = scheduleData.find((d) => d.date === dateKey);
      if (!dayData) return;

      dayData.rooms.forEach((roomData) => {
        if (
          !roomData ||
          !filters.values.selectedRooms.includes(roomData.room)
        ) {
          return;
        }

        const filteredAvailability = filters.values.selectedTimeSlots
          .sort((a, b) => a - b)
          .map((idx) => roomData.availability[idx] ?? 0);

        if (
          excludeWithoutOccupancy &&
          !rowHasOccupancyInSlots(
            roomData.availability,
            filters.values.selectedTimeSlots,
          )
        ) {
          return;
        }

        rows.push({
          date: dateKey,
          day: dayData.day,
          room: roomData.room,
          campus: roomData.campus || roomCampusMap.get(roomData.room) || "",
          availability: filteredAvailability,
        });
      });
    });

    rows.sort((a, b) => {
      if (filters.values.sortBy === "room") {
        const roomCompare = compareRoomsByBuilding(a.room, b.room);
        if (roomCompare !== 0) return roomCompare;
        return a.date.localeCompare(b.date);
      }
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return compareRoomsByBuilding(a.room, b.room);
    });

    return rows;
  }, [
    renderDates,
    scheduleData,
    roomCampusMap,
    filters.values.selectedRooms,
    filters.values.selectedTimeSlots,
    filters.values.sortBy,
    excludeWithoutOccupancy,
  ]);

  const visibleDates = useMemo(
    () => [...new Set(tableRows.map((row) => row.date))].sort(),
    [tableRows],
  );

  // --- Toggle handlers ---
  const toggleTimeSlot = (slotIndex: number) => {
    const currentSlots = filters.values.selectedTimeSlots;
    const newSlots = currentSlots.includes(slotIndex)
      ? currentSlots.filter((t) => t !== slotIndex)
      : [...currentSlots, slotIndex].sort((a, b) => a - b);
    filters.setField("selectedTimeSlots", newSlots);
  };

  const toggleRoom = (room: string) => {
    const currentRooms = filters.values.selectedRooms;
    const newRooms = currentRooms.includes(room)
      ? currentRooms.filter((r) => r !== room)
      : [...currentRooms, room];
    filters.setField("selectedRooms", newRooms);
  };

  const toggleCampus = (campus: UowCampus) => {
    setSelectedCampuses((current) =>
      current.includes(campus)
        ? current.filter((c) => c !== campus)
        : [...current, campus],
    );
  };

  const toggleAllCampuses = () => {
    setSelectedCampuses((current) =>
      isAllCampusesSelected(current) ? [] : [...ALL_CAMPUSES],
    );
  };

  // --- Export Graph as PNG ---
  const exportGraphAsPNG = async () => {
    if (!graphRef.current) return;

    try {
      // Create a temporary container for the graph with footer
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.background = "#000000";
      document.body.appendChild(tempContainer);

      // Clone the graph
      const graphClone = graphRef.current.cloneNode(true) as HTMLElement;

      // Set minimum width for the container
      graphClone.style.minWidth = "720px";
      graphClone.style.width = "auto";

      // Optimize table for export
      const table = graphClone.querySelector("table");
      if (table) {
        const tableEl = table as HTMLElement;

        // Let the table expand to fit the container
        tableEl.style.width = "100%";
        tableEl.style.minWidth = "720px";

        // Style header row cells to adjust naturally
        const headerRow = table.querySelector("thead tr");
        if (headerRow) {
          const headerCells = headerRow.querySelectorAll("th");
          headerCells.forEach((th, index) => {
            const thEl = th as HTMLElement;
            if (index === 0) {
              // Room column header - keep fixed
              thEl.style.width = "120px";
              thEl.style.minWidth = "120px";
              thEl.style.maxWidth = "120px";
              thEl.style.textAlign = "center";
            } else {
              // Time column headers - let them expand to fill available space
              thEl.style.width = "auto";
              thEl.style.minWidth = "0";
              thEl.style.textAlign = "center";
              thEl.style.paddingLeft = "8px";
              thEl.style.paddingRight = "8px";
            }
          });
        }

        // Style body rows
        const bodyRows = table.querySelectorAll("tbody tr");
        bodyRows.forEach((tr) => {
          const cells = tr.querySelectorAll("td");
          cells.forEach((td, index) => {
            const tdEl = td as HTMLElement;
            if (index === 0) {
              // Room name cells - keep fixed
              tdEl.style.width = "120px";
              tdEl.style.minWidth = "120px";
              tdEl.style.maxWidth = "120px";
            } else {
              // Data cells - let them expand to fill available space
              tdEl.style.width = "auto";
              tdEl.style.minWidth = "0";
            }
          });
        });
      }

      tempContainer.appendChild(graphClone);

      // Add footer
      const footer = document.createElement("div");
      footer.style.width = "100%";
      footer.style.padding = "16px 24px";
      footer.style.background = "#000000";
      footer.style.borderTop = "2px solid rgba(255, 255, 255, 0.15)";
      footer.style.display = "flex";
      footer.style.justifyContent = "space-between";
      footer.style.alignItems = "center";
      footer.style.fontFamily = "Montserrat, sans-serif";
      footer.style.color = "#ffffff";

      const leftText = document.createElement("span");
      leftText.textContent = "vacansee-au - vacancy, instantly.";
      leftText.style.fontWeight = "500";
      leftText.style.fontSize = "14px";

      const rightText = document.createElement("span");
      rightText.textContent = "Built with 🖤 by TP";
      rightText.style.fontWeight = "500";
      rightText.style.fontSize = "12px";

      footer.appendChild(leftText);
      footer.appendChild(rightText);
      tempContainer.appendChild(footer);

      // Capture the image (html2canvas-pro supports modern CSS including oklab)
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: "#000000",
        scale: 2,
        logging: false,
      });

      // Clean up
      document.body.removeChild(tempContainer);

      // Download with formatted datetime
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const datetime = `${year}${month}${day}-${hours}${minutes}${seconds}`;

      const link = document.createElement("a");
      link.download = `vacansee-au-custom-graph-${datetime}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Error exporting graph:", error);
      alert("Failed to export graph. Please try again.");
    }
  };

  // --- Export Graph as CSV ---
  const exportGraphAsCSV = () => {
    if (tableRows.length === 0) return;

    try {
      const now = new Date();
      const csvRows: string[] = [];

      // Add metadata as comments
      csvRows.push("# vacansee-au - Custom Graph Export");
      csvRows.push(`# Generated: ${now.toLocaleString()}`);
      csvRows.push(`# Date(s): ${dateRangeLabel}`);
      csvRows.push(
        `# Time Range: ${formatTime(filteredTimeIntervals[0], use24h)} - ${formatTime(filteredTimeIntervals[filteredTimeIntervals.length - 1], use24h)}`,
      );
      csvRows.push(
        `# Rooms: ${filters.values.selectedRooms.length} room(s) selected`,
      );
      csvRows.push("#");

      // Create CSV headers
      const includeDateColumn = visibleDates.length > 1;
      const headers = includeDateColumn
        ? ["Date", "Room", "Campus", "Time Slot", "Availability"]
        : ["Room", "Campus", "Time Slot", "Availability"];
      csvRows.push(headers.join(","));

      // Add data rows
      tableRows.forEach((row) => {
        const timeSlots = filteredTimeIntervals.map((interval, idx) => {
          const availability = row.availability[idx];
          const status = availability === 1 ? "Available" : "Occupied";
          const fields = includeDateColumn
            ? [row.date, row.room, row.campus, interval, status]
            : [row.room, row.campus, interval, status];
          return fields.join(",");
        });
        csvRows.push(...timeSlots);
      });

      // Create and download CSV
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const datetime = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      link.download = `vacansee-au-custom-graph-${datetime}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Failed to export CSV. Please try again.");
    }
  };

  // --- Export Graph as XLSX ---
  const exportGraphAsXLSX = () => {
    if (tableRows.length === 0) return;

    try {
      // Create workbook
      const wb = XLSX.utils.book_new();

      // Add metadata to workbook
      const now = new Date();
      wb.Props = {
        Title: "vacansee-au - Custom Graph",
        Subject: "Custom Room Availability Graph",
        Author: "Taha Parker via vacansee-au",
        CreatedDate: now,
        Company: "vacansee-au",
        Comments: `Generated on ${now.toLocaleString()}. Date(s): ${dateRangeLabel}. Time Range: ${formatTime(filteredTimeIntervals[0], use24h)} - ${formatTime(filteredTimeIntervals[filteredTimeIntervals.length - 1], use24h)}.`,
        Keywords:
          "vacansee-au, custom graph, excel, xlsx, csv, export, download, rooms, dates, times, availability, vacant, occupied, available, occupied, tp, taha parker, garfield, lasagna",
      };

      // === MAIN SHEET (All Data) ===
      const mainWsData: any[][] = [];

      // Header row: Room (Campus) + time slots
      const includeDateColumn = visibleDates.length > 1;
      const headerRow = includeDateColumn
        ? [
            "Date",
            "Room",
            "Campus",
            ...filteredTimeIntervals.map((time) => formatTime(time, use24h)),
          ]
        : [
            "Room",
            "Campus",
            ...filteredTimeIntervals.map((time) => formatTime(time, use24h)),
          ];
      mainWsData.push(headerRow);

      // Data rows: one row per room (per date when range selected)
      tableRows.forEach((row) => {
        const rowData = includeDateColumn
          ? [
              row.date,
              getRoomDisplayLabel(row.room),
              row.campus,
              ...row.availability.map((val) =>
                val === 1 ? "Available" : "Occupied",
              ),
            ]
          : [
              getRoomDisplayLabel(row.room),
              row.campus,
              ...row.availability.map((val) =>
                val === 1 ? "Available" : "Occupied",
              ),
            ];
        mainWsData.push(rowData);
      });

      const mainWs = XLSX.utils.aoa_to_sheet(mainWsData);

      // Set column widths for main sheet
      const mainColWidths = [
        { wch: 18 }, // Room column
        { wch: 14 }, // Campus column
        ...filteredTimeIntervals.map(() => ({ wch: 12 })), // Time columns
      ];
      mainWs["!cols"] = mainColWidths;

      // Apply styles to main sheet
      const mainRange = XLSX.utils.decode_range(mainWs["!ref"] || "A1");

      // Define border style
      const borderStyle = {
        top: { style: "thin", color: { rgb: "000000" } as any },
        bottom: { style: "thin", color: { rgb: "000000" } as any },
        left: { style: "thin", color: { rgb: "000000" } as any },
        right: { style: "thin", color: { rgb: "000000" } as any },
      } as any;

      // Style header row
      for (let col = mainRange.s.c; col <= mainRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!mainWs[cellAddress]) continue;
        mainWs[cellAddress].s = {
          font: { bold: true, color: { rgb: "000000" } },
          fill: {
            patternType: "solid",
            fgColor: { rgb: "FFFFFF" },
            bgColor: { rgb: "FFFFFF" },
          },
          alignment: { horizontal: "center", vertical: "center" },
          border: borderStyle,
        };
      }

      // Style data cells
      for (let row = mainRange.s.r + 1; row <= mainRange.e.r; row++) {
        for (let col = mainRange.s.c; col <= mainRange.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!mainWs[cellAddress]) continue;

          if (col === 0 || col === 1) {
            // Room/Campus label columns with white background
            mainWs[cellAddress].s = {
              font: { bold: true, color: { rgb: "000000" } },
              fill: {
                patternType: "solid",
                fgColor: { rgb: "FFFFFF" },
                bgColor: { rgb: "FFFFFF" },
              },
              alignment: { horizontal: "right", vertical: "center" },
              border: borderStyle,
            };
          } else {
            // Data cells: color based on availability
            const value = mainWs[cellAddress].v;
            const isAvailable = value === "Available";
            mainWs[cellAddress].s = {
              fill: {
                patternType: "solid",
                fgColor: { rgb: isAvailable ? "90EE90" : "FF6B6B" },
                bgColor: { rgb: isAvailable ? "90EE90" : "FF6B6B" },
              },
              alignment: { horizontal: "center", vertical: "center" },
              border: borderStyle,
            };
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, mainWs, "All Data");

      // Generate filename with timestamp
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const datetime = `${year}${month}${day}-${hours}${minutes}${seconds}`;

      // Write file with BookType explicitly set
      XLSX.writeFile(wb, `vacansee-au-custom-graph-${datetime}.xlsx`, {
        bookType: "xlsx",
        cellStyles: true,
      });
    } catch (error) {
      console.error("Error exporting XLSX:", error);
      alert("Failed to export XLSX. Please try again.");
    }
  };

  // --- Generate Shareable URL ---
  const generateShareableURL = async () => {
    const params = new URLSearchParams();

    // Always use simple arrays - no mode parameters needed
    // The receiver will auto-detect if it's a range or not
    if (filters.values.dateRangeStart) {
      params.set("dateFrom", filters.values.dateRangeStart);
      const end = filters.values.dateRangeEnd ?? filters.values.dateRangeStart;
      if (end !== filters.values.dateRangeStart) {
        params.set("dateTo", end);
      }
    }

    if (filters.values.selectedTimeSlots.length > 0) {
      params.set("times", filters.values.selectedTimeSlots.join(","));
    }

    if (filters.values.selectedRooms.length > 0) {
      params.set("rooms", filters.values.selectedRooms.join(","));
    }

    if (selectedCampuses.length > 0) {
      params.set("campuses", selectedCampuses.join(","));
    }

    if (filters.values.sortBy !== "date") {
      params.set("sortBy", filters.values.sortBy);
    }
    if (filters.values.excludeWeekends) {
      params.set("excludeWeekends", "1");
    }
    if (excludeWithoutOccupancy) {
      params.set("excludeWithoutOccupancy", "1");
    }

    const shareableURL = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

    // Detect if device is mobile (not just if browser supports Web Share API)
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) ||
      (navigator.maxTouchPoints > 0 && window.innerWidth < 768);

    // On mobile: use native share if available
    if (isMobile && navigator.share) {
      try {
        await navigator.share({
          title: "vacansee-au Custom Graph",
          text: "Check out this custom room availability graph",
          url: shareableURL,
        });
      } catch (err) {
        if (!(
          err &&
          typeof err === "object" &&
          "name" in err &&
          (err as any).name === "AbortError"
        )) {
          showError("Failed to open share sheet.");
        }
      }
      return;
    }

    // On desktop or mobile without share API: copy to clipboard and show toast
    try {
      await navigator.clipboard.writeText(shareableURL);
      success("Shareable URL has been copied to your clipboard!");
    } catch {
      showError("Failed to copy URL to clipboard.");
    }
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

  // --- Render Page Content ---
  // Only use full height container if there are enough rows (more than 6)
  const shouldUseFullHeight = isTableContained && tableRows.length > 6;

  return (
    <motion.div
      variants={pageContainerVariants}
      initial="hidden"
      animate="visible"
      className={`w-full max-w-full mx-auto px-0 py-6 pt-20 md:pt-24 flex flex-col ${shouldUseFullHeight ? "h-screen" : ""}`}
    >
      {/* Header Section */}
      <motion.div
        variants={headerSectionVariants}
        className="px-4 md:px-6 flex flex-col gap-4 mb-6 flex-shrink-0"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-center sm:text-left text-white">
          Custom Graph
        </h1>

        {/* Filter Accordion */}
        <div className="bg-black/20 backdrop-blur-sm border border-white/15 rounded-lg p-4 pt-2 pb-2">
          <Accordion
            type="single"
            defaultValue={hasUrlParams ? undefined : "date"}
            collapsible
            className="w-full"
          >
            {/* Date Filter */}
            <AccordionItem value="date" className="border-white/10">
              <AccordionTrigger className="text-white hover:text-white/80 text-lg font-bold py-2">
                Select Date
              </AccordionTrigger>
              <AccordionContent className="pt-3 pb-3">
                <Popover
                  open={datePickerOpen}
                  onOpenChange={(open) => {
                    setDatePickerOpen(open);
                    if (
                      !open &&
                      filters.values.dateRangeStart &&
                      !filters.values.dateRangeEnd
                    ) {
                      filters.setField(
                        "dateRangeEnd",
                        filters.values.dateRangeStart,
                      );
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full sm:w-[280px] justify-between border border-white/20 bg-black/20 hover:bg-black/30 hover:border-white/30 text-white font-normal"
                    >
                      <span className="truncate">{dateRangeLabel}</span>
                      <CalendarDays className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    sideOffset={8}
                    className="w-auto p-0 bg-black/80 backdrop-blur-md border-white/20"
                  >
                    <Calendar
                      mode="range"
                      selected={
                        filters.values.dateRangeStart
                          ? {
                              from: parseDateKey(filters.values.dateRangeStart),
                              to: filters.values.dateRangeEnd
                                ? parseDateKey(filters.values.dateRangeEnd)
                                : undefined,
                            }
                          : undefined
                      }
                      onSelect={(range) => {
                        if (!range?.from) return;
                        filters.setFields({
                          dateRangeStart: formatDateKey(range.from),
                          dateRangeEnd: range.to
                            ? formatDateKey(range.to)
                            : null,
                        });
                        if (range.to) {
                          setDatePickerOpen(false);
                        }
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
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-md border border-white/20 bg-black/20 px-3 py-2.5">
                    <span className="text-sm text-white">Exclude weekends</span>
                    <Switch
                      checked={localExcludeWeekends}
                      onCheckedChange={(checked) => {
                        setLocalExcludeWeekends(checked);
                        startTransition(() =>
                          filters.setField("excludeWeekends", checked),
                        );
                      }}
                      className="data-[state=checked]:bg-purple-500"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-white/20 bg-black/20 px-3 py-2.5">
                    <span className="text-sm text-white">
                      Exclude dates without occupancy
                    </span>
                    <Switch
                      checked={localExcludeWithoutOccupancy}
                      onCheckedChange={(checked) => {
                        setLocalExcludeWithoutOccupancy(checked);
                        startTransition(() =>
                          filters.setField("excludeWithoutOccupancy", checked),
                        );
                      }}
                      className="data-[state=checked]:bg-purple-500"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Time Slots Filter */}
            <AccordionItem value="times" className="border-white/10">
              <AccordionTrigger className="text-white hover:text-white/80 text-lg font-bold py-2">
                Select Time Slots
              </AccordionTrigger>
              <AccordionContent className="pt-3 pb-3">
                <Tabs
                  value={filters.values.timeMode}
                  onValueChange={(val) =>
                    filters.setField("timeMode", val as "range" | "individual")
                  }
                  className="w-full"
                >
                  <TabsList className="bg-black/40 border border-white/10">
                    <TabsTrigger
                      value="range"
                      className="text-white data-[state=active]:bg-purple-500 data-[state=active]:text-white"
                    >
                      Range
                    </TabsTrigger>
                    <TabsTrigger
                      value="individual"
                      className="text-white data-[state=active]:bg-purple-500 data-[state=active]:text-white"
                    >
                      Individual
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="range" className="mt-4">
                    <div className="flex flex-col md:flex-row gap-3 md:items-center">
                      <div className="flex gap-3 items-center flex-1">
                        <label className="text-sm text-gray-300 whitespace-nowrap">
                          From:
                        </label>
                        <div className="flex-1">
                          <Select
                            value={
                              filters.values.timeRangeStart !== null
                                ? filters.values.timeRangeStart.toString()
                                : undefined
                            }
                            onValueChange={(val) =>
                              filters.setField("timeRangeStart", parseInt(val))
                            }
                          >
                            <SelectTrigger className="bg-black/20 border-white/20 text-white">
                              <SelectValue placeholder="Select start time" />
                            </SelectTrigger>
                            <SelectContent
                              className={`bg-black/80 backdrop-blur-md border-white/20 text-white ${montserrat.variable}`}
                            >
                              {allTimeIntervals.map((time, idx) => (
                                <SelectItem
                                  key={idx}
                                  value={idx.toString()}
                                  className="focus:bg-purple-500/30 focus:text-white"
                                >
                                  {formatTime(time, use24h)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-3 items-center flex-1">
                        <label className="text-sm text-gray-300 whitespace-nowrap">
                          To:
                        </label>
                        <div className="flex-1">
                          <Select
                            value={
                              filters.values.timeRangeEnd !== null
                                ? filters.values.timeRangeEnd.toString()
                                : undefined
                            }
                            onValueChange={(val) =>
                              filters.setField("timeRangeEnd", parseInt(val))
                            }
                          >
                            <SelectTrigger className="bg-black/20 border-white/20 text-white">
                              <SelectValue placeholder="Select end time" />
                            </SelectTrigger>
                            <SelectContent
                              className={`bg-black/80 backdrop-blur-md border-white/20 text-white ${montserrat.variable}`}
                            >
                              {allTimeIntervals.map((time, idx) => (
                                <SelectItem
                                  key={idx}
                                  value={idx.toString()}
                                  className="focus:bg-purple-500/30 focus:text-white"
                                >
                                  {formatTime(time, use24h)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="individual" className="mt-4">
                    <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
                      {allTimeIntervals.map((time, idx) => (
                        <Button
                          key={idx}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleTimeSlot(idx)}
                          className={cn(
                            "rounded-full border-2 transition-all",
                            filters.values.selectedTimeSlots.includes(idx)
                              ? "bg-purple-500 border-purple-500 text-white hover:bg-purple-500 hover:border-purple-500"
                              : "bg-black/20 border-white/20 text-white hover:bg-white/10",
                          )}
                        >
                          {formatTime(time, use24h)}
                        </Button>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </AccordionContent>
            </AccordionItem>

            {/* Campus Filter */}
            <AccordionItem value="campus" className="border-white/10">
              <AccordionTrigger className="text-white hover:text-white/80 text-lg font-bold py-2">
                Select Campuses
              </AccordionTrigger>
              <AccordionContent className="pt-3 pb-3">
                <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleAllCampuses}
                    className="rounded-full border-2 transition-all bg-black/20 border-white/20 text-white hover:bg-white/10"
                  >
                    All
                  </Button>
                  {ALL_CAMPUSES.map((campus) => (
                    <Button
                      key={campus}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleCampus(campus)}
                      className={cn(
                        "rounded-full border-2 transition-all",
                        selectedCampuses.includes(campus)
                          ? "bg-purple-500 border-purple-500 text-white hover:bg-purple-500 hover:border-purple-500"
                          : "bg-black/20 border-white/20 text-white hover:bg-white/10",
                      )}
                    >
                      {campus}
                    </Button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Rooms Filter */}
            <AccordionItem value="rooms" className="border-white/10">
              <AccordionTrigger className="text-white hover:text-white/80 text-lg font-bold py-2">
                Select Rooms
              </AccordionTrigger>
              <AccordionContent className="pt-3 pb-3">
                <div className="space-y-4">
                  {/* Search Bar with Select All button */}
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        type="text"
                        placeholder="Search rooms..."
                        value={roomSearch.query}
                        onChange={(e) => roomSearch.setQuery(e.target.value)}
                        className="pl-10 bg-black/20 border-white/20 text-white placeholder:text-gray-500 focus:border-purple-500 rounded-full"
                      />
                    </div>
                    {roomSearch.query && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allFilteredSelected = filteredRooms.every(
                            (room) =>
                              filters.values.selectedRooms.includes(room),
                          );
                          if (allFilteredSelected) {
                            // Deselect all filtered rooms
                            filters.setField(
                              "selectedRooms",
                              filters.values.selectedRooms.filter(
                                (r) => !filteredRooms.includes(r),
                              ),
                            );
                          } else {
                            // Select all filtered rooms
                            const newRooms = [
                              ...new Set([
                                ...filters.values.selectedRooms,
                                ...filteredRooms,
                              ]),
                            ];
                            filters.setField("selectedRooms", newRooms);
                          }
                        }}
                        className={cn(
                          "rounded-full border-2 transition-all whitespace-nowrap",
                          filteredRooms.every((room) =>
                            filters.values.selectedRooms.includes(room),
                          ) && filteredRooms.length > 0
                            ? "bg-purple-500 border-purple-500 text-white hover:bg-purple-500 hover:border-purple-500"
                            : "bg-black/20 border-white/20 text-white hover:bg-white/10",
                        )}
                      >
                        {filteredRooms.every((room) =>
                          filters.values.selectedRooms.includes(room),
                        ) && filteredRooms.length > 0
                          ? "Deselect All"
                          : "Select All"}
                      </Button>
                    )}
                  </div>

                  {/* Room Buttons */}
                  <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
                    {filteredRooms.map((room) => (
                      <Button
                        key={room}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleRoom(room)}
                        className={cn(
                          "rounded-full border-2 transition-all",
                          filters.values.selectedRooms.includes(room)
                            ? "bg-purple-500 border-purple-500 text-white hover:bg-purple-500 hover:border-purple-500"
                            : "bg-black/20 border-white/20 text-white hover:bg-white/10",
                        )}
                      >
                        {room}
                      </Button>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Sort Filter */}
            <AccordionItem value="sort" className="border-white/10">
              <AccordionTrigger className="text-white hover:text-white/80 text-lg font-bold py-2">
                Sort By
              </AccordionTrigger>
              <AccordionContent className="pt-3 pb-3">
                <div className="flex gap-2">
                  <Toggle
                    pressed={filters.values.sortBy === "date"}
                    onPressedChange={(pressed) => {
                      if (pressed) filters.setField("sortBy", "date");
                    }}
                    className="rounded-full border-2 border-white/20 bg-black/20 text-white hover:bg-white/10 data-[state=on]:bg-purple-500 data-[state=on]:border-purple-500 data-[state=on]:text-white px-4"
                  >
                    Date
                  </Toggle>
                  <Toggle
                    pressed={filters.values.sortBy === "room"}
                    onPressedChange={(pressed) => {
                      if (pressed) filters.setField("sortBy", "room");
                    }}
                    className="rounded-full border-2 border-white/20 bg-black/20 text-white hover:bg-white/10 data-[state=on]:bg-purple-500 data-[state=on]:border-purple-500 data-[state=on]:text-white px-4"
                  >
                    Room
                  </Toggle>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* View Toggle, Export and Share Buttons */}
        {filters.values.dateRangeStart &&
          selectedCampuses.length > 0 &&
          filters.values.selectedTimeSlots.length > 0 &&
          filters.values.selectedRooms.length > 0 &&
          tableRows.length > 0 && (
            <div className="flex flex-nowrap justify-end gap-1.5 md:gap-3 mt-4">
              <Button
                onClick={() => setIsTableContained(!isTableContained)}
                variant="outline"
                className="bg-black/20 border-white/20 hover:bg-white/10 text-white font-semibold flex items-center gap-1 md:gap-2 rounded-full px-2 md:px-6 text-xs md:text-base whitespace-nowrap"
              >
                {isTableContained ? (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Expand
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Contain
                  </>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-purple-500 hover:bg-purple-500 text-white font-semibold flex items-center gap-1 md:gap-2 rounded-full px-2 md:px-6 text-xs md:text-base whitespace-nowrap">
                    <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={exportGraphAsPNG}
                    className="cursor-pointer"
                  >
                    <FileImage className="w-4 h-4 mr-2" />
                    Export as PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={exportGraphAsXLSX}
                    className="cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export as XLSX
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={exportGraphAsCSV}
                    className="cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={generateShareableURL}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1 md:gap-2 rounded-full px-2 md:px-6 text-xs md:text-base whitespace-nowrap"
              >
                <Share2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Share
              </Button>
            </div>
          )}
      </motion.div>

      {/* Schedule Table Area */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loader-custom-graph"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-grow items-center justify-center pt-10"
          >
            <LoadingSpinner size="large" />
          </motion.div>
        ) : error ? (
          <motion.div
            key="error-custom-graph"
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
        ) : !filters.values.dateRangeStart ||
          selectedCampuses.length === 0 ||
          filters.values.selectedTimeSlots.length === 0 ||
          filters.values.selectedRooms.length === 0 ? (
          <motion.div
            key="no-selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-8"
          >
            <p className="text-gray-400 text-lg">
              {selectedCampuses.length === 0
                ? "Please select at least one campus, then choose dates, time slots, and rooms."
                : "Please select dates, time slots, and rooms to view the schedule."}
            </p>
          </motion.div>
        ) : tableRows.length > 0 ? (
          <motion.div
            key={`table-container-custom`}
            variants={fadeVariants}
            initial="hidden"
            animate={{
              opacity: 1,
              flexGrow: shouldUseFullHeight ? 1 : 0,
            }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            exit="exit"
            className={`relative flex flex-col px-4 ${shouldUseFullHeight ? "min-h-0 pb-4" : "mb-6"}`}
            ref={graphRef}
          >
            <motion.div
              animate={{
                flexGrow: shouldUseFullHeight ? 1 : 0,
              }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className={`w-full overflow-auto hide-scrollbar border-l border-t border-b border-white/15 rounded-lg shadow-lg bg-black/20 backdrop-blur-sm ${shouldUseFullHeight ? "min-h-0" : ""}`}
            >
              <table className="border-separate border-spacing-0 w-full min-w-fit">
                <thead className="sticky top-0 z-30">
                  <tr>
                    <th className="sticky left-0 top-0 bg-black text-white z-40 px-2 md:px-3 py-3 border-r border-b border-white/15 text-center text-xs md:text-sm font-semibold whitespace-nowrap w-auto max-w-fit">
                      Room
                    </th>
                    {filteredTimeIntervals.map((time, index) => (
                      <th
                        key={time}
                        className={`sticky top-0 bg-black text-white z-30 px-6 md:px-6 py-3 md:py-3 border-b border-white/15 text-center text-xs md:text-sm font-medium whitespace-nowrap ${index === filteredTimeIntervals.length - 1 ? "" : "border-r border-white/15"}`}
                        style={{
                          minWidth: "75px",
                          width: "auto",
                          maxWidth: "fit-content",
                        }}
                      >
                        {formatTime(time, use24h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="relative z-0">
                  <AnimatePresence initial={false}>
                    {tableRows.map((row, rowIndex) => (
                      <motion.tr
                        key={`${row.date}-${row.room}`}
                        custom={rowIndex}
                        variants={tableRowVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="group"
                      >
                        <td className="sticky left-0 bg-black group-hover:bg-zinc-900 text-white z-20 px-2 md:px-3 py-2 border-r border-b border-white/10 text-right text-sm whitespace-nowrap transition-colors duration-100 w-auto max-w-fit">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-semibold text-sm md:text-base">
                              {getRoomDisplayLabel(row.room)}
                            </span>
                            <span className="text-xs md:text-sm text-gray-300 font-medium">
                              {row.campus}
                            </span>
                            {visibleDates.length > 1 && (
                              <span className="text-xs text-purple-300/80">
                                {formatDateFns(
                                  parseDateKey(row.date),
                                  "EEE d MMM yyyy",
                                )}
                              </span>
                            )}
                          </div>
                        </td>
                        {row.availability.map((avail, idx) => (
                          <td
                            key={idx}
                            className={`relative z-0 border-b border-black/50 ${getCellColor(avail)} transition-colors duration-150 group-hover:brightness-110 ${idx === row.availability.length - 1 ? "" : "border-r border-black/100"}`}
                            title={`${getRoomDisplayLabel(row.room)} - ${row.campus} - ${filteredTimeIntervals[idx]} - ${avail === 1 ? "Available" : "Occupied"}`}
                            style={{
                              minWidth: "35px",
                              width: "auto",
                              maxWidth: "fit-content",
                            }}
                          >
                            <div className="h-5 md:h-6"></div>
                          </td>
                        ))}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </motion.div>
          </motion.div>
        ) : (
          <motion.p
            key="empty-custom-graph"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-gray-400 py-8 px-4"
          >
            No schedule data available for the selected filters.
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
