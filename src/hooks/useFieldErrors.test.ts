import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, test } from 'vitest';
import { useFieldErrors } from './useFieldErrors';

describe('useFieldErrors', () => {
  test('sets and clears individual field errors', () => {
    const { result } = renderHook(() => useFieldErrors<'name' | 'email'>());

    act(() => {
      result.current.setFieldErrors({ name: 'Required', email: 'Invalid' });
    });

    expect(result.current.fieldErrors).toEqual({ name: 'Required', email: 'Invalid' });

    act(() => {
      result.current.clearFieldError('name');
    });

    expect(result.current.fieldErrors).toEqual({ email: 'Invalid' });
  });

  test('clearAllFieldErrors resets error state', () => {
    const { result } = renderHook(() => useFieldErrors<'name'>());

    act(() => {
      result.current.setFieldErrors({ name: 'Required' });
    });
    expect(result.current.fieldErrors).toEqual({ name: 'Required' });

    act(() => {
      result.current.clearAllFieldErrors();
    });
    expect(result.current.fieldErrors).toEqual({});
  });
});
