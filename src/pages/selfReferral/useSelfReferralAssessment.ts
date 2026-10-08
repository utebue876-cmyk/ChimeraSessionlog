import { showNotification } from '@mantine/notifications';
import { useCallback, useState } from 'react';
import { useSelfReferralStore } from '../../store/selfReferralStore';
import type { SelfReferralFormErrors, SelfReferralFormValues } from './selfReferralSchema';

export interface UseSelfReferralAssessmentResult {
  values: SelfReferralFormValues;
  errors: SelfReferralFormErrors;
  set: <K extends keyof SelfReferralFormValues>(field: K, value: SelfReferralFormValues[K]) => void;
  handleNext: () => void;
}

export function useSelfReferralAssessment(): UseSelfReferralAssessmentResult {
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
    if (!values.riskOfHarm) {
      setErrors({ riskOfHarm: 'Please answer this question' });
      showNotification({ color: 'red', message: 'Please answer question 1 before continuing.', autoClose: false });
      return;
    }
    if (values.riskOfHarm === 'true') {
      showNotification({
        color: 'red',
        title: 'Crisis support required',
        message:
          'This service cannot support you in a crisis. Please call 999, visit your nearest A&E, or call the Samaritans on 116 123.',
        autoClose: false,
      });
      return;
    }
    setStep(1);
  }, [values.riskOfHarm, setStep]);

  return { values, errors, set, handleNext };
}
