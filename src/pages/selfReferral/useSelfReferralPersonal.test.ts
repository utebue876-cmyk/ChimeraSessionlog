import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useSelfReferralPersonal } from './useSelfReferralPersonal';

const store = vi.hoisted(() => ({
  anglianWater: {
    firstName: '',
    lastName: '',
    addressLine1: '',
    addressLine2: '',
    town: '',
    county: '',
    postcode: '',
    dob: '',
    gender: '',
    phone: '',
    email: '',
    consentDataProcessing: false,
    consentShareAlliance: false,
    consentShareAnglianWater: false,
  },
  updateAnglianWater: vi.fn(),
  setStep: vi.fn(),
}));

const showNotification = vi.hoisted(() => vi.fn());

vi.mock('../../store/selfReferralStore', () => ({
  useSelfReferralStore: (selector: any) => selector(store),
}));

vi.mock('@mantine/notifications', () => ({ showNotification }));

describe('useSelfReferralPersonal', () => {
  test('shows validation notification and does not advance for invalid form', () => {
    const { result } = renderHook(() => useSelfReferralPersonal());
    act(() => {
      result.current.handleNext();
    });

    expect(store.setStep).not.toHaveBeenCalledWith(2);
    expect(showNotification).toHaveBeenCalled();
  });

  test('advances and supports goBack when form is valid', () => {
    store.anglianWater = {
      ...store.anglianWater,
      firstName: 'Jane',
      lastName: 'Doe',
      addressLine1: '1 High Street',
      town: 'Norwich',
      county: 'Norfolk',
      postcode: 'NR1 1AA',
      dob: '1990-01-01',
      gender: 'female',
      phone: '01234',
      email: 'jane@example.com',
      consentDataProcessing: true,
      consentShareAlliance: true,
      consentShareAnglianWater: true,
    };

    const { result } = renderHook(() => useSelfReferralPersonal());
    act(() => {
      result.current.handleNext();
    });
    expect(store.setStep).toHaveBeenCalledWith(2);

    act(() => {
      result.current.goBack();
    });
    expect(store.setStep).toHaveBeenCalledWith(0);
  });
});
