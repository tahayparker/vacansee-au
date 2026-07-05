/**
 * Available Now API Route (App Router)
 *
 * Returns rooms currently available based on the current time in the app
 * timezone, scoped to the requested campus.
 *
 * @method POST
 * @auth Required
 */

import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentAppTime,
  getCurrentTimeString,
  getCurrentDateString,
  formatAppDateToISO,
} from "@/services/timeService";
import { SECURITY_HEADERS, getClientIpFromHeaders } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { handleApiError, DatabaseError } from "@/lib/errors";
import { logger, generateRequestId } from "@/lib/logger";
import type { Room } from "@/types/shared";
import { expandBookedRoomNames } from "@/services/roomCombos";
import { mapPrismaRoom } from "@/services/roomService";
import { CampusesRequestSchema, parseCampuses } from "@/lib/campus";

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const ip = getClientIpFromHeaders(req.headers);

  try {
    await rateLimit(ip);

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getClaims();
    if (!authData?.claims) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401, headers: SECURITY_HEADERS },
      );
    }

    const json = await req.json().catch(() => ({}));
    const campusInput = CampusesRequestSchema.safeParse(json);
    const campuses = parseCampuses(
      campusInput.success ? campusInput.data.campuses : undefined,
    );

    const currentDateString = getCurrentDateString();
    const currentTimeString = getCurrentTimeString();

    logger.info("Checking current availability", {
      requestId,
      date: currentDateString,
      time: currentTimeString,
      campuses,
    });

    const bookedTimings = await prisma.timings.findMany({
      where: {
        Date: currentDateString,
        StartTime: { lte: currentTimeString },
        EndTime: { gt: currentTimeString },
        Campus: { in: campuses },
      },
      select: { Room: true },
      distinct: ["Room"],
    });

    const bookedRoomNames = bookedTimings.map((timing) => timing.Room);
    const expandedBookedRoomNames = Array.from(
      expandBookedRoomNames(new Set(bookedRoomNames)),
    );

    const availableRoomsData = await prisma.rooms.findMany({
      where: {
        Name: { notIn: expandedBookedRoomNames },
        Campus: { in: campuses },
      },
      select: {
        Name: true,
        Building: true,
        RoomNumber: true,
        Campus: true,
        Capacity: true,
      },
    });

    const processedRooms: Room[] = availableRoomsData
      .map(mapPrismaRoom)
      .filter(
        (room) =>
          !room.name.toLowerCase().includes("consultation") &&
          !room.name.toLowerCase().includes("online"),
      )
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );

    logger.info("Available rooms processed", {
      requestId,
      campuses,
      totalRooms: processedRooms.length,
    });

    const checkedAt = formatAppDateToISO(getCurrentAppTime());

    return NextResponse.json(
      { checkedAt, campuses, rooms: processedRooms },
      { headers: SECURITY_HEADERS },
    );
  } catch (error: any) {
    logger.error("Error in available-now API", error, { requestId, ip });

    if (error.code && !error.statusCode) {
      const dbError = new DatabaseError("Database query failed", {
        code: error.code,
        requestId,
      });
      const { statusCode, body } = handleApiError(dbError);
      return NextResponse.json(
        { ...body, requestId },
        { status: statusCode, headers: SECURITY_HEADERS },
      );
    }

    const { statusCode, body } = handleApiError(error);
    return NextResponse.json(
      { ...body, requestId },
      { status: statusCode, headers: SECURITY_HEADERS },
    );
  }
}
