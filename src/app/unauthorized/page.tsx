import { Suspense } from "react";
import type { Metadata } from "next";
import UnauthorizedPage from "@/views/unauthorized";

export const metadata: Metadata = {
  title: "Unauthorized",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <UnauthorizedPage />
    </Suspense>
  );
}
