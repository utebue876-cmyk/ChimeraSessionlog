import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useSelfReferralConfirmation } from './useSelfReferralConfirmation';

const bookReferral = vi.hoisted(() => vi.fn());
const setStep = vi.hoisted(() => vi.fn());

const store = vi.hoisted(() => ({
  setStep,
  anglianWater: {
    firstName: 'Jane',
    lastName: 'Doe',
    dob: '1990-01-01',
    gender: 'female',
    phone: '01234',
    email: 'jane@example.com',
    addressLine1: '1 High Street',
    addressLine2: '',
    town: 'Norwich',
    county: 'Norfolk',
    postcode: 'NR1 1AA',
    consentDataProcessing: true,
    consentShareAlliance: true,
    consentShareAnglianWater: true,
    riskOfHarm: 'false',
    protectiveFactors: '',
    triggeringFactors: [],
    substanceUse: '',
    pastPsychologicalProblems: '',
    pastTherapy: '',
    mentalHealthMedication: '',
    mainProblem: '',
    problemStart: '',
    problemAspectsSymptoms: '',
  },
  excess: {
    cardNumber: '4242 4242 4242 123',
    billingLine1: '1 High Street',
    billingLine2: '',
    billingTown: 'Norwich',
    billingCounty: 'Norfolk',
    billingPostcode: 'NR1 1AA',
  },
  appointmentStartIso: '2026-01-01T09:00:00Z',
  appointmentPractitionerRef: 'Practitioner/p1',
  appointmentServiceType: { coding: [{ code: 'test' }] },
}));

vi.mock('@medplum/react', () => ({ useMedplum: () => ({}) }));
vi.mock('../../store/selfReferralStore', () => ({
  useSelfReferralStore: (selector: any) => selector(store),
}));
vi.mock('../../utils/referralBooking', () => ({
  bookReferral,
}));

describe('useSelfReferralConfirmation', () => {
  test('goBack sets previous step', () => {
    const { result } = renderHook(() => useSelfReferralConfirmation());
    act(() => {
      result.current.goBack();
    });
    expect(setStep).toHaveBeenCalledWith(3);
    expect(result.current.cardLastThree).toBe('123');
  });

  test('handleConfirmBooking stores booking result', async () => {
    bookReferral.mockResolvedValue({
      patient: { id: 'p1' },
      questionnaireResponse: { id: 'qr1' },
      serviceRequest: { id: 'sr1' },
      task: { id: 't1' },
      appointment: { id: 'a1' },
    });

    const { result } = renderHook(() => useSelfReferralConfirmation());
    await act(async () => {
      await result.current.handleConfirmBooking();
    });

    expect(bookReferral).toHaveBeenCalled();
    expect(result.current.bookingResult?.appointment?.id).toBe('a1');
  });
});
