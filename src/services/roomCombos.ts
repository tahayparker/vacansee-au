// src/services/roomCombos.ts
// Combined/individual room relationships for availability queries.
// Empty for UOW AU — combo rules can be re-introduced once mapped.

export const COMBINED_ROOM_MAP: Record<string, [string, string]> = {};

/** Expand booked room names to include any combo-linked rooms. */
export function expandBookedRoomNames(
  bookedRoomNames: Set<string>,
): Set<string> {
  // No combo rules configured for AU yet.
  return new Set(bookedRoomNames);
}

/** Expand a room name for conflict checks (combo-linked rooms). */
export function expandRoomNamesForQuery(roomName: string): string[] {
  if (!roomName) return [];
  return [roomName];
}
