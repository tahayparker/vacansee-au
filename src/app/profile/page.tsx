import type { Metadata } from "next";
import Profile from "@/views/profile";

export const metadata: Metadata = {
  title: "Profile",
};

export default function Page() {
  return <Profile />;
}
