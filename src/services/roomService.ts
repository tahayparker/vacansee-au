/**
 * Room Service
 *
 * Centralized business logic for room operations including
 * filtering, grouping, and availability calculations
 */

import { ROOM_GROUPINGS, EXCLUDED_ROOM_PATTERNS } from "@/constants";
import type { Room } from "@/types/shared";
import { compareRoomsByBuilding } from "@/services/roomParsing";

export function mapPrismaRoom(room: {
  Name: string;
  Building: string;
  RoomNumber: string;
  Campus: string | null;
  Capacity: number | null;
}): Room {
  return {
    name: room.Name,
    building: room.Building,
    roomNumber: room.RoomNumber,
    campus: room.Campus,
    capacity: room.Capacity,
  };
}

export function filterExcludedRooms(rooms: Room[]): Room[] {
  return rooms.filter((room) => {
    const roomNameLower = room.name.toLowerCase();
    return !EXCLUDED_ROOM_PATTERNS.some((pattern) =>
      roomNameLower.includes(pattern.toLowerCase()),
    );
  });
}

export function applyRoomGrouping(rooms: Room[]): Room[] {
  const availableBuildings = new Set(rooms.map((room) => room.building));
  const roomsToExclude = new Set<string>();

  Object.entries(ROOM_GROUPINGS).forEach(([mainRoom, subRooms]) => {
    if (!availableBuildings.has(mainRoom)) {
      subRooms.forEach((subRoom) => roomsToExclude.add(subRoom));
    }
  });

  return rooms.filter((room) => !roomsToExclude.has(room.building));
}

export function sortRoomsByBuilding(rooms: Room[]): Room[] {
  return [...rooms].sort((a, b) => compareRoomsByBuilding(a.name, b.name));
}

export function processRoomsList(rooms: Room[]): Room[] {
  let processedRooms = filterExcludedRooms(rooms);
  processedRooms = applyRoomGrouping(processedRooms);
  processedRooms = sortRoomsByBuilding(processedRooms);
  return processedRooms;
}

export function isRoomExcluded(roomName: string): boolean {
  const nameLower = roomName.toLowerCase();
  return EXCLUDED_ROOM_PATTERNS.some((pattern) =>
    nameLower.includes(pattern.toLowerCase()),
  );
}

export function getMainRoomForSubRoom(building: string): string | undefined {
  for (const [mainRoom, subRooms] of Object.entries(ROOM_GROUPINGS)) {
    if (subRooms.includes(building)) {
      return mainRoom;
    }
  }
  return undefined;
}

export function getSubRoomsForMainRoom(building: string): string[] {
  return ROOM_GROUPINGS[building] || [];
}

export function isMainRoom(building: string): boolean {
  return building in ROOM_GROUPINGS;
}

export function isSubRoom(building: string): boolean {
  return getMainRoomForSubRoom(building) !== undefined;
}

/** @deprecated Use compareRoomsByBuilding from roomParsing */
export function getRoomShortCode(
  roomIdentifier: string | null | undefined,
): string {
  if (!roomIdentifier) return "";
  const idx = roomIdentifier.indexOf("-");
  return (idx >= 0 ? roomIdentifier.slice(0, idx) : roomIdentifier).trim();
}

/** @deprecated Use sortRoomsByBuilding */
export function sortRoomsByShortCode(rooms: Room[]): Room[] {
  return sortRoomsByBuilding(rooms);
}
