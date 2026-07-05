import type { Metadata } from "next";
import RoomsPage from "@/views/rooms";

export const metadata: Metadata = {
  title: "Room Details",
};

export default function Page() {
  return <RoomsPage />;
}
