/**
 * Available Soon API Route (App Router)
 *
 * Returns rooms that will be available after a specified duration from the
 * current time in the app timezone, scoped to the requested campus.
 *
 * @method POST
 * @auth Required
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  addMinutesToCurrentTime,
  getCurrentTimeString,
  getCurrentDateString,
  getDateStringInApp,
  getTimeStringInApp,
  formatAppDateToISO,
} from "@/services/timeService";
import { SECURITY_HEADERS, getClientIpFromHeaders } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { handleApiError, ValidationError, DatabaseError } from "@/lib/errors";
import { logger, generateRequestId } from "@/lib/logger";
import type { Room } from "@/types/shared";
import { expandBookedRoomNames } from "@/services/roomCombos";
import { mapPrismaRoom } from "@/services/roomService";
import {
  CampusSchema,
  CampusesRequestSchema,
  parseCampuses,
} from "@/lib/campus";

const RequestSchema = z.object({
  durationMinutes: z.number().int().min(0).max(480).optional().default(30),
  campuses: z.array(CampusSchema).min(1).optional(),
});

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
    const validationResult = RequestSchema.safeParse(json);
    if (!validationResult.success) {
      throw new ValidationError("Invalid request parameters", {
        errors: validationResult.error.errors,
      });
    }

    const { durationMinutes, campuses: campusesInput } = validationResult.data;
    const campuses = parseCampuses(campusesInput);

    const currentTimeString = getCurrentTimeString();
    const currentDateString = getCurrentDateString();

    const futureDate = addMinutesToCurrentTime(durationMinutes);
    const futureDateString = getDateStringInApp(futureDate);
    const futureTimeString = getTimeStringInApp(futureDate);

    logger.info("Checking future availability", {
      requestId,
      currentTime: currentTimeString,
      currentDate: currentDateString,
      futureTime: futureTimeString,
      futureDate: futureDateString,
      durationMinutes,
      campuses,
    });

    const bookedRoomsResult = await prisma.timings.findMany({
      where: {
        Date: futureDateString,
        StartTime: { lte: futureTimeString },
        EndTime: { gt: futureTimeString },
        Campus: { in: campuses },
      },
      select: { Room: true },
      distinct: ["Room"],
      orderBy: { Room: "asc" },
    });

    const occupiedRoomNames = bookedRoomsResult.map((timing) => timing.Room);
    const expandedOccupiedRoomNames = Array.from(
      expandBookedRoomNames(new Set(occupiedRoomNames)),
    );

    const availableRoomsData = await prisma.rooms.findMany({
      where: {
        Name: { notIn: expandedOccupiedRoomNames },
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

    logger.info("Future availability processed", {
      requestId,
      campuses,
      totalRooms: processedRooms.length,
      durationMinutes,
    });

    const checkedAt = formatAppDateToISO(futureDate);

    return NextResponse.json(
      {
        checkedAt,
        campuses,
        offsetMinutes: durationMinutes,
        targetTime: futureTimeString,
        rooms: processedRooms,
      },
      { headers: SECURITY_HEADERS },
    );
  } catch (error: any) {
    logger.error("Error in available-soon API", error, { requestId, ip });

    if (error.code && !error.statusCode) {
      const dbError = new DatabaseError("Database query failed", {
        code: error.code,
        requestId,
      });
      const { statusCode, body } = handleApiError(dbError);
      return NextResponse.json(body, {
        status: statusCode,
        headers: SECURITY_HEADERS,
      });
    }

    const { statusCode, body } = handleApiError(error);
    return NextResponse.json(body, {
      status: statusCode,
      headers: SECURITY_HEADERS,
    });
  }
}
