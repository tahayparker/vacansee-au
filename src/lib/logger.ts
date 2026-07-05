/**
 * Structured logging utility
 *
 * Provides consistent logging with context throughout the application
 */

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Log context metadata
 */
export interface LogContext {
  /** User ID if available */
  userId?: string;
  /** Request ID for tracing */
  requestId?: string;
  /** API endpoint being called */
  endpoint?: string;
  /** Additional metadata */
  [key: string]: any;
}

/**
 * Log entry structure
 */
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Logger class for structured logging
 */
class Logger {
  private minLevel: LogLevel;
  private context: LogContext;

  constructor(minLevel: LogLevel = LogLevel.INFO, context: LogContext = {}) {
    this.minLevel = minLevel;
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger(this.minLevel, {
      ...this.context,
      ...additionalContext,
    });
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Format log entry
   */
  private formatLog(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context: { ...this.context, ...context },
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          code: (error as any).code,
        },
      }),
    };
  }

  /**
   * Output log entry to console
   */
  private output(entry: LogEntry, level: LogLevel): void {
    const logFn = level >= LogLevel.ERROR ? console.error : console.log;

    // In development, pretty print
    if (process.env.NODE_ENV === "development") {
      logFn(
        `[${entry.timestamp}] ${entry.level}:`,
        entry.message,
        entry.context || "",
        entry.error || "",
      );
    } else {
      // In production, output JSON for easier parsing
      logFn(JSON.stringify(entry));
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    if (this.minLevel <= LogLevel.DEBUG) {
      const entry = this.formatLog(LogLevel.DEBUG, message, context);
      this.output(entry, LogLevel.DEBUG);
    }
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    if (this.minLevel <= LogLevel.INFO) {
      const entry = this.formatLog(LogLevel.INFO, message, context);
      this.output(entry, LogLevel.INFO);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    if (this.minLevel <= LogLevel.WARN) {
      const entry = this.formatLog(LogLevel.WARN, message, context);
      this.output(entry, LogLevel.WARN);
    }
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    if (this.minLevel <= LogLevel.ERROR) {
      const entry = this.formatLog(LogLevel.ERROR, message, context, error);
      this.output(entry, LogLevel.ERROR);
    }
  }

  /**
   * Log API request
   */
  logRequest(method: string, path: string, context?: LogContext): void {
    this.info(`${method} ${path}`, {
      ...context,
      type: "request",
    });
  }

  /**
   * Log API response
   */
  logResponse(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext,
  ): void {
    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    const message = `${method} ${path} - ${statusCode} (${duration}ms)`;

    if (level === LogLevel.WARN) {
      this.warn(message, {
        ...context,
        type: "response",
        statusCode,
        duration,
      });
    } else {
      this.info(message, {
        ...context,
        type: "response",
        statusCode,
        duration,
      });
    }
  }

  /**
   * Log performance metric
   */
  logPerformance(
    operation: string,
    duration: number,
    context?: LogContext,
  ): void {
    this.info(`Performance: ${operation} took ${duration}ms`, {
      ...context,
      type: "performance",
      operation,
      duration,
    });
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger(
  process.env.NODE_ENV === "development" ? LogLevel.DEBUG : LogLevel.INFO,
);

/**
 * Create a logger with specific context
 */
export function createLogger(context: LogContext): Logger {
  return logger.child(context);
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
