import type { Metadata } from "next";
import JrCalendarPage from "@/views/jr";

export const metadata: Metadata = {
  title: "JR Calendar",
};

export default function Page() {
  return <JrCalendarPage />;
}
