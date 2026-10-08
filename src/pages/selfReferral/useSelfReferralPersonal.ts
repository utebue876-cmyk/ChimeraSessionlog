import { showNotification } from '@mantine/notifications';
import { useCallback, useState } from 'react';
import { useSelfReferralStore } from '../../store/selfReferralStore';
import type { SelfReferralFormErrors, SelfReferralFormValues } from './selfReferralSchema';
import { validateSelfReferralPersonal } from './selfReferralSchema';

export interface UseSelfReferralPersonalResult {
  values: SelfReferralFormValues;
  errors: SelfReferralFormErrors;
  set: <K extends keyof SelfReferralFormValues>(field: K, value: SelfReferralFormValues[K]) => void;
  setErrors: (errors: SelfReferralFormErrors) => void;
  handleNext: () => void;
  goBack: () => void;
}

export function useSelfReferralPersonal(): UseSelfReferralPersonalResult {
  const values = useSelfReferralStore((s) => s.anglianWater);
  const updateAnglianWater = useSelfReferralStore((s) => s.updateAnglianWater);
  const setStep = useSelfReferralStore((s) => s.setStep);
  const [errors, setErrors] = useState<SelfReferralFormErrors>({});

  const set = useCallback(
    <K extends keyof SelfReferralFormValues>(field: K, value: SelfReferralFormValues[K]) => {
      updateAnglianWater(field, value);
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    [updateAnglianWater]
  );

  const handleNext = useCallback(() => {
    const validationErrors = validateSelfReferralPersonal(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const message =
        validationErrors.dob && validationErrors.dob !== 'Required'
          ? 'Please enter a valid Date of Birth.'
          : 'Please fill in all required fields.';
      showNotification({ color: 'red', message, autoClose: false });
      return;
    }
    setStep(2);
  }, [values, setStep]);

  const goBack = useCallback(() => setStep(0), [setStep]);

  return { values, errors, set, setErrors, handleNext, goBack };
}
