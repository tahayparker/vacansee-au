"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import Fuse from "fuse.js";
import { Button } from "@/components/ui/button";
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
import { montserrat } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import type { Room } from "@/types/shared";

interface RoomMultiSelectProps {
  rooms: Room[];
  selected: string[];
  onChange: (roomNames: string[]) => void;
  isLoading?: boolean;
  className?: string;
}

export function RoomMultiSelect({
  rooms,
  selected,
  onChange,
  isLoading = false,
  className,
}: RoomMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const fuse = useMemo(
    () =>
      rooms.length
        ? new Fuse(rooms, {
            keys: ["name", "building", "roomNumber", "campus"],
            threshold: 0.4,
          })
        : null,
    [rooms],
  );

  const filteredRooms = useMemo(() => {
    if (!fuse || query === "") return rooms;
    return fuse.search(query).map((result) => result.item);
  }, [query, rooms, fuse]);

  const sortedRooms = useMemo(() => {
    const selectedSet = new Set(selected);
    const selectedRooms: Room[] = [];
    const rest: Room[] = [];
    for (const room of filteredRooms) {
      (selectedSet.has(room.name) ? selectedRooms : rest).push(room);
    }
    return [...selectedRooms, ...rest];
  }, [filteredRooms, selected]);

  const toggleRoom = (roomName: string) => {
    onChange(
      selected.includes(roomName)
        ? selected.filter((name) => name !== roomName)
        : [...selected, roomName],
    );
  };

  const label =
    selected.length === 0
      ? "Select rooms..."
      : selected.length === 1
        ? selected[0]
        : `${selected.length} rooms`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={isLoading}
          className={cn(
            "w-full justify-between bg-black/20 border-white/20 hover:bg-black/30 hover:border-white/30 text-white font-normal disabled:opacity-70",
            className,
          )}
        >
          <span className="truncate">
            {isLoading ? "Loading rooms..." : label}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          "p-0 bg-black/80 backdrop-blur-md border-white/20 text-white font-sans",
          montserrat.variable,
        )}
        style={{
          fontFamily: "inherit",
          width: "var(--radix-popover-trigger-width)",
        }}
      >
        <Command className="bg-transparent" shouldFilter={false}>
          <CommandInput
            placeholder="Search rooms..."
            value={query}
            onValueChange={setQuery}
            className="h-9 text-white placeholder:text-gray-400 border-0 border-b border-white/20 rounded-none ring-offset-0 focus-visible:ring-0 focus-visible:border-b-purple-500"
          />
          <CommandList className="hide-scrollbar max-h-64">
            <CommandEmpty>No rooms found.</CommandEmpty>
            <CommandGroup>
              {sortedRooms.map((room) => {
                const isSelected = selected.includes(room.name);
                return (
                  <CommandItem
                    key={room.name}
                    value={room.name}
                    onSelect={() => toggleRoom(room.name)}
                    className="text-white aria-selected:bg-purple-500/20 aria-selected:text-white"
                  >
                    <Check
                      className={cn(
                        "size-4",
                        isSelected ? "opacity-100 text-purple-400" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{room.name}</span>
                    {room.capacity !== null && (
                      <span className="ml-auto text-xs text-gray-400">
                        {room.capacity}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
