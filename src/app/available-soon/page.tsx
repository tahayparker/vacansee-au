import type { Metadata } from "next";
import AvailableSoonPage from "@/views/available-soon";

export const metadata: Metadata = {
  title: "Available Soon",
};

export default function Page() {
  return <AvailableSoonPage />;
}
