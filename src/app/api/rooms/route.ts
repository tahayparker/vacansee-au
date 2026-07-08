/**
 * Rooms List API Route (App Router)
 *
 * Returns all rooms with details, excluding consultation/online rooms.
 *
 * @method GET
 * @auth Required
 */

import { NextResponse, type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { SECURITY_HEADERS, getClientIpFromHeaders } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { handleApiError, DatabaseError } from "@/lib/errors";
import { logger, generateRequestId } from "@/lib/logger";
import { cacheGetOrSet } from "@/lib/cache";
import type { Room } from "@/types/shared";
import { CACHE_TTL } from "@/constants";
import { mapPrismaRoom } from "@/services/roomService";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const ip = getClientIpFromHeaders(req.headers);

  try {
    await rateLimit(ip);

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getClaims();
    const userId = authData?.claims?.sub;
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401, headers: SECURITY_HEADERS },
      );
    }

    logger.info("Fetching rooms list", { requestId, userId });

    const rooms = await cacheGetOrSet(
      `rooms-list-${userId}`,
      async () => {
        const roomsData = await prisma.rooms.findMany({
          select: {
            Name: true,
            Building: true,
            RoomNumber: true,
            Campus: true,
            Capacity: true,
            RoomType: true,
            EquipmentTier: true,
            SpecialFeatures: true,
            SimilarVenues: true,
            FrontImage: true,
            RearImage: true,
          },
        });

        const roomsList: Room[] = roomsData
          .map(mapPrismaRoom)
          .filter(
            (room) =>
              !room.name.toLowerCase().includes("consultation") &&
              !room.name.toLowerCase().includes("online"),
          );

        roomsList.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        );

        return roomsList;
      },
      {
        ttl: CACHE_TTL.ROOMS * 1000,
        staleTime: CACHE_TTL.ROOMS * 0.8 * 1000,
      },
    );

    logger.info("Rooms list fetched successfully", {
      requestId,
      totalRooms: rooms.length,
    });

    return NextResponse.json(
      { total: rooms.length, rooms },
      {
        headers: {
          ...SECURITY_HEADERS,
          "Cache-Control": `public, max-age=${CACHE_TTL.ROOMS}, stale-while-revalidate=${CACHE_TTL.ROOMS * 2}`,
        },
      },
    );
  } catch (error: any) {
    logger.error("Error in rooms API", error, { requestId, ip });

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
