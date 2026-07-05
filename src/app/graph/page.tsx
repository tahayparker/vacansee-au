import type { Metadata } from "next";
import GraphPage from "@/views/graph";

export const metadata: Metadata = {
  title: "Room Availability Graph",
};

export default function Page() {
  return <GraphPage />;
}
