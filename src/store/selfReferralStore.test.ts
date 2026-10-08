import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { EXCESS_INITIAL_VALUES } from '../pages/selfReferral/useSelfReferralExcess';
import { useSelfReferralStore } from './selfReferralStore';

describe('useSelfReferralStore', () => {
  test('setStep updates the current step', () => {
    const { result } = renderHook(() => useSelfReferralStore());

    act(() => {
      result.current.setStep(2);
    });

    expect(result.current.currentStep).toBe(2);
  });

  test('updateAnglianWater merges a single field without touching the rest', () => {
    const { result } = renderHook(() => useSelfReferralStore());

    act(() => {
      result.current.updateAnglianWater('firstName', 'Jamie');
    });
    act(() => {
      result.current.updateAnglianWater('lastName', 'Doe');
    });

    expect(result.current.anglianWater.firstName).toBe('Jamie');
    expect(result.current.anglianWater.lastName).toBe('Doe');
  });

  test('updateExcess merges a single field without resetting others', () => {
    const { result } = renderHook(() => useSelfReferralStore());

    act(() => {
      result.current.updateExcess('nameOnCard', 'J Doe');
    });
    act(() => {
      result.current.updateExcess('cardNumber', '4111111111111111');
    });

    expect(result.current.excess.nameOnCard).toBe('J Doe');
    expect(result.current.excess.cardNumber).toBe('4111111111111111');
  });

  test('setAppointmentDetails stores all three appointment fields together', () => {
    const { result } = renderHook(() => useSelfReferralStore());

    act(() => {
      result.current.setAppointmentDetails('2026-01-01T09:00:00Z', 'Practitioner/1', { text: 'Assessment' });
    });

    expect(result.current.appointmentStartIso).toBe('2026-01-01T09:00:00Z');
    expect(result.current.appointmentPractitionerRef).toBe('Practitioner/1');
    expect(result.current.appointmentServiceType).toEqual({ text: 'Assessment' });
  });

  test('clearAnglianWater resets the form, excess and step back to their initial state', () => {
    const { result } = renderHook(() => useSelfReferralStore());

    act(() => {
      result.current.setStep(3);
      result.current.updateAnglianWater('firstName', 'Jamie');
      result.current.updateExcess('nameOnCard', 'J Doe');
      result.current.setAppointmentDetails('2026-01-01T09:00:00Z', 'Practitioner/1', null);
    });

    act(() => {
      result.current.clearAnglianWater();
    });

    expect(result.current.currentStep).toBe(0);
    expect(result.current.anglianWater.firstName).toBe('');
    expect(result.current.excess).toEqual(EXCESS_INITIAL_VALUES);
    expect(result.current.appointmentStartIso).toBeNull();
    expect(result.current.appointmentPractitionerRef).toBeNull();
  });
});
