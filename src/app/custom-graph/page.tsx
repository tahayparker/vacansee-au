import type { Metadata } from "next";
import CustomGraphPage from "@/views/custom-graph";

export const metadata: Metadata = {
  title: "Custom Graph",
};

export default function Page() {
  return <CustomGraphPage />;
}
