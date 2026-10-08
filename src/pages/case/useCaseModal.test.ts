import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CASE_STATE_CODE_SYSTEM_URL, EOC_CASE_STATE_URL } from '../../config/chimera-urls';
import { useCaseModal } from './useCaseModal';

const valueSetExpand = vi.hoisted(() => vi.fn());
const readReference = vi.hoisted(() => vi.fn());
const searchResources = vi.hoisted(() => vi.fn());
const searchOne = vi.hoisted(() => vi.fn());
const updateResource = vi.hoisted(() => vi.fn());
const createResource = vi.hoisted(() => vi.fn());
const medplumState = vi.hoisted(() => ({
  valueSetExpand,
  readReference,
  searchResources,
  searchOne,
  updateResource,
  createResource,
}));
const showNotification = vi.hoisted(() => vi.fn());

vi.mock('@medplum/react', () => ({ useMedplum: () => medplumState }));
vi.mock('@mantine/notifications', () => ({ showNotification }));
vi.mock('../../hooks/useServiceTypeOptions', () => ({
  useServiceTypeOptions: () => ({
    allServiceTypeOptions: [{ value: 'svc1', label: 'Service 1', system: 'sys' }],
    serviceTypeOptions: [{ value: 'svc1', label: 'Service 1', system: 'sys' }],
    loading: false,
    isVitalityOrganizationSelected: false,
  }),
}));
vi.mock('../../utils/patientActivity', () => ({ recordPatientActivity: vi.fn() }));

describe('useCaseModal', () => {
  beforeEach(() => {
    searchResources.mockResolvedValue([]);
    searchOne.mockResolvedValue(undefined);
    readReference.mockResolvedValue({ resourceType: 'Organization', id: 'org-1', name: 'Org 1' });
  });

  test('loads value set options and initializes defaults in create mode', async () => {
    valueSetExpand
      .mockResolvedValueOnce({ expansion: { contains: [{ code: 'active', display: 'Active' }] } })
      .mockResolvedValueOnce({ expansion: { contains: [{ code: 'intake', display: 'Intake' }] } });

    const { result } = renderHook(() =>
      useCaseModal({
        patient: { resourceType: 'Patient', id: 'p1' } as any,
        opened: true,
        onClose: vi.fn(),
      })
    );

    await waitFor(() => expect(result.current.statusOptions.length).toBeGreaterThan(0));
    expect(result.current.status).toBe('active');
    expect(result.current.isEditMode).toBe(false);
  });

  test('shows required field errors when saving incomplete case', async () => {
    valueSetExpand
      .mockResolvedValueOnce({ expansion: { contains: [{ code: 'active', display: 'Active' }] } })
      .mockResolvedValueOnce({ expansion: { contains: [{ code: 'intake', display: 'Intake' }] } });

    const { result } = renderHook(() =>
      useCaseModal({
        patient: { resourceType: 'Patient', id: 'p1' } as any,
        opened: true,
        onClose: vi.fn(),
      })
    );

    await waitFor(() => expect(result.current.statusOptions.length).toBeGreaterThan(0));

    await act(async () => {
      await result.current.handleSaveCase();
    });

    expect(result.current.fieldErrors.serviceTypeCode).toBe('Required');
    expect(result.current.fieldErrors.openedDate).toBe('Required');
    expect(result.current.fieldErrors.managingOrganization).toBe('Required');
    expect(showNotification).toHaveBeenCalledWith(expect.objectContaining({ color: 'yellow' }));
  });

  test('filters mhCaseStateOptions to ordinals greater than or equal to the saved case state', async () => {
    valueSetExpand
      .mockResolvedValueOnce({ expansion: { contains: [{ code: 'active', display: 'Active' }] } })
      .mockResolvedValueOnce({
        expansion: {
          contains: [
            { code: 'awaiting-acceptance', display: 'Awaiting acceptance' },
            { code: 'accepted-awaiting-booking', display: 'Accepted, awaiting booking' },
            { code: 'awaiting-treatment-decision', display: 'Awaiting treatment decision' },
            { code: 'in-treatment', display: 'In treatment' },
            { code: 'on-hold', display: 'On hold' },
          ],
        },
      });
    searchOne.mockResolvedValue({
      resourceType: 'CodeSystem',
      id: 'cs1',
      url: CASE_STATE_CODE_SYSTEM_URL,
      status: 'active',
      content: 'complete',
      concept: [
        { code: 'awaiting-acceptance', property: [{ code: 'ordinal', valueInteger: 10 }] },
        { code: 'accepted-awaiting-booking', property: [{ code: 'ordinal', valueInteger: 20 }] },
        { code: 'awaiting-treatment-decision', property: [{ code: 'ordinal', valueInteger: 40 }] },
        { code: 'in-treatment', property: [{ code: 'ordinal', valueInteger: 50 }] },
        { code: 'on-hold', property: [] },
      ],
    });

    // Stable reference: an inline object literal recreated on every render would change identity
    // and re-trigger the episode-driven effect (whose dependency array includes `episode`) forever.
    const episode = {
      resourceType: 'EpisodeOfCare',
      id: 'ep1',
      status: 'active',
      extension: [{ url: EOC_CASE_STATE_URL, valueCoding: { code: 'awaiting-treatment-decision' } }],
    } as any;

    const { result } = renderHook(() =>
      useCaseModal({
        patient: { resourceType: 'Patient', id: 'p1' } as any,
        opened: true,
        onClose: vi.fn(),
        episode,
      })
    );

    await waitFor(() => expect(result.current.mhCaseStateOptions.length).toBeGreaterThan(0));

    expect(result.current.mhCaseStateOptions.map((o) => o.value)).toEqual([
      'awaiting-treatment-decision',
      'in-treatment',
    ]);
  });

  test('does not re-narrow mhCaseStateOptions when the user selects a different status', async () => {
    valueSetExpand
      .mockResolvedValueOnce({ expansion: { contains: [{ code: 'active', display: 'Active' }] } })
      .mockResolvedValueOnce({
        expansion: {
          contains: [
            { code: 'awaiting-acceptance', display: 'Awaiting acceptance' },
            { code: 'accepted-awaiting-booking', display: 'Accepted, awaiting booking' },
            { code: 'awaiting-treatment-decision', display: 'Awaiting treatment decision' },
            { code: 'in-treatment', display: 'In treatment' },
          ],
        },
      });
    searchOne.mockResolvedValue({
      resourceType: 'CodeSystem',
      id: 'cs1',
      url: CASE_STATE_CODE_SYSTEM_URL,
      status: 'active',
      content: 'complete',
      concept: [
        { code: 'awaiting-acceptance', property: [{ code: 'ordinal', valueInteger: 10 }] },
        { code: 'accepted-awaiting-booking', property: [{ code: 'ordinal', valueInteger: 20 }] },
        { code: 'awaiting-treatment-decision', property: [{ code: 'ordinal', valueInteger: 40 }] },
        { code: 'in-treatment', property: [{ code: 'ordinal', valueInteger: 50 }] },
      ],
    });

    const episode = {
      resourceType: 'EpisodeOfCare',
      id: 'ep1',
      status: 'active',
      extension: [{ url: EOC_CASE_STATE_URL, valueCoding: { code: 'accepted-awaiting-booking' } }],
    } as any;

    const { result } = renderHook(() =>
      useCaseModal({
        patient: { resourceType: 'Patient', id: 'p1' } as any,
        opened: true,
        onClose: vi.fn(),
        episode,
      })
    );

    await waitFor(() => expect(result.current.mhCaseStateOptions.length).toBeGreaterThan(0));

    expect(result.current.mhCaseStateOptions.map((o) => o.value)).toEqual([
      'accepted-awaiting-booking',
      'awaiting-treatment-decision',
      'in-treatment',
    ]);

    act(() => {
      result.current.setMhCaseStateCode('in-treatment');
    });

    // Selecting a later (higher-ordinal) status must not re-narrow the list any further.
    expect(result.current.mhCaseStateOptions.map((o) => o.value)).toEqual([
      'accepted-awaiting-booking',
      'awaiting-treatment-decision',
      'in-treatment',
    ]);
  });

  test('preserves the episode diagnosis when saving an edited case', async () => {
    valueSetExpand
      .mockResolvedValueOnce({ expansion: { contains: [{ code: 'active', display: 'Active' }] } })
      .mockResolvedValueOnce({ expansion: { contains: [{ code: 'intake', display: 'Intake' }] } });

    readReference.mockImplementation(async (ref: { reference: string }) => {
      switch (ref.reference) {
        case 'Organization/org1':
          return { resourceType: 'Organization', id: 'org1', name: 'Managing Org' };
        case 'Practitioner/pr1':
          return { resourceType: 'Practitioner', id: 'pr1', name: [{ given: ['Dr'], family: 'Smith' }] };
        case 'ServiceRequest/sr1':
          return {
            resourceType: 'ServiceRequest',
            id: 'sr1',
            requester: { reference: 'Organization/insurer1', display: 'Insurer' },
            insurance: [{ reference: 'Coverage/cov1' }],
          };
        case 'Organization/insurer1':
          return { resourceType: 'Organization', id: 'insurer1', name: 'Insurer' };
        case 'Coverage/cov1':
          return { resourceType: 'Coverage', id: 'cov1', subscriberId: 'POLICY-1' };
        default:
          throw new Error(`Unexpected reference: ${ref.reference}`);
      }
    });

    const episode = {
      resourceType: 'EpisodeOfCare',
      id: 'ep1',
      status: 'active',
      patient: { reference: 'Patient/p1' },
      type: [{ coding: [{ system: 'sys', code: 'svc1', display: 'Service 1' }] }],
      period: { start: '2024-01-01' },
      identifier: [{ value: 'CASE-1' }],
      managingOrganization: { reference: 'Organization/org1' },
      careManager: { reference: 'Practitioner/pr1' },
      referralRequest: [{ reference: 'ServiceRequest/sr1' }],
      diagnosis: [
        { condition: { reference: 'Condition/c1' }, rank: 1 },
        { condition: { reference: 'Condition/c2' }, rank: 2 },
      ],
    } as any;

    updateResource.mockResolvedValue(episode);

    const { result } = renderHook(() =>
      useCaseModal({
        patient: { resourceType: 'Patient', id: 'p1' } as any,
        opened: true,
        onClose: vi.fn(),
        episode,
      })
    );

    await waitFor(() => expect(result.current.policyNumber).toBe('POLICY-1'));
    await waitFor(() => expect(result.current.careManagerResource?.id).toBe('pr1'));
    await waitFor(() => expect(result.current.managingOrganizationResource?.id).toBe('org1'));

    await act(async () => {
      await result.current.handleSaveCase();
    });

    expect(updateResource).toHaveBeenCalledWith(expect.objectContaining({ diagnosis: episode.diagnosis }));
  });
});
