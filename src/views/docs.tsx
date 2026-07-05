/**
 * Documentation Page
 *
 * Provides comprehensive information about vacansee-au including features,
 * tech stack, getting started guide, and contact information.
 */

"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ListChecks,
  Cpu,
  Terminal,
  RefreshCw,
  Mail,
  Info,
  Target,
  Settings,
  Shield,
  Zap,
  Database,
  BookOpen,
} from "lucide-react";
import { staggerContainerVariants, listItemVariants } from "@/lib/animations";

/**
 * Documentation page component
 */
export default function DocsPage() {
  // Ensure page starts at the top
  useEffect(() => {
    // Force scroll to top with multiple methods to ensure it works
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    // Scroll immediately
    scrollToTop();

    // Also scroll after a small delay to ensure it sticks
    const timeout = setTimeout(scrollToTop, 50);

    return () => clearTimeout(timeout);
  }, []);
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 pt-20 md:pt-24 flex-grow flex flex-col text-white">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainerVariants}
      >
        <div className="space-y-10 text-justify">
          {/* Header Section */}
          <motion.div variants={listItemVariants} className="text-center mb-12">
            <Settings className="mx-auto h-12 w-12 text-purple-500 mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold text-white/95">
              vacansee-au Documentation
            </h1>
            <p className="text-lg text-white/70 mt-2">
              Everything you need to know about finding available rooms on
              campus.
            </p>
          </motion.div>

          {/* What is vacansee-au? */}
          <motion.section variants={listItemVariants} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-white/20 pb-2 mb-3">
              <Info className="h-6 w-6 text-purple-500 flex-shrink-0" />
              <h2 className="text-2xl font-semibold text-white/90">
                What is vacansee-au?
              </h2>
            </div>
            <p className="text-white/80 text-lg text-justify">
              vacansee-au is a modern web application designed to help students
              find available rooms across campus in real-time. No more wandering
              the halls or checking multiple locations – get instant information
              about room availability right when you need it.
            </p>
            <p className="text-white/80 text-lg text-justify">
              Built with performance and usability in mind, vacansee-au provides a
              fast, intuitive interface that works seamlessly on all devices.
            </p>
          </motion.section>

          {/* Our Goal */}
          <motion.section variants={listItemVariants} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-white/20 pb-2 mb-3">
              <Target className="h-6 w-6 text-purple-500 flex-shrink-0" />
              <h2 className="text-2xl font-semibold text-white/90">Our Goal</h2>
            </div>
            <p className="text-white/80 text-lg text-justify">
              The primary goal is to make finding an available room quick and
              effortless. Whether you need a quiet place to study, a room for a
              group meeting, or just want to see the campus schedule at a
              glance, vacansee-au provides the necessary tools to help you succeed.
            </p>
          </motion.section>

          {/* How to Use */}
          <motion.section variants={listItemVariants} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-white/20 pb-2 mb-3">
              <BookOpen className="h-6 w-6 text-purple-500 flex-shrink-0" />
              <h2 className="text-2xl font-semibold text-white/90">
                How to Use
              </h2>
            </div>
            <p className="text-white/80 text-lg text-justify">
              Getting started with vacansee-au is simple. First, sign in using your
              Google or GitHub account for secure access. Once logged in,
              you&apos;ll find several pages to help you find available rooms:
            </p>
            <ul className="list-disc list-inside space-y-2 text-white/80 pl-1 text-lg">
              <li>
                <strong>Available Now:</strong> View which rooms are free right
                now at a glance
              </li>
              <li>
                <strong>Available Soon:</strong> See upcoming room availability
                with quick filters (30m, 1h, 2h ahead)
              </li>
              <li>
                <strong>Check Availability:</strong> Enter a specific time to
                verify room availability for any moment you need
              </li>
              <li>
                <strong>Graph:</strong> Visualize room schedules throughout the
                day with interactive, color-coded timelines
              </li>
              <li>
                <strong>Custom Graph:</strong> Create personalized schedule
                views with custom filters, then export them as images
              </li>
              <li>
                <strong>Room Details:</strong> Browse all available spaces with
                complete information including capacity and location
              </li>
            </ul>
          </motion.section>

          {/* Features */}
          <motion.section variants={listItemVariants} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-white/20 pb-2 mb-3">
              <ListChecks className="h-6 w-6 text-purple-500 flex-shrink-0" />
              <h2 className="text-2xl font-semibold text-white/90">Features</h2>
            </div>
            <ul className="list-disc list-inside space-y-2 text-white/80 pl-1 text-lg">
              <motion.li variants={listItemVariants}>
                <strong>Real-time Availability</strong> - Check which rooms are
                available right now
              </motion.li>
              <motion.li variants={listItemVariants}>
                <strong>Future Projections</strong> - See what rooms will be
                available soon (30m, 1h, 2h ahead)
              </motion.li>
              <motion.li variants={listItemVariants}>
                <strong>Custom Time Checks</strong> - Verify availability for
                specific time slots
              </motion.li>
              <motion.li variants={listItemVariants}>
                <strong>Interactive Graphs</strong> - Visualize room schedules
                with color-coded availability
              </motion.li>
              <motion.li variants={listItemVariants}>
                <strong>Custom Graph Builder</strong> - Create personalized
                schedule views with filters
              </motion.li>
              <motion.li variants={listItemVariants}>
                <strong>Room Information</strong> - Browse complete room details
                including capacity
              </motion.li>
              <motion.li variants={listItemVariants}>
                <strong>Smart Search</strong> - Fuzzy search to find rooms
                quickly
              </motion.li>
              <motion.li variants={listItemVariants}>
                <strong>Export Capability</strong> - Save custom graphs as
                images
              </motion.li>
              <motion.li variants={listItemVariants}>
                <strong>Responsive Design</strong> - Works perfectly on desktop,
                tablet, and mobile
              </motion.li>
              <motion.li variants={listItemVariants}>
                <strong>Secure Authentication</strong> - Protected access via
                Google/GitHub OAuth
              </motion.li>
              <motion.li variants={listItemVariants}>
                <strong>Performance Optimized</strong> - Fast loading with
                intelligent caching
              </motion.li>
            </ul>
          </motion.section>

          {/* Tech Stack */}
          <motion.section variants={listItemVariants} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-white/20 pb-2 mb-3">
              <Cpu className="h-6 w-6 text-purple-500 flex-shrink-0" />
              <h2 className="text-2xl font-semibold text-white/90">
                Tech Stack
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4 text-white/80 text-lg">
              <div>
                <h3 className="font-semibold text-purple-500 mb-2">Frontend</h3>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>Next.js 16 (App Router)</li>
                  <li>TypeScript</li>
                  <li>Tailwind CSS 4</li>
                  <li>Shadcn UI Components</li>
                  <li>Framer Motion</li>
                  <li>Fuse.js (Fuzzy Search)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-purple-500 mb-2">Backend</h3>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>Next.js Route Handlers</li>
                  <li>Prisma ORM</li>
                  <li>PostgreSQL Database</li>
                  <li>Zod Validation</li>
                  <li>In-memory Caching</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-purple-500 mb-2">
                  Authentication
                </h3>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>Supabase Auth</li>
                  <li>OAuth Providers</li>
                  <li>Secure Sessions</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-purple-500 mb-2">
                  Infrastructure
                </h3>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>Vercel Hosting</li>
                  <li>GitHub Actions</li>
                  <li>Supabase (Database)</li>
                  <li>Performance Monitoring</li>
                </ul>
              </div>
            </div>
          </motion.section>

          {/* Architecture Highlights */}
          <motion.section variants={listItemVariants} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-white/20 pb-2 mb-3">
              <Database className="h-6 w-6 text-purple-500 flex-shrink-0" />
              <h2 className="text-2xl font-semibold text-white/90">
                Architecture Highlights
              </h2>
            </div>
            <div className="space-y-3 text-white/80 text-lg">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-green-400 mt-1 flex-shrink-0" />
                <div>
                  <strong>Security First:</strong> Rate limiting, input
                  validation, security headers, and secure authentication
                  protect user data and prevent abuse.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-yellow-400 mt-1 flex-shrink-0" />
                <div>
                  <strong>Performance Optimized:</strong> Stale-while-revalidate
                  caching, database indexes, and optimized queries ensure
                  lightning-fast responses.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Cpu className="h-5 w-5 text-blue-400 mt-1 flex-shrink-0" />
                <div>
                  <strong>Clean Architecture:</strong> Separation of concerns
                  with services, hooks, and utilities makes the codebase
                  maintainable and scalable.
                </div>
              </div>
            </div>
          </motion.section>

          {/* Getting Started */}
          <motion.section variants={listItemVariants} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-white/20 pb-2 mb-3">
              <Terminal className="h-6 w-6 text-purple-500 flex-shrink-0" />
              <h2 className="text-2xl font-semibold text-white/90">
                Getting Started (Development)
              </h2>
            </div>
            <p className="text-white/80 text-lg text-justify">
              To set up the project locally for development:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-white/80 pl-1 text-lg">
              <motion.li variants={listItemVariants}>
                Clone the repository from GitHub
              </motion.li>
              <motion.li variants={listItemVariants}>
                Install dependencies:{" "}
                <code className="bg-white/10 px-2 py-1 rounded">
                  npm install
                </code>
              </motion.li>
              <motion.li variants={listItemVariants}>
                Copy{" "}
                <code className="bg-white/10 px-2 py-1 rounded">
                  .env.example
                </code>{" "}
                to{" "}
                <code className="bg-white/10 px-2 py-1 rounded">
                  .env.local
                </code>{" "}
                and configure
              </motion.li>
              <motion.li variants={listItemVariants}>
                Generate Prisma client:{" "}
                <code className="bg-white/10 px-2 py-1 rounded">
                  npx prisma generate
                </code>
              </motion.li>
              <motion.li variants={listItemVariants}>
                Push schema to database:{" "}
                <code className="bg-white/10 px-2 py-1 rounded">
                  npx prisma db push
                </code>
              </motion.li>
              <motion.li variants={listItemVariants}>
                Run development server:{" "}
                <code className="bg-white/10 px-2 py-1 rounded">
                  npm run dev
                </code>
              </motion.li>
            </ol>
            <p className="text-sm text-white/70">
              For detailed setup instructions, see{" "}
              <Link
                href="https://github.com/tahayparker/vacansee-au/blob/main/CONTRIBUTING.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-500 hover:underline"
              >
                CONTRIBUTING.md
              </Link>{" "}
              on GitHub.
            </p>
          </motion.section>

          {/* Data Updates */}
          <motion.section variants={listItemVariants} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-white/20 pb-2 mb-3">
              <RefreshCw className="h-6 w-6 text-purple-500 flex-shrink-0" />
              <h2 className="text-2xl font-semibold text-white/90">
                Data Updates
              </h2>
            </div>
            <p className="text-white/80 text-lg text-justify">
              Schedule data is automatically updated daily via GitHub Actions
              workflows. This ensures the application always displays current
              room availability based on the latest timetable information.
            </p>
            <p className="text-sm text-white/70">
              The automated workflow collects timetable data, processes it,
              updates the database, generates optimized schedule files, and
              commits changes to the repository.
            </p>
          </motion.section>

          {/* Contact */}
          <motion.section variants={listItemVariants} className="space-y-0">
            <div className="flex items-center gap-3 border-b border-white/20 pb-2 mb-3">
              <Mail className="h-6 w-6 text-purple-500 flex-shrink-0" />
              <h2 className="text-2xl font-semibold text-white/90">
                Contact & Links
              </h2>
            </div>
            <div className="space-y-2 text-white/80 text-lg">
              <p>
                <strong>Created by:</strong> Taha Parker
              </p>
              <p>
                <strong>Contact:</strong>{" "}
                <Link
                  href="https://tahayparker.vercel.app/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-500 hover:underline"
                >
                  Personal Website
                </Link>
              </p>
              <p>
                <strong>Source Code:</strong>{" "}
                <Link
                  href="https://github.com/tahayparker/vacansee-au"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-500 hover:underline"
                >
                  GitHub Repository
                </Link>
              </p>
            </div>
          </motion.section>

          {/* Footer Note */}
          <motion.div
            variants={listItemVariants}
            className="text-center text-white/60 text-sm pt-6 border-t border-white/10"
          >
            <p>For students, by students. Built with 🖤 by TP.</p>
            <p className="mt-2">
              Proudly open source and continuously improving.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
