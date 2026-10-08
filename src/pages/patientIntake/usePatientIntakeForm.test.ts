import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import * as reactRouter from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { usePatientIntakeForm } from './usePatientIntakeForm';

const medplumState = vi.hoisted(() => ({}));
const notificationsState = vi.hoisted(() => ({ showNotification: vi.fn() }));
const serviceTypeOptionsState = vi.hoisted(() => ({
  serviceTypeOptions: [{ value: 'treatment-only', label: 'Treatment Only' }],
  loading: false,
}));
const intakeFormState = vi.hoisted(() => ({
  searchForMatchingPatients: vi.fn(),
  onboardPatient: vi.fn(),
}));
const navigate = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
}));

vi.mock('@mantine/notifications', () => ({
  showNotification: (...args: unknown[]) => notificationsState.showNotification(...args),
}));

vi.mock('../../hooks/useServiceTypeOptions', () => ({
  useServiceTypeOptions: () => serviceTypeOptionsState,
}));

vi.mock('../../config/projectOrganization', () => ({
  getCurrentOrganisationName: () => 'IPRS Health',
}));

vi.mock('../../questionnaires/patientIntakeQuestionnaire', () => ({
  getPatientIntakeQuestionnaire: (organizationName: string) => ({ resourceType: 'Questionnaire', organizationName }),
}));

vi.mock('../../utils/intakeForm', () => ({
  searchForMatchingPatients: (...args: unknown[]) => intakeFormState.searchForMatchingPatients(...args),
  onboardPatient: (...args: unknown[]) => intakeFormState.onboardPatient(...args),
}));

function validFormValues(): Record<string, string> {
  return {
    firstName: 'Jane',
    lastName: 'Doe',
    dob: '1990-01-01',
    gender: 'female',
    homeAddressLine1: '1 Main St',
    homeCity: 'Nottingham',
    homePostcode: 'NG1 1AA',
    homePhone: '07700900000',
    referralDate: '2026-01-01',
  };
}

describe('usePatientIntakeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigate as any);
    intakeFormState.searchForMatchingPatients.mockResolvedValue([]);
    intakeFormState.onboardPatient.mockResolvedValue({ resourceType: 'Patient', id: 'patient-1' });
  });

  test('set() updates a field and clears its error', () => {
    const { result } = renderHook(() => usePatientIntakeForm());

    act(() => {
      result.current.set('firstName', 'Jane');
    });

    expect(result.current.values.firstName).toBe('Jane');
  });

  test('set() resets Optima-specific fields when the insurance provider changes', () => {
    const { result } = renderHook(() => usePatientIntakeForm());

    act(() => {
      result.current.set('optimaEmployerRef', { reference: 'Organization/employer-1', display: 'Acme Corp' });
      result.current.set('optimaLocation', 'Nottingham');
      result.current.set('serviceTypeCode', 'treatment-only');
      result.current.set('insurancePlanRef', { reference: 'InsurancePlan/plan-1', display: 'Aviva MH 2026' });
    });
    act(() => {
      result.current.set('insuranceProviderRef', { reference: 'Organization/funder-1', display: 'Aviva Health' });
    });

    expect(result.current.values.optimaEmployerRef).toBeNull();
    expect(result.current.values.optimaLocation).toBe('');
    expect(result.current.values.serviceTypeCode).toBe('');
    expect(result.current.values.insurancePlanRef).toBeNull();
  });

  test('handleSubmit shows a validation error and does not call onboardPatient when required fields are missing', async () => {
    const { result } = renderHook(() => usePatientIntakeForm());

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(notificationsState.showNotification).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'red', message: 'Please fill in all required fields.' })
    );
    expect(intakeFormState.onboardPatient).not.toHaveBeenCalled();
  });

  test('handleSubmit blocks Vitality funders selecting the treatment-only referral type', async () => {
    const { result } = renderHook(() => usePatientIntakeForm());

    act(() => {
      Object.entries(validFormValues()).forEach(([field, value]) => {
        result.current.set(field as never, value as never);
      });
      result.current.set('insuranceProviderRef', { reference: 'Organization/vitality', display: 'Vitality Health' });
      result.current.set('healthcareProviderRef', {
        reference: 'Organization/service-line-1',
        display: 'Service Line',
      });
      result.current.set('serviceTypeCode', 'treatment-only');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(notificationsState.showNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'yellow',
        message: 'Vitality Health only allows Psychologist Only as Referral Type.',
      })
    );
    expect(intakeFormState.onboardPatient).not.toHaveBeenCalled();
  });

  test('handleSubmit surfaces matching patients instead of onboarding when duplicates are found', async () => {
    const duplicate = { resourceType: 'Patient', id: 'existing-1' };
    intakeFormState.searchForMatchingPatients.mockResolvedValue([duplicate]);

    const { result } = renderHook(() => usePatientIntakeForm());

    act(() => {
      Object.entries(validFormValues()).forEach(([field, value]) => {
        result.current.set(field as never, value as never);
      });
      result.current.set('insuranceProviderRef', { reference: 'Organization/funder-1', display: 'Aviva Health' });
      result.current.set('insurancePlanRef', { reference: 'InsurancePlan/plan-1', display: 'Aviva MH 2026' });
      result.current.set('healthcareProviderRef', {
        reference: 'Organization/service-line-1',
        display: 'Service Line',
      });
      result.current.set('serviceTypeCode', 'treatment-only');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.matchingPatients).toEqual([duplicate]);
    expect(intakeFormState.onboardPatient).not.toHaveBeenCalled();
  });

  test('handleSubmit onboards the patient and navigates to their case on success', async () => {
    const { result } = renderHook(() => usePatientIntakeForm());

    act(() => {
      Object.entries(validFormValues()).forEach(([field, value]) => {
        result.current.set(field as never, value as never);
      });
      result.current.set('insuranceProviderRef', { reference: 'Organization/funder-1', display: 'Aviva Health' });
      result.current.set('insurancePlanRef', { reference: 'InsurancePlan/plan-1', display: 'Aviva MH 2026' });
      result.current.set('healthcareProviderRef', {
        reference: 'Organization/service-line-1',
        display: 'Service Line',
      });
      result.current.set('serviceTypeCode', 'treatment-only');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(intakeFormState.onboardPatient).toHaveBeenCalledWith(
      medplumState,
      expect.objectContaining({ organizationName: 'IPRS Health' }),
      expect.objectContaining({ resourceType: 'QuestionnaireResponse' }),
      expect.any(String)
    );
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/Patient/patient-1/case'));
  });

  test('reuses the same submission key across retried submit attempts', async () => {
    const { result } = renderHook(() => usePatientIntakeForm());

    act(() => {
      Object.entries(validFormValues()).forEach(([field, value]) => {
        result.current.set(field as never, value as never);
      });
      result.current.set('insuranceProviderRef', { reference: 'Organization/funder-1', display: 'Aviva Health' });
      result.current.set('insurancePlanRef', { reference: 'InsurancePlan/plan-1', display: 'Aviva MH 2026' });
      result.current.set('healthcareProviderRef', {
        reference: 'Organization/service-line-1',
        display: 'Service Line',
      });
      result.current.set('serviceTypeCode', 'treatment-only');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });
    await act(async () => {
      await result.current.handleSubmit();
    });

    const firstKey = intakeFormState.onboardPatient.mock.calls[0][3];
    const secondKey = intakeFormState.onboardPatient.mock.calls[1][3];
    expect(firstKey).toBe(secondKey);
  });

  test('handleSubmit shows an error notification when onboarding fails', async () => {
    intakeFormState.onboardPatient.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => usePatientIntakeForm());

    act(() => {
      Object.entries(validFormValues()).forEach(([field, value]) => {
        result.current.set(field as never, value as never);
      });
      result.current.set('insuranceProviderRef', { reference: 'Organization/funder-1', display: 'Aviva Health' });
      result.current.set('insurancePlanRef', { reference: 'InsurancePlan/plan-1', display: 'Aviva MH 2026' });
      result.current.set('healthcareProviderRef', {
        reference: 'Organization/service-line-1',
        display: 'Service Line',
      });
      result.current.set('serviceTypeCode', 'treatment-only');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(notificationsState.showNotification).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'red', autoClose: false })
    );
  });

  test('handleOpenMatchingPatient navigates and clears matching patients', () => {
    const { result } = renderHook(() => usePatientIntakeForm());

    act(() => {
      result.current.handleOpenMatchingPatient('patient-1');
    });

    expect(navigate).toHaveBeenCalledWith('/Patient/patient-1/case');
    expect(result.current.matchingPatients).toEqual([]);
  });

  test('handleDismissMatchingPatients clears matching patients', async () => {
    intakeFormState.searchForMatchingPatients.mockResolvedValue([{ resourceType: 'Patient', id: 'existing-1' }]);
    const { result } = renderHook(() => usePatientIntakeForm());

    act(() => {
      Object.entries(validFormValues()).forEach(([field, value]) => {
        result.current.set(field as never, value as never);
      });
      result.current.set('insuranceProviderRef', { reference: 'Organization/funder-1', display: 'Aviva Health' });
      result.current.set('insurancePlanRef', { reference: 'InsurancePlan/plan-1', display: 'Aviva MH 2026' });
      result.current.set('healthcareProviderRef', {
        reference: 'Organization/service-line-1',
        display: 'Service Line',
      });
      result.current.set('serviceTypeCode', 'treatment-only');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(result.current.matchingPatients).toHaveLength(1);

    act(() => {
      result.current.handleDismissMatchingPatients();
    });

    expect(result.current.matchingPatients).toEqual([]);
  });
});
