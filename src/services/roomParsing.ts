/**
 * Room parsing utilities for UOW AU room identifiers.
 *
 * Format: "{Building}-{RoomNumber}" e.g. "25-153"
 * No hyphen means the whole value is a building/location (e.g. "Online").
 */

/** Buildings/locations with no campus in the AU model. */
export const NO_CAMPUS_BUILDINGS = new Set([
  "Online",
  "Whitlam Leisure Centre",
  "Keira High School",
  "Liverpool Public School",
  "FMDS",
]);

export function parseRoomName(roomName: string): {
  building: string;
  roomNumber: string;
} {
  if (!roomName) return { building: "", roomNumber: "" };
  const idx = roomName.indexOf("-");
  if (idx >= 0) {
    return {
      building: roomName.slice(0, idx).trim(),
      roomNumber: roomName.slice(idx + 1).trim(),
    };
  }
  return { building: roomName.trim(), roomNumber: "" };
}

/** Display label for graphs/lists — building only when no room number. */
export function getRoomDisplayLabel(roomIdentifier: string): string {
  const { building, roomNumber } = parseRoomName(roomIdentifier);
  return roomNumber ? `${building}-${roomNumber}` : building;
}

/** Sort key: building then room number (numeric-aware). */
export function compareRoomsByBuilding(a: string, b: string): number {
  const parsedA = parseRoomName(a);
  const parsedB = parseRoomName(b);
  const buildingCompare = parsedA.building.localeCompare(
    parsedB.building,
    undefined,
    { numeric: true },
  );
  if (buildingCompare !== 0) return buildingCompare;
  return parsedA.roomNumber.localeCompare(parsedB.roomNumber, undefined, {
    numeric: true,
  });
}
