import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a time string based on the user's preference (12h or 24h format)
 * @param time - Time string in HH:mm format (e.g., "14:30", "09:00")
 * @param use24h - Whether to use 24-hour format
 * @returns Formatted time string
 */
export function formatTime(time: string, use24h: boolean): string {
  if (!time) return "";

  if (use24h) {
    return time; // Already in HH:mm format
  }

  // Convert to 12h format
  try {
    const [hours, minutes] = time.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return time;

    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  } catch (error) {
    console.error("Error formatting time:", error);
    return time;
  }
}
