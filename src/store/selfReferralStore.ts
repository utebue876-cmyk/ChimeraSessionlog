import type { CodeableConcept } from '@medplum/fhirtypes';
import { create } from 'zustand';
import type { SelfReferralFormValues } from '../pages/selfReferral/selfReferralSchema';
import { SELF_REFERRAL_INITIAL_VALUES } from '../pages/selfReferral/selfReferralSchema';
import type { ExcessFormValues } from '../pages/selfReferral/useSelfReferralExcess';
import { EXCESS_INITIAL_VALUES } from '../pages/selfReferral/useSelfReferralExcess';

export type SelfReferralStep = 0 | 1 | 2 | 3 | 4;

interface SelfReferralStore {
  currentStep: SelfReferralStep;
  setStep: (step: SelfReferralStep) => void;
  anglianWater: SelfReferralFormValues;
  setAnglianWater: (values: SelfReferralFormValues) => void;
  updateAnglianWater: <K extends keyof SelfReferralFormValues>(field: K, value: SelfReferralFormValues[K]) => void;
  excess: ExcessFormValues;
  updateExcess: <K extends keyof ExcessFormValues>(field: K, value: ExcessFormValues[K]) => void;
  setExcess: (values: ExcessFormValues) => void;
  appointmentStartIso: string | null;
  appointmentPractitionerRef: string | null;
  appointmentServiceType: CodeableConcept | null;
  setAppointmentDetails: (
    startIso: string,
    practitionerRef: string | null,
    serviceType: CodeableConcept | null
  ) => void;
  clearAnglianWater: () => void;
}

export const useSelfReferralStore = create<SelfReferralStore>()((set) => ({
  currentStep: 0,

  setStep: (step) => set({ currentStep: step }),

  anglianWater: SELF_REFERRAL_INITIAL_VALUES,

  setAnglianWater: (values) => set({ anglianWater: values }),

  updateAnglianWater: (field, value) =>
    set((state) => ({
      anglianWater: { ...state.anglianWater, [field]: value },
    })),

  excess: EXCESS_INITIAL_VALUES,

  updateExcess: (field, value) =>
    set((state) => ({
      excess: { ...state.excess, [field]: value },
    })),

  setExcess: (values) => set({ excess: values }),

  appointmentStartIso: null,
  appointmentPractitionerRef: null,
  appointmentServiceType: null,

  setAppointmentDetails: (startIso, practitionerRef, serviceType) =>
    set({
      appointmentStartIso: startIso,
      appointmentPractitionerRef: practitionerRef,
      appointmentServiceType: serviceType,
    }),

  clearAnglianWater: () =>
    set({
      anglianWater: SELF_REFERRAL_INITIAL_VALUES,
      excess: EXCESS_INITIAL_VALUES,
      currentStep: 0,
      appointmentStartIso: null,
      appointmentPractitionerRef: null,
      appointmentServiceType: null,
    }),
}));
