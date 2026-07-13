"use client";

import * as React from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import {
  DayPicker,
  getDefaultClassNames,
  labelNext,
  labelPrevious,
  useDayPicker,
  type DayButton,
} from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  showYearSwitcher = false,
  yearRange = 12,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
  /** Enables clicking the caption to drill down: days -> months -> years. */
  showYearSwitcher?: boolean;
  /** Number of years shown per page in the years view. */
  yearRange?: number;
}) {
  const defaultClassNames = getDefaultClassNames();

  const [navView, setNavView] = React.useState<"days" | "months" | "years">(
    "days",
  );
  const initialYear = (
    props.month ??
    props.defaultMonth ??
    new Date()
  ).getFullYear();
  const [monthsYear, setMonthsYear] = React.useState(initialYear);
  const [displayYears, setDisplayYears] = React.useState(() => ({
    from: initialYear - Math.floor(yearRange / 2 - 1),
    to: initialYear + Math.ceil(yearRange / 2),
  }));

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-background p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months,
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "relative rounded-md border border-input shadow-xs has-focus:border-ring has-focus:ring-[3px] has-focus:ring-ring/50",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          "absolute inset-0 bg-popover opacity-0",
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          "font-medium select-none",
          captionLayout === "label"
            ? "text-sm"
            : "flex h-8 items-center gap-1 rounded-md pr-1 pl-2 text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
          defaultClassNames.caption_label,
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex gap-1", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 rounded-md text-[0.8rem] font-normal text-muted-foreground select-none",
          defaultClassNames.weekday,
        ),
        week: cn("mt-1 flex w-full gap-1", defaultClassNames.week),
        week_number_header: cn(
          "w-(--cell-size) select-none",
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          "text-[0.8rem] text-muted-foreground select-none",
          defaultClassNames.week_number,
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-md",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-md"
            : "[&:first-child[data-selected=true]_button]:rounded-l-md",
          defaultClassNames.day,
        ),
        range_start: cn(
          "rounded-l-md bg-accent",
          defaultClassNames.range_start,
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
        today: cn(
          "rounded-md bg-accent text-accent-foreground data-[selected=true]:rounded-none",
          defaultClassNames.today,
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside,
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled,
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          );
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            );
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            );
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          );
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          );
        },
        ...(showYearSwitcher
          ? {
              Nav: ({ className: navClassName, ...navProps }) => (
                <CalendarNav
                  className={navClassName}
                  navView={navView}
                  monthsYear={monthsYear}
                  setMonthsYear={setMonthsYear}
                  displayYears={displayYears}
                  setDisplayYears={setDisplayYears}
                  startMonth={props.startMonth}
                  endMonth={props.endMonth}
                  {...navProps}
                />
              ),
              CaptionLabel: (captionProps) => (
                <CalendarCaptionLabel
                  {...captionProps}
                  navView={navView}
                  setNavView={setNavView}
                  monthsYear={monthsYear}
                  setMonthsYear={setMonthsYear}
                  displayYears={displayYears}
                  setDisplayYears={setDisplayYears}
                  yearRange={yearRange}
                />
              ),
              MonthGrid: ({
                className: gridClassName,
                children: gridChildren,
                ...gridProps
              }) => (
                <CalendarMonthGrid
                  className={gridClassName}
                  navView={navView}
                  setNavView={setNavView}
                  monthsYear={monthsYear}
                  setMonthsYear={setMonthsYear}
                  displayYears={displayYears}
                  startMonth={props.startMonth}
                  endMonth={props.endMonth}
                  {...gridProps}
                >
                  {gridChildren}
                </CalendarMonthGrid>
              ),
            }
          : {}),
        ...components,
      }}
      {...props}
    />
  );
}

interface YearRangeState {
  from: number;
  to: number;
}

/** Prev/next navigation that pages by month, year, or year-range depending on the active drill-down view. */
function CalendarNav({
  className,
  navView,
  monthsYear,
  setMonthsYear,
  displayYears,
  setDisplayYears,
  startMonth,
  endMonth,
}: {
  className?: string;
  navView: "days" | "months" | "years";
  monthsYear: number;
  setMonthsYear: React.Dispatch<React.SetStateAction<number>>;
  displayYears: YearRangeState;
  setDisplayYears: React.Dispatch<React.SetStateAction<YearRangeState>>;
  startMonth?: Date;
  endMonth?: Date;
}) {
  const { previousMonth, nextMonth, goToMonth } = useDayPicker();
  const yearSpan = displayYears.to - displayYears.from + 1;

  const isPreviousDisabled =
    navView === "years"
      ? !!startMonth && displayYears.from - 1 < startMonth.getFullYear()
      : navView === "months"
        ? !!startMonth && monthsYear - 1 < startMonth.getFullYear()
        : !previousMonth;

  const isNextDisabled =
    navView === "years"
      ? !!endMonth && displayYears.to + 1 > endMonth.getFullYear()
      : navView === "months"
        ? !!endMonth && monthsYear + 1 > endMonth.getFullYear()
        : !nextMonth;

  const handlePrevious = () => {
    if (navView === "years") {
      setDisplayYears((prev) => ({
        from: prev.from - yearSpan,
        to: prev.to - yearSpan,
      }));
      return;
    }
    if (navView === "months") {
      setMonthsYear((year) => year - 1);
      return;
    }
    if (previousMonth) goToMonth(previousMonth);
  };

  const handleNext = () => {
    if (navView === "years") {
      setDisplayYears((prev) => ({
        from: prev.from + yearSpan,
        to: prev.to + yearSpan,
      }));
      return;
    }
    if (navView === "months") {
      setMonthsYear((year) => year + 1);
      return;
    }
    if (nextMonth) goToMonth(nextMonth);
  };

  return (
    <nav className={cn(className, "pointer-events-none")}>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        disabled={isPreviousDisabled}
        aria-label={
          navView === "days" ? labelPrevious(previousMonth) : "Go to previous"
        }
        onClick={handlePrevious}
        className="pointer-events-auto size-(--cell-size) select-none p-0 aria-disabled:opacity-50"
      >
        <ChevronLeftIcon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        disabled={isNextDisabled}
        aria-label={navView === "days" ? labelNext(nextMonth) : "Go to next"}
        onClick={handleNext}
        className="pointer-events-auto size-(--cell-size) select-none p-0 aria-disabled:opacity-50"
      >
        <ChevronRightIcon className="size-4" />
      </Button>
    </nav>
  );
}

/** Clickable caption that drills down: days -> months -> years. */
function CalendarCaptionLabel({
  children,
  navView,
  setNavView,
  monthsYear,
  setMonthsYear,
  displayYears,
  setDisplayYears,
  yearRange,
}: {
  children?: React.ReactNode;
  navView: "days" | "months" | "years";
  setNavView: React.Dispatch<React.SetStateAction<"days" | "months" | "years">>;
  monthsYear: number;
  setMonthsYear: React.Dispatch<React.SetStateAction<number>>;
  displayYears: YearRangeState;
  setDisplayYears: React.Dispatch<React.SetStateAction<YearRangeState>>;
  yearRange: number;
}) {
  const { months } = useDayPicker();

  const label =
    navView === "days"
      ? children
      : navView === "months"
        ? monthsYear
        : `${displayYears.from} – ${displayYears.to}`;

  return (
    <Button
      variant="ghost"
      size="sm"
      type="button"
      className="h-8 truncate px-2 text-sm font-medium"
      onClick={() => {
        if (navView === "days") {
          setMonthsYear(
            months[0]?.date.getFullYear() ?? new Date().getFullYear(),
          );
          setNavView("months");
        } else if (navView === "months") {
          setDisplayYears({
            from: monthsYear - Math.floor(yearRange / 2 - 1),
            to: monthsYear + Math.ceil(yearRange / 2),
          });
          setNavView("years");
        } else {
          setNavView("months");
        }
      }}
    >
      {label}
    </Button>
  );
}

/** Renders the day grid, or a month/year picker grid depending on drill-down state. */
function CalendarMonthGrid({
  className,
  children,
  navView,
  setNavView,
  monthsYear,
  setMonthsYear,
  displayYears,
  startMonth,
  endMonth,
  ...props
}: Omit<React.ComponentProps<"table">, "children"> & {
  children?: React.ReactNode;
  navView: "days" | "months" | "years";
  setNavView: React.Dispatch<React.SetStateAction<"days" | "months" | "years">>;
  monthsYear: number;
  setMonthsYear: React.Dispatch<React.SetStateAction<number>>;
  displayYears: YearRangeState;
  startMonth?: Date;
  endMonth?: Date;
}) {
  const { goToMonth } = useDayPicker();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  if (navView === "years") {
    return (
      <div className={cn("grid grid-cols-3 gap-1.5 p-1", className)}>
        {Array.from(
          { length: displayYears.to - displayYears.from + 1 },
          (_, i) => {
            const year = displayYears.from + i;
            const isDisabled =
              (!!startMonth && year < startMonth.getFullYear()) ||
              (!!endMonth && year > endMonth.getFullYear());
            return (
              <Button
                key={year}
                type="button"
                variant="ghost"
                disabled={isDisabled}
                className={cn(
                  "h-9 w-full text-sm font-normal",
                  year === currentYear &&
                    "ring-1 ring-inset ring-purple-400/60",
                )}
                onClick={() => {
                  setMonthsYear(year);
                  setNavView("months");
                }}
              >
                {year}
              </Button>
            );
          },
        )}
      </div>
    );
  }

  if (navView === "months") {
    return (
      <div className={cn("grid grid-cols-3 gap-1.5 p-1", className)}>
        {MONTH_LABELS.map((label, i) => {
          const isDisabled =
            (!!startMonth &&
              monthsYear === startMonth.getFullYear() &&
              i < startMonth.getMonth()) ||
            (!!endMonth &&
              monthsYear === endMonth.getFullYear() &&
              i > endMonth.getMonth());
          return (
            <Button
              key={label}
              type="button"
              variant="ghost"
              disabled={isDisabled}
              className={cn(
                "h-9 w-full text-sm font-normal",
                monthsYear === currentYear &&
                  i === currentMonth &&
                  "ring-1 ring-inset ring-purple-400/60",
              )}
              onClick={() => {
                goToMonth(new Date(monthsYear, i, 1));
                setNavView("days");
              }}
            >
              {label}
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <table className={className} {...props}>
      {children}
    </table>
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-end=true]:bg-purple-600/80 data-[range-end=true]:text-white data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md data-[range-start=true]:bg-purple-600/80 data-[range-start=true]:text-white data-[selected-single=true]:bg-purple-600/80 data-[selected-single=true]:text-white dark:hover:bg-white/10 dark:hover:text-white [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
