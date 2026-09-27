import { Suspense } from "react";
import type { Metadata } from "next";
import ResetPasswordView from "@/views/reset-password";

export const metadata: Metadata = {
  title: "Reset Password",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordView />
    </Suspense>
  );
}
