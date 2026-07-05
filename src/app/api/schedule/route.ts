/**
 * Schedule API Route (App Router)
 *
 * Returns the complete weekly schedule data for all rooms. Data is fetched
 * from GitHub (with local fallback) and cached.
 *
 * @method GET
 * @auth Required
 */

import { NextResponse, type NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import { cacheGetOrSet, cacheDelete } from "@/lib/cache";
import { SECURITY_HEADERS, getClientIpFromHeaders } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { handleApiError, ExternalServiceError } from "@/lib/errors";
import { logger, generateRequestId } from "@/lib/logger";
import { measureAsync } from "@/lib/monitoring";
import type { ScheduleResponse } from "@/types/api";
import { CACHE_TTL, EXTERNAL_URLS } from "@/constants";

const CACHE_KEY = "schedule-data-v2";

function isDateKeyedSchedule(data: unknown): data is ScheduleResponse {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    typeof data[0] === "object" &&
    data[0] !== null &&
    "date" in data[0] &&
    typeof (data[0] as { date?: unknown }).date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test((data[0] as { date: string }).date)
  );
}

function readLocalSchedule(): ScheduleResponse | null {
  const schedulePath = path.join(process.cwd(), "public", "scheduleData.json");
  if (!fs.existsSync(schedulePath)) return null;

  const parsed: ScheduleResponse = JSON.parse(
    fs.readFileSync(schedulePath, "utf8"),
  );
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid local data format: not an array");
  }
  return parsed;
}

async function fetchRemoteSchedule(): Promise<ScheduleResponse> {
  const githubResponse = await fetch(EXTERNAL_URLS.SCHEDULE_DATA_URL, {
    headers: { "User-Agent": "vacansee-au-app" },
  });

  if (!githubResponse.ok) {
    throw new ExternalServiceError("GitHub fetch failed");
  }

  const parsed: ScheduleResponse = JSON.parse(await githubResponse.text());
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid data format: not an array");
  }
  return parsed;
}

async function loadScheduleData(requestId: string): Promise<ScheduleResponse> {
  const local = readLocalSchedule();
  if (local && isDateKeyedSchedule(local)) {
    logger.info("Using local date-keyed schedule file", {
      requestId,
      daysCount: local.length,
    });
    return local;
  }

  try {
    const remote = await fetchRemoteSchedule();
    if (isDateKeyedSchedule(remote)) {
      return remote;
    }

    if (local) {
      logger.warn("Remote schedule is legacy format; using local fallback", {
        requestId,
      });
      return local;
    }

    return remote;
  } catch (githubError) {
    logger.warn("Falling back to local schedule file", {
      requestId,
      error: githubError,
    });

    if (!local) {
      throw new ExternalServiceError(
        "Schedule data not found in GitHub or locally",
      );
    }
    return local;
  }
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

    logger.info("Fetching schedule data", { requestId });

    const forceRefresh = req.nextUrl.searchParams.get("refresh") === "1";
    if (forceRefresh) {
      cacheDelete(CACHE_KEY);
    }

    const scheduleData = await cacheGetOrSet(
      CACHE_KEY,
      async () => {
        return await measureAsync("fetch-schedule", () =>
          loadScheduleData(requestId),
        );
      },
      {
        ttl: CACHE_TTL.SCHEDULE * 1000,
        staleTime: CACHE_TTL.SCHEDULE * 0.8 * 1000,
      },
    );

    logger.info("Schedule data sent successfully", {
      requestId,
      daysCount: scheduleData.length,
    });

    return NextResponse.json(scheduleData, {
      headers: {
        ...SECURITY_HEADERS,
        "Cache-Control": `public, max-age=${CACHE_TTL.SCHEDULE}, stale-while-revalidate=${CACHE_TTL.SCHEDULE * 2}`,
      },
    });
  } catch (error: any) {
    logger.error("Error in schedule API", error, { requestId, ip });
    const { statusCode, body } = handleApiError(error);
    return NextResponse.json(body, {
      status: statusCode,
      headers: SECURITY_HEADERS,
    });
  }
}
