import { Suspense } from "react";
import type { Metadata } from "next";
import LoginPage from "@/views/login";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}
