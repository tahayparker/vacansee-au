import type { Metadata } from "next";
import CheckAvailabilityPage from "@/views/check";

export const metadata: Metadata = {
  title: "Check Availability",
};

export default function Page() {
  return <CheckAvailabilityPage />;
}
