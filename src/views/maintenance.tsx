import React from "react";
import { Construction } from "lucide-react";

export default function MaintenanceView() {
  return (
    <div className="relative flex flex-col flex-grow items-center justify-center text-center z-10 w-full px-4 sm:px-8 text-white">
      <div className="max-w-xl">
        <Construction className="mx-auto h-16 w-16 text-purple-500 mb-6" />
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          Maintenance Mode
        </h1>
        <p className="text-lg text-white/80 mb-2 font-bold">
          vacansee-au is currently undergoing scheduled maintenance.
        </p>
        <p className="text-md text-white/70">
          We&apos;re working hard to improve your experience and will be back
          online shortly. Thank you for your patience!
        </p>
      </div>
    </div>
  );
}
