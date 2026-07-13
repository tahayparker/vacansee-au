"use client";

import { ChevronDown, ChevronsUpDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ALL_CAMPUSES,
  formatCampusSelectionLabel,
  isAllCampusesSelected,
} from "@/lib/campus";
import type { UowCampus } from "@/constants";
import { cn } from "@/lib/utils";

interface CampusMultiSelectProps {
  selected: UowCampus[];
  onChange: (campuses: UowCampus[]) => void;
  className?: string;
  /**
   * "link" — inline purple text trigger (default; used on Now/Soon pages).
   * "button" — full-width bordered button trigger matching other multiselects.
   */
  variant?: "link" | "button";
  disabled?: boolean;
}

function CampusOption({
  checked,
  label,
  onSelect,
  bold,
}: {
  checked: boolean;
  label: string;
  onSelect: (next: boolean) => void;
  bold?: boolean;
}) {
  return (
    <div className="flex w-full items-center gap-3 rounded-md px-3 py-2 hover:bg-white/10 select-none">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onSelect(value === true)}
        className={cn(
          "size-4 border-white/50 bg-white/5",
          "data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-400",
          "data-[state=checked]:text-white",
        )}
      />
      <button
        type="button"
        onClick={() => onSelect(!checked)}
        className={cn(
          "flex-1 text-left text-sm text-white cursor-pointer",
          bold && "font-medium",
        )}
      >
        {label}
      </button>
    </div>
  );
}

export function CampusMultiSelect({
  selected,
  onChange,
  className,
  variant = "link",
  disabled = false,
}: CampusMultiSelectProps) {
  const allSelected = isAllCampusesSelected(selected);

  return (
    <Popover>
      <PopoverTrigger asChild>
        {variant === "button" ? (
          <Button
            variant="ghost"
            role="combobox"
            disabled={disabled}
            className={cn(
              "w-full justify-between border border-white/20 bg-black/20 hover:bg-black/30 hover:border-white/30 text-white font-normal disabled:opacity-70",
              className,
            )}
          >
            <span className="truncate">
              {disabled
                ? "Loading campuses..."
                : formatCampusSelectionLabel(selected)}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        ) : (
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 font-medium text-purple-400 hover:text-purple-300",
              "border-b border-dashed border-purple-400/60 hover:border-purple-300/80",
              "transition-colors cursor-pointer align-middle",
              className,
            )}
          >
            {formatCampusSelectionLabel(selected)}
            <ChevronDown className="h-3.5 w-3.5 opacity-80 shrink-0" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="center"
        sideOffset={8}
        className={cn(
          "w-64 p-0 overflow-hidden",
          "bg-black/80 backdrop-blur-xl border border-white/20 shadow-2xl",
          "text-white",
        )}
        style={
          variant === "button"
            ? { width: "var(--radix-popover-trigger-width)" }
            : undefined
        }
      >
        <div className="max-h-72 overflow-y-auto p-2">
          <CampusOption
            checked={allSelected}
            label="All"
            bold
            onSelect={(next) => onChange(next ? [...ALL_CAMPUSES] : [])}
          />
          <div className="my-1.5 h-px bg-white/15" />
          {ALL_CAMPUSES.map((campus) => (
            <CampusOption
              key={campus}
              checked={selected.includes(campus)}
              label={campus}
              onSelect={(next) => {
                if (next) {
                  onChange(
                    selected.includes(campus)
                      ? selected
                      : [...selected, campus],
                  );
                } else {
                  onChange(selected.filter((c) => c !== campus));
                }
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
