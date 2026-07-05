"use client";

import { useState, useEffect } from "react";
import { useCampus } from "@/contexts/CampusContext";
import type { UowCampus } from "@/constants";

/**
 * Session-only campus filter for availability pages.
 * Starts from the profile default; changes are not persisted.
 */
export function useTemporaryCampusFilter() {
  const { campus: profileCampus, isLoading: campusLoading } = useCampus();
  const [selectedCampuses, setSelectedCampuses] = useState<UowCampus[] | null>(
    null,
  );

  useEffect(() => {
    if (campusLoading || selectedCampuses !== null) return;
    setSelectedCampuses([profileCampus]);
  }, [campusLoading, profileCampus, selectedCampuses]);

  return {
    selectedCampuses: selectedCampuses ?? [],
    setSelectedCampuses,
    campusReady: !campusLoading && selectedCampuses !== null,
  };
}
