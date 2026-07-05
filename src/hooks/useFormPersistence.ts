/**
 * useFormPersistence Hook
 *
 * Combines debouncing and localStorage persistence for form inputs.
 * Automatically saves form data as user types and restores it on page load.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useDebounce } from "./useDebounce";
import { useLocalStorage } from "./useLocalStorage";
import { logger } from "@/lib/logger";

export interface FormPersistenceOptions {
  /** Debounce delay in milliseconds (default: 500) */
  debounceDelay?: number;
  /** Whether to persist form data (default: true) */
  persist?: boolean;
  /** Custom storage key (default: auto-generated) */
  storageKey?: string;
  /** Whether to clear data on successful submit (default: true) */
  clearOnSubmit?: boolean;
  /** Whether to validate before saving (default: false) */
  validateBeforeSave?: boolean;
}

export interface FormPersistenceResult<T> {
  /** Current form values */
  values: T;
  /** Update a single field */
  setField: <K extends keyof T>(field: K, value: T[K]) => void;
  /** Update multiple fields */
  setFields: (updates: Partial<T>) => void;
  /** Reset form to initial values */
  reset: () => void;
  /** Clear persisted data */
  clearPersisted: () => void;
  /** Whether form has unsaved changes */
  hasUnsavedChanges: boolean;
  /** Whether form is currently being saved */
  isSaving: boolean;
  /** Submit handler that clears persisted data */
  handleSubmit: (
    onSubmit: (values: T) => void | Promise<void>,
  ) => Promise<void>;
}

/**
 * Hook for form persistence with debouncing and localStorage
 *
 * @param initialValues - Initial form values
 * @param options - Configuration options
 * @returns Form persistence utilities
 *
 * @example
 * ```tsx
 * const form = useFormPersistence({
 *   name: '',
 *   email: '',
 *   message: ''
 * }, {
 *   debounceDelay: 300,
 *   persist: true,
 *   clearOnSubmit: true
 * });
 *
 * return (
 *   <form onSubmit={(e) => {
 *     e.preventDefault();
 *     form.handleSubmit(async (values) => {
 *       await submitForm(values);
 *     });
 *   }}>
 *     <input
 *       value={form.values.name}
 *       onChange={(e) => form.setField('name', e.target.value)}
 *     />
 *   </form>
 * );
 * ```
 */
export function useFormPersistence<T extends Record<string, any>>(
  initialValues: T,
  options: FormPersistenceOptions = {},
): FormPersistenceResult<T> {
  const {
    debounceDelay = 500,
    persist = true,
    storageKey,
    clearOnSubmit = true,
    validateBeforeSave = false,
  } = options;

  // Generate storage key if not provided
  const randomKey = useRef(Math.random().toString(36).substr(2, 9));
  const key = storageKey || `form-${randomKey.current}`;

  // Local storage for persistence
  const [persistedData, setPersistedData, clearPersistedData] =
    useLocalStorage<T>(key, initialValues);

  // Form state
  const [values, setValues] = useState<T>(persistedData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Debounced values for auto-save
  const debouncedValues = useDebounce(values, debounceDelay);

  // Track if this is the initial load
  const isInitialLoad = useRef(true);

  // Restore form data on mount
  useEffect(() => {
    if (persist && isInitialLoad.current) {
      setValues(persistedData);
      isInitialLoad.current = false;
    }
  }, [persist, persistedData]);

  // Auto-save when debounced values change
  useEffect(() => {
    if (!persist || isInitialLoad.current) return;

    const hasChanges =
      JSON.stringify(debouncedValues) !== JSON.stringify(persistedData);

    if (hasChanges) {
      setIsSaving(true);

      // Optional validation before save
      if (validateBeforeSave) {
        // Add your validation logic here
        const isValid = Object.values(debouncedValues).every(
          (value) => value !== null && value !== undefined && value !== "",
        );

        if (!isValid) {
          setIsSaving(false);
          return;
        }
      }

      setPersistedData(debouncedValues);
      setHasUnsavedChanges(false);

      // Simulate save delay for UX
      setTimeout(() => {
        setIsSaving(false);
      }, 100);

      logger.info("Form data auto-saved", { key, values: debouncedValues });
    }
  }, [
    debouncedValues,
    persist,
    persistedData,
    setPersistedData,
    validateBeforeSave,
    key,
  ]);

  // Update single field
  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  }, []);

  // Update multiple fields
  const setFields = useCallback((updates: Partial<T>) => {
    setValues((prev) => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  }, []);

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues);
    setHasUnsavedChanges(false);
    if (persist) {
      setPersistedData(initialValues);
    }
  }, [initialValues, persist, setPersistedData]);

  // Clear persisted data
  const clearPersisted = useCallback(() => {
    clearPersistedData();
    setHasUnsavedChanges(false);
  }, [clearPersistedData]);

  // Submit handler
  const handleSubmit = useCallback(
    async (onSubmit: (values: T) => void | Promise<void>) => {
      try {
        await onSubmit(values);

        if (clearOnSubmit) {
          clearPersistedData();
          setHasUnsavedChanges(false);
        }

        logger.info("Form submitted successfully", { key, values });
      } catch (error) {
        logger.error("Form submission failed", error as Error, { key, values });
        throw error;
      }
    },
    [values, clearOnSubmit, clearPersistedData, key],
  );

  return {
    values,
    setField,
    setFields,
    reset,
    clearPersisted,
    hasUnsavedChanges,
    isSaving,
    handleSubmit,
  };
}

/**
 * Hook for search input with debouncing and persistence
 *
 * @param initialQuery - Initial search query
 * @param options - Configuration options
 * @returns Search utilities
 */
export function useSearchPersistence(
  initialQuery: string = "",
  options: {
    debounceDelay?: number;
    persist?: boolean;
    storageKey?: string;
  } = {},
) {
  const {
    debounceDelay = 300,
    persist = true,
    storageKey = "search-query",
  } = options;

  const form = useFormPersistence(
    { query: initialQuery },
    {
      debounceDelay,
      persist,
      storageKey,
      clearOnSubmit: false, // Don't clear search on submit
    },
  );

  return {
    query: form.values.query,
    setQuery: (query: string) => form.setField("query", query),
    debouncedQuery: useDebounce(form.values.query, debounceDelay),
    clearQuery: () => form.setField("query", ""),
    hasUnsavedChanges: form.hasUnsavedChanges,
    isSaving: form.isSaving,
  };
}

/**
 * Hook for form validation with persistence
 *
 * @param initialValues - Initial form values
 * @param validationRules - Validation rules
 * @param options - Configuration options
 * @returns Form validation utilities
 */
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Partial<Record<keyof T, (value: any) => string | null>>,
  options: FormPersistenceOptions = {},
) {
  const form = useFormPersistence(initialValues, {
    ...options,
    validateBeforeSave: true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  // Validate single field
  const validateField = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      const rule = validationRules[field];
      if (!rule) return null;

      const error = rule(value);
      setErrors((prev) => ({ ...prev, [field]: error || undefined }));
      return error;
    },
    [validationRules],
  );

  // Validate all fields
  const validateAll = useCallback(() => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.keys(validationRules).forEach((key) => {
      const field = key as keyof T;
      const rule = validationRules[field];
      if (rule) {
        const error = rule(form.values[field]);
        if (error) {
          newErrors[field] = error;
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [form.values, validationRules]);

  // Update field with validation
  const setFieldWithValidation = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      form.setField(field, value);
      validateField(field, value);
    },
    [form, validateField],
  );

  return {
    ...form,
    errors,
    validateField,
    validateAll,
    setField: setFieldWithValidation,
    isValid: Object.values(errors).every((error) => !error),
  };
}
