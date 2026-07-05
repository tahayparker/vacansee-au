import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="relative flex flex-col flex-grow items-center justify-center text-center z-10 w-full px-4 sm:px-8 text-white min-h-[60vh]">
      <div className="max-w-xl space-y-4">
        <Compass className="mx-auto h-16 w-16 text-purple-500 mb-2" />
        <h1 className="text-4xl sm:text-5xl font-bold">Page not found</h1>
        <p className="text-md text-white/70">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-white/40 bg-transparent px-6 py-2.5 text-sm font-medium text-white hover:bg-white/10 hover:border-white/60 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
