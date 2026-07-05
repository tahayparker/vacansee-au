import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MaintenanceView from "@/views/maintenance";

export const metadata: Metadata = {
  title: "Maintenance Mode",
  robots: { index: false, follow: false },
};

export default function Page() {
  if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE !== "true") {
    redirect("/");
  }
  return <MaintenanceView />;
}
