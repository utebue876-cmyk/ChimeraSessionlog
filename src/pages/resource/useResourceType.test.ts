import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useResourceType } from './useResourceType';

const requestSchema = vi.hoisted(() => vi.fn());
const tryGetDataType = vi.hoisted(() => vi.fn());

vi.mock('@medplum/react', () => ({
  useMedplum: () => ({ requestSchema }),
}));

vi.mock('@medplum/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@medplum/core')>();
  return { ...actual, tryGetDataType };
});

describe('useResourceType', () => {
  test('returns undefined when no resource type is provided', () => {
    const { result } = renderHook(() => useResourceType(undefined));

    expect(result.current).toBeUndefined();
    expect(requestSchema).not.toHaveBeenCalled();
  });

  // The hook's `lastInput` ref is seeded with the initial resourceType, so the effect's
  // change-guard is already satisfied on mount and validation is skipped until the input changes.
  test('does not validate the resource type supplied on initial mount', () => {
    requestSchema.mockResolvedValue(undefined);
    tryGetDataType.mockReturnValue({ name: 'Patient' });

    const { result } = renderHook(() => useResourceType('Patient'));

    expect(result.current).toBeUndefined();
    expect(requestSchema).not.toHaveBeenCalled();
  });

  test('validates and returns a known resource type once it changes after mount', async () => {
    requestSchema.mockResolvedValue(undefined);
    tryGetDataType.mockReturnValue({ name: 'Practitioner' });

    const { result, rerender } = renderHook(({ type }) => useResourceType(type), {
      initialProps: { type: 'Patient' },
    });
    rerender({ type: 'Practitioner' });

    await waitFor(() => expect(result.current).toBe('Practitioner'));
    expect(requestSchema).toHaveBeenCalledWith('Practitioner');
  });

  test('calls onInvalidResourceType and stays undefined for an unrecognised type', async () => {
    requestSchema.mockResolvedValue(undefined);
    tryGetDataType.mockReturnValue(undefined);
    const onInvalidResourceType = vi.fn();

    const { result, rerender } = renderHook(({ type }) => useResourceType(type, { onInvalidResourceType }), {
      initialProps: { type: 'Patient' },
    });
    rerender({ type: 'NotAType' });

    await waitFor(() => expect(onInvalidResourceType).toHaveBeenCalledWith('NotAType'));
    expect(result.current).toBeUndefined();
  });
});
