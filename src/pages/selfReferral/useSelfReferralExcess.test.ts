import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useSelfReferralExcess, validateExcessForm } from './useSelfReferralExcess';

const store = vi.hoisted(() => ({
  setStep: vi.fn(),
  anglianWater: {
    addressLine1: '1 High Street',
    addressLine2: 'Flat 2',
    town: 'Norwich',
    county: 'Norfolk',
    postcode: 'NR1 1AA',
  },
  excess: {
    nameOnCard: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    securityNumber: '',
    billingPostcode: '',
    billingLine1: '',
    billingLine2: '',
    billingTown: '',
    billingCounty: '',
    consentForPayment: false,
  },
  updateExcess: vi.fn(),
  setExcess: vi.fn(),
}));

const showNotification = vi.hoisted(() => vi.fn());

vi.mock('../../store/selfReferralStore', () => ({
  useSelfReferralStore: (selector: any) => selector(store),
}));

vi.mock('@mantine/notifications', () => ({ showNotification }));

describe('useSelfReferralExcess', () => {
  test('validateExcessForm enforces required and format rules', () => {
    const errors = validateExcessForm(store.excess as any);
    expect(errors.nameOnCard).toBe('Required');
    expect(errors.cardNumber).toBe('Required');
    expect(errors.consentForPayment).toBe('Required');
  });

  test('copies personal address when same-as-personal is enabled', () => {
    const { result } = renderHook(() => useSelfReferralExcess());
    act(() => {
      result.current.toggleSameAsPersonal(true);
    });
    expect(store.setExcess).toHaveBeenCalled();
  });

  test('advances when form is valid', () => {
    store.excess = {
      ...store.excess,
      nameOnCard: 'Jane Doe',
      cardNumber: '4242 4242 4242 4242',
      expiryMonth: '12',
      expiryYear: '30',
      securityNumber: '123',
      billingPostcode: 'NR1 1AA',
      billingLine1: '1 High Street',
      billingTown: 'Norwich',
      billingCounty: 'Norfolk',
      consentForPayment: true,
    };

    const { result } = renderHook(() => useSelfReferralExcess());
    act(() => {
      result.current.handleConfirm();
    });
    expect(store.setStep).toHaveBeenCalledWith(3);
  });
});
