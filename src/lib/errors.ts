/**
 * Custom error classes and error handling utilities
 *
 * This module provides structured error handling across the application
 * with custom error types for different scenarios.
 */

/**
 * Base error class for all application errors
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    code: string = "INTERNAL_ERROR",
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: Record<string, any>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON format for API responses
   */
  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * Error thrown when an API request fails
 */
export class ApiError extends AppError {
  constructor(
    message: string = "An API error occurred",
    code: string = "API_ERROR",
    statusCode: number = 500,
    details?: Record<string, any>,
  ) {
    super(message, code, statusCode, true, details);
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends AppError {
  constructor(
    message: string = "Validation failed",
    details?: Record<string, any>,
  ) {
    super(message, "VALIDATION_ERROR", 400, true, details);
  }
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string = "Authentication required",
    details?: Record<string, any>,
  ) {
    super(message, "AUTHENTICATION_ERROR", 401, true, details);
  }
}

/**
 * Error thrown when authorization fails
 */
export class AuthorizationError extends AppError {
  constructor(
    message: string = "You don't have permission to access this resource",
    details?: Record<string, any>,
  ) {
    super(message, "AUTHORIZATION_ERROR", 403, true, details);
  }
}

/**
 * Error thrown when a resource is not found
 */
export class NotFoundError extends AppError {
  constructor(
    message: string = "Resource not found",
    details?: Record<string, any>,
  ) {
    super(message, "NOT_FOUND", 404, true, details);
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = "Too many requests, please try again later",
    details?: Record<string, any>,
  ) {
    super(message, "RATE_LIMIT_EXCEEDED", 429, true, details);
  }
}

/**
 * Error thrown when database operation fails
 */
export class DatabaseError extends AppError {
  constructor(
    message: string = "Database operation failed",
    details?: Record<string, any>,
  ) {
    super(message, "DATABASE_ERROR", 500, true, details);
  }
}

/**
 * Error thrown when external service fails
 */
export class ExternalServiceError extends AppError {
  constructor(
    message: string = "External service error",
    details?: Record<string, any>,
  ) {
    super(message, "EXTERNAL_SERVICE_ERROR", 502, true, details);
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if error is operational (expected)
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

/**
 * Convert unknown error to AppError
 */
export function normalizeError(error: unknown): AppError {
  // Already an AppError
  if (isAppError(error)) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    return new AppError(error.message, "INTERNAL_ERROR", 500, false, {
      originalError: error.name,
    });
  }

  // Unknown error type
  return new AppError(
    "An unexpected error occurred",
    "UNKNOWN_ERROR",
    500,
    false,
    { originalError: String(error) },
  );
}

/**
 * Error handler for API routes
 * Returns a properly formatted error response
 */
export function handleApiError(error: unknown): {
  statusCode: number;
  body: {
    error: string;
    code: string;
    details?: Record<string, any>;
    requestId?: string;
  };
} {
  const normalizedError = normalizeError(error);

  // Log non-operational errors (these are bugs)
  if (!normalizedError.isOperational) {
    console.error("[API Error - Non-Operational]", {
      message: normalizedError.message,
      code: normalizedError.code,
      stack: normalizedError.stack,
      details: normalizedError.details,
    });
  }

  return {
    statusCode: normalizedError.statusCode,
    body: normalizedError.toJSON(),
  };
}

/**
 * Async error wrapper for API routes
 * Automatically catches and handles errors
 */
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw normalizeError(error);
    }
  };
}
