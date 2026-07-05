import type { Metadata } from "next";
import LegalPage from "@/views/legal";

export const metadata: Metadata = {
  title: "Legal - Terms of Service",
};

export default function Page() {
  return <LegalPage />;
}
