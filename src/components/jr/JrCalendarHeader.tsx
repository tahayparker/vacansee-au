"use client";

import { ChevronLeft, ChevronRight, Menu, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatCalendarHeaderTitle } from "@/services/jrScheduleService";
import type { JrCalendarView } from "@/types/jr";

interface JrCalendarHeaderProps {
  anchorDate: Date;
  view: JrCalendarView;
  includeWeekends: boolean;
  onViewChange: (view: JrCalendarView) => void;
  onNavigate: (direction: 1 | -1) => void;
  onToday: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenMobileFilters?: () => void;
}

const navButtonClass =
  "h-9 bg-black/20 border-white/20 text-white hover:bg-black/30 hover:border-white/30";

export function JrCalendarHeader({
  anchorDate,
  view,
  includeWeekends,
  onViewChange,
  onNavigate,
  onToday,
  onRefresh,
  isRefreshing,
  onOpenMobileFilters,
}: JrCalendarHeaderProps) {
  const title = formatCalendarHeaderTitle(anchorDate, view, includeWeekends);

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
      {onOpenMobileFilters && (
        <Button
          variant="outline"
          size="icon"
          onClick={onOpenMobileFilters}
          className={cn(navButtonClass, "w-9 lg:hidden")}
        >
          <Menu className="size-4" />
        </Button>
      )}

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onNavigate(-1)}
          className={cn(navButtonClass, "w-9")}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          onClick={onToday}
          className={cn(navButtonClass, "px-3")}
        >
          Today
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onNavigate(1)}
          className={cn(navButtonClass, "w-9")}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <h2 className="min-w-0 flex-1 truncate text-center text-base font-semibold text-white md:text-lg">
        {title}
      </h2>

      <Tabs
        value={view}
        onValueChange={(v) => onViewChange(v as JrCalendarView)}
      >
        <TabsList className="h-9 bg-black/40 border border-white/10">
          <TabsTrigger
            value="day"
            className="text-white data-[state=active]:bg-purple-500 data-[state=active]:text-white transition-all duration-300 ease-in-out"
          >
            Day
          </TabsTrigger>
          <TabsTrigger
            value="week"
            className="text-white data-[state=active]:bg-purple-500 data-[state=active]:text-white transition-all duration-300 ease-in-out"
          >
            Week
          </TabsTrigger>
          <TabsTrigger
            value="month"
            className="text-white data-[state=active]:bg-purple-500 data-[state=active]:text-white transition-all duration-300 ease-in-out"
          >
            Month
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Button
        variant="outline"
        size="icon"
        onClick={onRefresh}
        disabled={isRefreshing}
        className={cn(navButtonClass, "w-9")}
        title="Refresh"
      >
        <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
      </Button>
    </div>
  );
}
