import type { Metadata } from "next";
import DocsPage from "@/views/docs";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Learn about vacansee-au - find available rooms on campus with real-time scheduling data",
};

export default function Page() {
  return <DocsPage />;
}
