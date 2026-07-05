/**
 * Skeleton Loading Components
 *
 * Provides skeleton loaders for various content types to improve
 * perceived loading performance.
 */

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ============================================================================
// BASE SKELETON
// ============================================================================

interface SkeletonProps {
  /** Additional CSS classes */
  className?: string;
  /** Whether to animate */
  animate?: boolean;
}

/**
 * Base skeleton component with shimmer animation
 */
export function Skeleton({ className, animate = true }: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-white/5 rounded-md",
        animate && "animate-pulse",
        className,
      )}
    />
  );
}

// ============================================================================
// SPECIALIZED SKELETONS
// ============================================================================

/**
 * Skeleton for a room card
 */
export function RoomCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          {/* Room name */}
          <Skeleton className="h-5 w-3/4" />
          {/* Room code */}
          <Skeleton className="h-4 w-1/2" />
        </div>
        {/* Capacity */}
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
    </motion.div>
  );
}

/**
 * Skeleton for a list of room cards
 */
interface RoomListSkeletonProps {
  /** Number of skeleton cards to show */
  count?: number;
}

export function RoomListSkeleton({ count = 5 }: RoomListSkeletonProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
      className="space-y-3"
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0 },
          }}
        >
          <RoomCardSkeleton />
        </motion.div>
      ))}
    </motion.div>
  );
}

/**
 * Skeleton for schedule graph
 */
export function ScheduleGraphSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Graph grid */}
      <div className="border border-white/10 rounded-lg overflow-hidden">
        {/* Header row */}
        <div className="flex gap-px bg-white/5">
          <Skeleton className="h-12 w-32 rounded-none" />
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 flex-1 rounded-none" />
          ))}
        </div>

        {/* Data rows */}
        {Array.from({ length: 8 }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-px bg-white/5">
            <Skeleton className="h-10 w-32 rounded-none" />
            {Array.from({ length: 10 }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-10 flex-1 rounded-none" />
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Skeleton for text content
 */
interface TextSkeletonProps {
  /** Number of lines */
  lines?: number;
  /** Additional CSS classes */
  className?: string;
}

export function TextSkeleton({ lines = 3, className }: TextSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? "w-2/3" : "w-full", // Last line shorter
          )}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton for stats/metric card
 */
export function StatCardSkeleton() {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

/**
 * Skeleton for table row
 */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-white/10">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4", i === 0 ? "w-1/4" : "flex-1")} />
      ))}
    </div>
  );
}

/**
 * Skeleton for full table
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-4 py-3 border-b border-white/20">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-5 flex-1" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </div>
  );
}

/**
 * Skeleton for avatar/profile picture
 */
export function AvatarSkeleton({
  size = "medium",
}: {
  size?: "small" | "medium" | "large";
}) {
  const sizeClasses = {
    small: "w-8 h-8",
    medium: "w-12 h-12",
    large: "w-16 h-16",
  };

  return <Skeleton className={cn("rounded-full", sizeClasses[size])} />;
}
