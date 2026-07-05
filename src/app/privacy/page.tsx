import type { Metadata } from "next";
import PrivacyPage from "@/views/privacy";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function Page() {
  return <PrivacyPage />;
}
