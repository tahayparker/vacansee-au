/**
 * Check Availability API Route (App Router)
 *
 * Checks if a specific room is available during a requested time slot and
 * returns conflict details if occupied. Defaults to the Wollongong campus.
 *
 * @method POST
 * @auth Required
 */

import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { SECURITY_HEADERS, getClientIpFromHeaders } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { handleApiError, ValidationError, DatabaseError } from "@/lib/errors";
import { logger, generateRequestId } from "@/lib/logger";
import { AvailabilityCheckRequestSchema } from "@/types/api";
import { expandRoomNamesForQuery } from "@/services/roomCombos";

const DEFAULT_CAMPUS = "Wollongong";

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
    const validationResult = AvailabilityCheckRequestSchema.safeParse(json);
    if (!validationResult.success) {
      throw new ValidationError("Invalid request parameters", {
        errors: validationResult.error.errors,
      });
    }

    const { roomName, date, startTime, endTime } = validationResult.data;

    logger.info("Checking room availability", {
      requestId,
      roomName,
      date,
      startTime,
      endTime,
    });

    const relatedRoomNames = expandRoomNamesForQuery(roomName);

    const conflicts = await prisma.timings.findMany({
      where: {
        Room: { in: relatedRoomNames },
        Date: date,
        StartTime: { lt: endTime },
        EndTime: { gt: startTime },
        Campus: DEFAULT_CAMPUS,
      },
      select: {
        SubCode: true,
        Class: true,
        StartTime: true,
        EndTime: true,
        Room: true,
      },
      orderBy: { StartTime: "asc" },
    });

    const isAvailable = conflicts.length === 0;
    const checkedParams = { roomName, date, startTime, endTime };

    if (isAvailable) {
      return NextResponse.json(
        { available: true, checked: checkedParams },
        { headers: SECURITY_HEADERS },
      );
    }

    const conflictDetails = conflicts.map((c) => ({
      subject: c.SubCode,
      classType: c.Class,
      startTime: c.StartTime,
      endTime: c.EndTime,
      room: c.Room,
    }));

    return NextResponse.json(
      {
        available: false,
        checked: checkedParams,
        classes: conflictDetails,
      },
      { headers: SECURITY_HEADERS },
    );
  } catch (error: any) {
    logger.error("Error in check-availability API", error, { requestId, ip });

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
