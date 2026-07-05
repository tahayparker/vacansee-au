import type { Metadata } from "next";
import AvailableNowPage from "@/views/available-now";

export const metadata: Metadata = {
  title: "Available Now",
};

export default function Page() {
  return <AvailableNowPage />;
}
