import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useSelfReferralAssessment } from './useSelfReferralAssessment';

const store = vi.hoisted(() => ({
  anglianWater: { riskOfHarm: '', firstName: '' },
  updateAnglianWater: vi.fn(),
  setStep: vi.fn(),
}));

const showNotification = vi.hoisted(() => vi.fn());

vi.mock('../../store/selfReferralStore', () => ({
  useSelfReferralStore: (selector: any) => selector(store),
}));

vi.mock('@mantine/notifications', () => ({ showNotification }));

describe('useSelfReferralAssessment', () => {
  test('blocks next when risk question is unanswered', () => {
    store.anglianWater.riskOfHarm = '';
    const { result } = renderHook(() => useSelfReferralAssessment());

    act(() => {
      result.current.handleNext();
    });

    expect(result.current.errors.riskOfHarm).toBe('Please answer this question');
    expect(store.setStep).not.toHaveBeenCalled();
    expect(showNotification).toHaveBeenCalled();
  });

  test('advances to step 1 when risk is false', () => {
    store.anglianWater.riskOfHarm = 'false';
    const { result } = renderHook(() => useSelfReferralAssessment());
    act(() => {
      result.current.handleNext();
    });
    expect(store.setStep).toHaveBeenCalledWith(1);
  });
});
