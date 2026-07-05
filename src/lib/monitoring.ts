/**
 * Performance Monitoring Utility
 *
 * Tracks performance metrics and provides debugging tools
 * for identifying bottlenecks and optimizing the application
 */

import { logger } from "./logger";

/**
 * Performance mark data
 */
interface PerformanceMark {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * Performance marks store
 */
const performanceMarks = new Map<string, PerformanceMark>();

/**
 * Start a performance measurement
 *
 * @param name - Name of the operation
 * @param metadata - Additional metadata
 *
 * @example
 * ```ts
 * startMeasure('fetch-schedule');
 * // ... perform operation
 * endMeasure('fetch-schedule');
 * ```
 */
export function startMeasure(
  name: string,
  metadata?: Record<string, any>,
): void {
  performanceMarks.set(name, {
    name,
    startTime: performance.now(),
    metadata,
  });
}

/**
 * End a performance measurement
 *
 * @param name - Name of the operation
 * @returns Duration in milliseconds
 */
export function endMeasure(name: string): number | null {
  const mark = performanceMarks.get(name);

  if (!mark) {
    logger.warn(`Performance mark "${name}" not found`);
    return null;
  }

  const endTime = performance.now();
  const duration = endTime - mark.startTime;

  mark.endTime = endTime;
  mark.duration = duration;

  // Log if operation took longer than 1 second
  if (duration > 1000) {
    logger.warn(`Slow operation detected: ${name}`, {
      duration: duration.toFixed(2),
      ...mark.metadata,
    });
  } else {
    logger.debug(`Performance: ${name}`, {
      duration: duration.toFixed(2),
      ...mark.metadata,
    });
  }

  performanceMarks.delete(name);
  return duration;
}

/**
 * Measure an async function execution time
 *
 * @param name - Name of the operation
 * @param fn - Async function to measure
 * @param metadata - Additional metadata
 * @returns Result of the function
 *
 * @example
 * ```ts
 * const data = await measureAsync('fetch-rooms', async () => {
 *   return await fetchRooms();
 * });
 * ```
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>,
): Promise<T> {
  startMeasure(name, metadata);
  try {
    const result = await fn();
    endMeasure(name);
    return result;
  } catch (error) {
    endMeasure(name);
    throw error;
  }
}

/**
 * Measure a synchronous function execution time
 *
 * @param name - Name of the operation
 * @param fn - Function to measure
 * @param metadata - Additional metadata
 * @returns Result of the function
 */
export function measureSync<T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, any>,
): T {
  startMeasure(name, metadata);
  try {
    const result = fn();
    endMeasure(name);
    return result;
  } catch (error) {
    endMeasure(name);
    throw error;
  }
}

/**
 * Get all performance marks
 *
 * @returns Array of performance marks
 */
export function getPerformanceMarks(): PerformanceMark[] {
  return Array.from(performanceMarks.values());
}

/**
 * Clear all performance marks
 */
export function clearPerformanceMarks(): void {
  performanceMarks.clear();
}

/**
 * Track Core Web Vitals
 *
 * Call this in _app.tsx to start tracking
 */
export function trackWebVitals(): void {
  if (typeof window === "undefined") return;

  // Track First Contentful Paint (FCP)
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (
        entry.entryType === "paint" &&
        entry.name === "first-contentful-paint"
      ) {
        logger.info("FCP", { duration: entry.startTime });
      }

      // Track Largest Contentful Paint (LCP)
      if (entry.entryType === "largest-contentful-paint") {
        logger.info("LCP", { duration: entry.startTime });
      }

      // Track First Input Delay (FID)
      if (entry.entryType === "first-input") {
        const fidEntry = entry as PerformanceEventTiming;
        logger.info("FID", {
          duration: fidEntry.processingStart - fidEntry.startTime,
        });
      }

      // Track Cumulative Layout Shift (CLS)
      if (
        entry.entryType === "layout-shift" &&
        !(entry as any).hadRecentInput
      ) {
        logger.info("CLS", { value: (entry as any).value });
      }
    }
  });

  // Observe different entry types
  try {
    observer.observe({
      entryTypes: [
        "paint",
        "largest-contentful-paint",
        "first-input",
        "layout-shift",
      ],
    });
  } catch (error) {
    // Some browsers may not support all entry types
    logger.debug("PerformanceObserver not fully supported", { error });
  }
}

/**
 * Detect long tasks (tasks taking > 50ms)
 *
 * @param callback - Callback function called for each long task
 */
export function detectLongTasks(callback?: (duration: number) => void): void {
  if (typeof window === "undefined") return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const duration = entry.duration;

        if (duration > 50) {
          logger.warn("Long task detected", {
            duration: duration.toFixed(2),
            name: entry.name,
          });

          callback?.(duration);
        }
      }
    });

    observer.observe({ entryTypes: ["longtask"] });
  } catch (error) {
    logger.debug("Long task detection not supported", { error });
  }
}

/**
 * Get current memory usage (Chrome only)
 *
 * @returns Memory usage info or null if not supported
 */
export function getMemoryUsage(): {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
} | null {
  if (typeof window === "undefined") return null;

  const memory = (performance as any).memory;
  if (!memory) return null;

  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
  };
}

/**
 * Log performance summary
 * Useful for debugging performance issues
 */
export function logPerformanceSummary(): void {
  if (typeof window === "undefined") return;

  const navigation = performance.getEntriesByType(
    "navigation",
  )[0] as PerformanceNavigationTiming;

  if (navigation) {
    logger.info("Performance Summary", {
      domContentLoaded:
        navigation.domContentLoadedEventEnd -
        navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      domInteractive: navigation.domInteractive - navigation.fetchStart,
      transferSize: navigation.transferSize,
    });
  }

  const memory = getMemoryUsage();
  if (memory) {
    logger.info("Memory Usage", {
      usedMB: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
      totalMB: (memory.totalJSHeapSize / 1024 / 1024).toFixed(2),
      limitMB: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2),
    });
  }
}

/**
 * Create a performance debugging panel (dev mode only)
 * Shows real-time performance metrics
 */
export function createPerformancePanel(): void {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "development") {
    return;
  }

  // Create panel element
  const panel = document.createElement("div");
  panel.id = "perf-panel";
  panel.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 16px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 12px;
    z-index: 9999;
    min-width: 200px;
    max-height: 400px;
    overflow-y: auto;
  `;

  // Add title
  const title = document.createElement("div");
  title.textContent = "⚡ Performance";
  title.style.cssText =
    "font-weight: bold; margin-bottom: 8px; font-size: 14px;";
  panel.appendChild(title);

  // Add metrics container
  const metrics = document.createElement("div");
  metrics.id = "perf-metrics";
  panel.appendChild(metrics);

  // Add close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    line-height: 24px;
  `;
  closeBtn.onclick = () => panel.remove();
  panel.appendChild(closeBtn);

  document.body.appendChild(panel);

  // Update metrics every second
  const updateMetrics = () => {
    const memory = getMemoryUsage();
    const marks = getPerformanceMarks();

    let html = "";

    if (memory) {
      html += `<div style="margin-bottom: 8px;">
        <strong>Memory:</strong><br/>
        ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB /
        ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1)} MB
      </div>`;
    }

    if (marks.length > 0) {
      html += `<div style="margin-bottom: 8px;">
        <strong>Active Measurements:</strong><br/>
        ${marks.map((mark) => `${mark.name}: ${(performance.now() - mark.startTime).toFixed(0)}ms`).join("<br/>")}
      </div>`;
    }

    metrics.innerHTML = html || "<em>No active measurements</em>";
  };

  updateMetrics();
  setInterval(updateMetrics, 1000);
}
