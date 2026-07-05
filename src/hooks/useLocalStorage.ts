/**
 * useLocalStorage Hook
 *
 * Custom hook for persisting state in localStorage
 * with automatic serialization and type safety
 */

import { useState, useCallback } from "react";
import { logger } from "@/lib/logger";

/**
 * Custom hook for localStorage with React state
 *
 * @param key - LocalStorage key
 * @param initialValue - Initial value if key doesn't exist
 * @returns Tuple of [value, setValue, removeValue]
 *
 * @example
 * ```tsx
 * const [user, setUser, removeUser] = useLocalStorage('user', null);
 *
 * // Set value
 * setUser({ name: 'John', id: 123 });
 *
 * // Remove value
 * removeUser();
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      logger.warn(`Error reading localStorage key "${key}"`, { error });
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Allow value to be a function so we have the same API as useState
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        // Save state
        setStoredValue(valueToStore);

        // Save to localStorage
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        logger.error(`Error setting localStorage key "${key}"`, error as Error);
      }
    },
    [key, storedValue],
  );

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      logger.error(`Error removing localStorage key "${key}"`, error as Error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

/**
 * Hook for localStorage with expiration time
 *
 * @param key - LocalStorage key
 * @param initialValue - Initial value
 * @param ttl - Time to live in milliseconds
 * @returns Tuple of [value, setValue, removeValue]
 */
export function useLocalStorageWithExpiry<T>(
  key: string,
  initialValue: T,
  ttl: number,
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (!item) {
        return initialValue;
      }

      const parsed = JSON.parse(item);

      // Check if expired
      if (parsed.expiry && Date.now() > parsed.expiry) {
        window.localStorage.removeItem(key);
        return initialValue;
      }

      return parsed.value;
    } catch (error) {
      logger.warn(`Error reading localStorage key "${key}"`, { error });
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        setStoredValue(valueToStore);

        if (typeof window !== "undefined") {
          const item = {
            value: valueToStore,
            expiry: Date.now() + ttl,
          };
          window.localStorage.setItem(key, JSON.stringify(item));
        }
      } catch (error) {
        logger.error(`Error setting localStorage key "${key}"`, error as Error);
      }
    },
    [key, storedValue, ttl],
  );

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      logger.error(`Error removing localStorage key "${key}"`, error as Error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
