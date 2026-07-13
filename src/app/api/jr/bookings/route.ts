/**
 * JR Bookings API Route (App Router)
 *
 * Returns all date-specific room bookings (from AU-Timings.Date) for the
 * `/jr` calendar. The client fetches this once and builds an in-memory
 * index so that switching days/weeks/months/rooms requires no network
 * round-trip.
 *
 * @method GET
 * @auth Required
 * @query refresh=1  Bypass the server cache and refetch from the database.
 */

import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { SECURITY_HEADERS, getClientIpFromHeaders } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { handleApiError, DatabaseError } from "@/lib/errors";
import { logger, generateRequestId } from "@/lib/logger";
import { cacheGetOrSet, cacheDelete } from "@/lib/cache";
import { EXCLUDED_ROOM_PATTERNS } from "@/constants";
import type { JrBooking, JrBookingsResponse } from "@/types/jr";

const CACHE_KEY = "jr-bookings-v1";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function fetchBookings(): Promise<JrBooking[]> {
  const timings = await prisma.timings.findMany({
    where: { Date: { not: "" } },
    select: {
      Date: true,
      Room: true,
      Campus: true,
      StartTime: true,
      EndTime: true,
      SubCode: true,
      Class: true,
      Description: true,
    },
  });

  return timings
    .filter(
      (t) =>
        !EXCLUDED_ROOM_PATTERNS.some((pattern) =>
          t.Room.toLowerCase().includes(pattern),
        ),
    )
    .map((t) => ({
      date: t.Date,
      room: t.Room,
      campus: t.Campus,
      startTime: t.StartTime,
      endTime: t.EndTime,
      subjectCode: t.SubCode,
      classType: t.Class,
      description: t.Description,
    }));
}

function getDateRange(
  bookings: JrBooking[],
): { min: string; max: string } | null {
  if (bookings.length === 0) return null;
  let min = bookings[0].date;
  let max = bookings[0].date;
  for (const booking of bookings) {
    if (booking.date < min) min = booking.date;
    if (booking.date > max) max = booking.date;
  }
  return { min, max };
}

export async function GET(req: NextRequest) {
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

    const forceRefresh = req.nextUrl.searchParams.get("refresh") === "1";
    if (forceRefresh) {
      cacheDelete(CACHE_KEY);
    }

    logger.info("Fetching JR bookings", { requestId, forceRefresh });

    const bookings = await cacheGetOrSet(CACHE_KEY, fetchBookings, {
      ttl: CACHE_TTL_MS,
      staleTime: CACHE_TTL_MS * 0.8,
    });

    const responseBody: JrBookingsResponse = {
      fetchedAt: new Date().toISOString(),
      total: bookings.length,
      dateRange: getDateRange(bookings),
      bookings,
    };

    logger.info("JR bookings fetched successfully", {
      requestId,
      total: bookings.length,
    });

    return NextResponse.json(responseBody, {
      headers: {
        ...SECURITY_HEADERS,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error: any) {
    logger.error("Error in JR bookings API", error, { requestId, ip });

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
