"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative flex flex-col flex-grow items-center justify-center text-center z-10 w-full px-4 sm:px-8 text-white min-h-[60vh]">
      <div className="max-w-xl space-y-4">
        <TriangleAlert className="mx-auto h-16 w-16 text-purple-500 mb-2" />
        <h1 className="text-4xl sm:text-5xl font-bold">Something went wrong</h1>
        <p className="text-md text-white/70">
          An unexpected error occurred. Please try again.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center rounded-full border border-white/40 bg-transparent px-6 py-2.5 text-sm font-medium text-white hover:bg-white/10 hover:border-white/60 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
