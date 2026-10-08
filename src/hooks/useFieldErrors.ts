import { useCallback, useState } from 'react';
export type FieldErrors<TFields extends string> = Partial<Record<TFields, string>>;
export interface UseFieldErrorsResult<TFields extends string> {
  fieldErrors: FieldErrors<TFields>;
  setFieldErrors: (errors: FieldErrors<TFields>) => void;
  clearFieldError: (field: TFields) => void;
  clearAllFieldErrors: () => void;
}

/**
 * Generic hook for managing per-field validation errors.
 * Pass the union of field name strings as the type parameter, e.g.
 *   useFieldErrors<'name' | 'email'>()
 *
 * @returns fieldErrors - current error map, setFieldErrors - set multiple at once,
 *          clearFieldError - clear one field, clearAllFieldErrors - reset all
 */
export function useFieldErrors<TFields extends string>(): UseFieldErrorsResult<TFields> {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<TFields>>({});

  const clearFieldError = useCallback((field: TFields) => {
    setFieldErrors((prev) => {
      if (!(field in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAllFieldErrors = useCallback(() => setFieldErrors({}), []);

  return { fieldErrors, setFieldErrors, clearFieldError, clearAllFieldErrors };
}
