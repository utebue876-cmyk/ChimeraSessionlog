import { showNotification } from '@mantine/notifications';
import { useCallback, useState } from 'react';
import { useSelfReferralStore } from '../../store/selfReferralStore';
import type { SelfReferralFormValues } from './selfReferralSchema';

export interface ExcessFormValues {
  nameOnCard: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  securityNumber: string;
  billingPostcode: string;
  billingLine1: string;
  billingLine2: string;
  billingTown: string;
  billingCounty: string;
  consentForPayment: boolean;
}

export type ExcessFormErrors = Partial<Record<keyof ExcessFormValues, string>>;

export const EXCESS_INITIAL_VALUES: ExcessFormValues = {
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
};

export function validateExcessForm(values: ExcessFormValues): ExcessFormErrors {
  const errors: ExcessFormErrors = {};
  if (!values.nameOnCard.trim()) errors.nameOnCard = 'Required';
  if (!/^\d{4} \d{4} \d{4} \d{4}$/.test(values.cardNumber))
    errors.cardNumber = values.cardNumber.trim() ? 'Must be 16 digits' : 'Required';
  if (!/^(0[1-9]|1[0-2])$/.test(values.expiryMonth))
    errors.expiryMonth = values.expiryMonth.trim() ? 'Must be 01–12' : 'Required';
  if (!/^\d{2}$/.test(values.expiryYear))
    errors.expiryYear = values.expiryYear.trim() ? 'Must be 2 digits (YY)' : 'Required';
  if (!/^\d{3,4}$/.test(values.securityNumber))
    errors.securityNumber = values.securityNumber.trim() ? 'Must be 3 or 4 digits' : 'Required';
  if (!/^[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}$/i.test(values.billingPostcode))
    errors.billingPostcode = values.billingPostcode.trim() ? 'Please enter a valid UK postcode' : 'Required';
  if (!values.billingLine1.trim()) errors.billingLine1 = 'Required';
  if (!values.billingTown.trim()) errors.billingTown = 'Required';
  if (!values.billingCounty.trim()) errors.billingCounty = 'Required';
  if (!values.consentForPayment) errors.consentForPayment = 'Required';
  return errors;
}

export interface UseSelfReferralExcessResult {
  values: ExcessFormValues;
  errors: ExcessFormErrors;
  formValues: SelfReferralFormValues;
  sameAsPersonal: boolean;
  set: <K extends keyof ExcessFormValues>(field: K, value: ExcessFormValues[K]) => void;
  toggleSameAsPersonal: (checked: boolean) => void;
  handleConfirm: () => void;
}

export function useSelfReferralExcess(): UseSelfReferralExcessResult {
  const setStep = useSelfReferralStore((s) => s.setStep);
  const formValues = useSelfReferralStore((s) => s.anglianWater);
  const values = useSelfReferralStore((s) => s.excess);
  const updateExcess = useSelfReferralStore((s) => s.updateExcess);
  const setExcess = useSelfReferralStore((s) => s.setExcess);

  const [errors, setErrors] = useState<ExcessFormErrors>({});
  const [sameAsPersonal, setSameAsPersonal] = useState(false);

  const toggleSameAsPersonal = useCallback(
    (checked: boolean) => {
      setSameAsPersonal(checked);
      if (checked) {
        setExcess({
          ...values,
          billingLine1: formValues.addressLine1,
          billingLine2: formValues.addressLine2,
          billingTown: formValues.town,
          billingCounty: formValues.county,
          billingPostcode: formValues.postcode,
        });
        setErrors((prev) => ({
          ...prev,
          billingLine1: undefined,
          billingLine2: undefined,
          billingTown: undefined,
          billingCounty: undefined,
          billingPostcode: undefined,
        }));
      }
    },
    [formValues, values, setExcess]
  );

  const set = useCallback(
    <K extends keyof ExcessFormValues>(field: K, value: ExcessFormValues[K]) => {
      updateExcess(field, value);
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    [updateExcess]
  );

  const handleConfirm = useCallback(() => {
    const validationErrors = validateExcessForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showNotification({ color: 'red', message: 'Please complete all fields.', autoClose: false });
      return;
    }

    setStep(3);
  }, [setStep, values]);

  return {
    values,
    errors,
    formValues,
    sameAsPersonal,
    set,
    toggleSameAsPersonal,
    handleConfirm,
  };
}
