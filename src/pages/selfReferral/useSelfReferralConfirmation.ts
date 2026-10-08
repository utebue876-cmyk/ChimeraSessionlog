import { normalizeErrorString } from '@medplum/core';
import { useMedplum } from '@medplum/react';
import { useCallback, useState } from 'react';
import { useSelfReferralStore } from '../../store/selfReferralStore';
import type { ReferralBookingResult } from '../../utils/referralBooking';
import { bookReferral } from '../../utils/referralBooking';
import { buildMhAwgIntakeResponse, buildSelfReferralResponse } from './selfReferralSchema';

export interface UseSelfReferralConfirmationResult {
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  cardLastThree: string;
  appointmentStartIso: string | null;
  loading: boolean;
  error: string | null;
  bookingResult: ReferralBookingResult | null;
  handleConfirmBooking: () => Promise<void>;
  goBack: () => void;
}

export function useSelfReferralConfirmation(): UseSelfReferralConfirmationResult {
  const medplum = useMedplum();
  const setStep = useSelfReferralStore((s) => s.setStep);
  const anglianWater = useSelfReferralStore((s) => s.anglianWater);
  const excess = useSelfReferralStore((s) => s.excess);
  const appointmentStartIso = useSelfReferralStore((s) => s.appointmentStartIso);
  const appointmentPractitionerRef = useSelfReferralStore((s) => s.appointmentPractitionerRef);
  const appointmentServiceType = useSelfReferralStore((s) => s.appointmentServiceType);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<ReferralBookingResult | null>(null);

  const cardLastThree = excess.cardNumber.replace(/\s/g, '').slice(-3);

  const goBack = useCallback(() => setStep(3), [setStep]);

  const handleConfirmBooking = useCallback(async () => {
    if (!appointmentStartIso) return;
    setLoading(true);
    setError(null);
    try {
      // Map Anglian Water form values to the referral-type-agnostic interface.
      // Future referral types follow the same pattern with their own store + buildXyzResponse().
      const fhirGender =
        anglianWater.gender === 'male' ? 'male' : anglianWater.gender === 'female' ? 'female' : 'unknown';

      const result = await bookReferral(medplum, {
        patient: {
          firstName: anglianWater.firstName,
          lastName: anglianWater.lastName,
          dob: anglianWater.dob,
          gender: fhirGender,
          phone: anglianWater.phone,
          email: anglianWater.email,
          addressLine1: anglianWater.addressLine1,
          addressLine2: anglianWater.addressLine2 || undefined,
          town: anglianWater.town,
          county: anglianWater.county,
          postcode: anglianWater.postcode,
        },
        consent: {
          dataProcessing: anglianWater.consentDataProcessing,
          sharePartner: anglianWater.consentShareAlliance,
          shareReferrer: anglianWater.consentShareAnglianWater,
        },
        questionnaireResponse: buildSelfReferralResponse(anglianWater, {
          billingAddress: {
            line1: excess.billingLine1,
            line2: excess.billingLine2 || undefined,
            town: excess.billingTown,
            county: excess.billingCounty,
            postcode: excess.billingPostcode,
          },
          appointmentStartIso,
        }),
        additionalQuestionnaireResponses: [buildMhAwgIntakeResponse(anglianWater)],
        planDefinitionIdentifier: 'mh-awg-intake-assessment',
        appointmentStartIso,
        practitionerRef: appointmentPractitionerRef,
        appointmentServiceType,
      });

      setBookingResult(result);
    } catch (err) {
      setError(normalizeErrorString(err));
    } finally {
      setLoading(false);
    }
  }, [
    medplum,
    anglianWater,
    appointmentStartIso,
    appointmentPractitionerRef,
    appointmentServiceType,
    excess.billingCounty,
    excess.billingLine1,
    excess.billingLine2,
    excess.billingPostcode,
    excess.billingTown,
  ]);

  return {
    firstName: anglianWater.firstName,
    lastName: anglianWater.lastName,
    dob: anglianWater.dob,
    gender: anglianWater.gender,
    cardLastThree,
    appointmentStartIso,
    loading,
    error,
    bookingResult,
    handleConfirmBooking,
    goBack,
  };
}
