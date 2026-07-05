// next.config.ts
import { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Performance optimizations
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  // SWC minification is enabled by default in Next.js 15

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google avatars
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com", // GitHub avatars
      },
      {
        protocol: "https",
        hostname: "*.supabase.co", // Supabase storage
      },
      {
        protocol: "https",
        hostname: "platform-lookaside.fbsbx.com", // Facebook avatars
      },
      {
        protocol: "https",
        hostname: "graph.microsoft.com", // Microsoft avatars
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/offline.html",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*.(png|jpg|jpeg|gif|svg|ico|webp)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // --- Redirects for "/available-now" ---
      {
        source: "/CurrentlyAvailable",
        destination: "/available-now",
        permanent: true,
      },
      {
        source: "/availablenow",
        destination: "/available-now",
        permanent: true,
      },
      {
        source: "/AvailableNow",
        destination: "/available-now",
        permanent: true,
      },
      {
        source: "/currentlyavailable",
        destination: "/available-now",
        permanent: true,
      },
      { source: "/available", destination: "/available-now", permanent: true }, // Common shortening
      { source: "/now", destination: "/available-now", permanent: true }, // Common shortening
      { source: "/an", destination: "/available-now", permanent: true }, // Initials

      // --- Redirects for "/check" ---
      { source: "/CheckAvailability", destination: "/check", permanent: true },
      { source: "/checkAvailability", destination: "/check", permanent: true }, // camelCase
      { source: "/checkavailability", destination: "/check", permanent: true },
      { source: "/check-availability", destination: "/check", permanent: true },
      { source: "/availability", destination: "/check", permanent: true }, // Could redirect here too
      { source: "/search", destination: "/check", permanent: true }, // Based on icon
      { source: "/chk", destination: "/check", permanent: true }, // Abbreviation
      { source: "/ca", destination: "/check", permanent: true }, // Abbreviation

      // --- Redirects for "/rooms" ---
      { source: "/RoomDetails", destination: "/rooms", permanent: true },
      { source: "/roomdetails", destination: "/rooms", permanent: true },
      { source: "/details", destination: "/rooms", permanent: true }, // Common shortening
      { source: "/deets", destination: "/rooms", permanent: true }, // Possible alternative
      { source: "/room", destination: "/rooms", permanent: true }, // Singular to plural

      // --- Redirects for "/graph"
      { source: "/GraphPage", destination: "/graph", permanent: true }, // From old example maybe
      { source: "/graphs", destination: "/graph", permanent: true }, // Plural to singular

      // --- Redirects for "/available-soon"
      {
        source: "/AvailableSoon",
        destination: "/available-soon",
        permanent: true,
      },
      {
        source: "/availablesoon",
        destination: "/available-soon",
        permanent: true,
      },
      { source: "/soon", destination: "/available-soon", permanent: true },
      { source: "/as", destination: "/available-soon", permanent: true },

      // --- Redirect for root variations
      { source: "/home", destination: "/", permanent: true },
      { source: "/index", destination: "/", permanent: true },
      { source: "/test", destination: "/", permanent: true },

      // --- Redirect for /custom-graph
      { source: "/CustomGraph", destination: "/custom-graph", permanent: true },
      { source: "/customgraph", destination: "/custom-graph", permanent: true },
      { source: "/cg", destination: "/custom-graph", permanent: true },
      {
        source: "/custom-graphs",
        destination: "/custom-graph",
        permanent: true,
      },
      {
        source: "/customgraphs",
        destination: "/custom-graph",
        permanent: true,
      },
      { source: "/about", destination: "/docs", permanent: true },
    ];
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "framer-motion"],
  },
};

// Configure bundle analyzer
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Use default export with bundle analyzer wrapper
export default bundleAnalyzer(nextConfig);
