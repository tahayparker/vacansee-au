import "@/styles/globals.css";
import type { Metadata, Viewport } from "next";
import { montserrat } from "@/lib/fonts";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "vacansee-au",
    template: "%s - vacansee-au",
  },
  applicationName: "vacansee-au",
  description:
    "The ultimate guide to finding empty rooms at UOW. Check room availability, schedules, and find the perfect study space.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "vacansee-au",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-config": "/browserconfig.xml",
    "msapplication-TileColor": "#8b5cf6",
    "msapplication-tap-highlight": "no",
  },
};

export const viewport: Viewport = {
  themeColor: "#8b5cf6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ backgroundColor: "#000000" }}>
      <body
        className={montserrat.className}
        style={{ backgroundColor: "#000000", margin: 0, padding: 0 }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
