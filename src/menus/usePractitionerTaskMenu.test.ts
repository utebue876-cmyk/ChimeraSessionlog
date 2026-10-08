import type { Practitioner, PractitionerRole } from '@medplum/fhirtypes';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { usePractitionerTaskMenu } from './usePractitionerTaskMenu';

const searchResources = vi.hoisted(() => vi.fn());
const medplumState = vi.hoisted(() => ({ searchResources }));
const profileState = vi.hoisted(() => ({ value: undefined as Practitioner | undefined }));

vi.mock('@medplum/react', async () => {
  const actual = await vi.importActual<typeof import('@medplum/react')>('@medplum/react');
  return {
    ...actual,
    useMedplum: () => medplumState,
    useMedplumProfile: () => profileState.value,
  };
});

describe('usePractitionerTaskMenu', () => {
  beforeEach(() => {
    searchResources.mockReset();
    profileState.value = undefined;
    vi.restoreAllMocks();
  });

  test('returns empty links when no profile is available', async () => {
    const { result } = renderHook(() => usePractitionerTaskMenu());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });

    expect(searchResources).not.toHaveBeenCalled();
  });

  test('builds links for my tasks, roles, licensed states, and static task menus', async () => {
    profileState.value = {
      resourceType: 'Practitioner',
      id: 'pr1',
      qualification: [
        {
          extension: [
            {
              url: 'http://hl7.org/fhir/us/davinci-pdex-plan-net/StructureDefinition/practitioner-qualification',
              extension: [
                {
                  url: 'whereValid',
                  valueCodeableConcept: {
                    coding: [{ system: 'https://www.usps.com/', code: 'tx' }],
                  },
                },
              ],
            },
          ],
        },
      ],
    } as Practitioner;

    searchResources.mockResolvedValue([
      {
        resourceType: 'PractitionerRole',
        id: 'role-1',
        code: [
          {
            coding: [{ system: 'http://example.org/roles', code: 'therapist', display: 'Therapist' }],
          },
        ],
      } as PractitionerRole,
    ]);

    const { result } = renderHook(() => usePractitionerTaskMenu());

    await waitFor(() => {
      expect(result.current.length).toBe(5);
    });

    expect(searchResources).toHaveBeenCalledWith('PractitionerRole', { practitioner: 'Practitioner/pr1' });

    const labels = result.current.map((link) => link.label);
    expect(labels).toEqual(['My Tasks', 'Therapist Tasks', 'Tx Tasks', 'All Tasks', 'Chimera MH Team Tasks']);

    const hrefs = result.current.map((link) => link.href ?? '');
    expect(hrefs[0]).toBe('/my-tasks');
    expect(hrefs[1]).toContain('/Task');
    expect(hrefs[1]).toContain('performer');
    expect(hrefs[2]).toContain('/Task');
    expect(hrefs[2]).toContain('patient.address-state');
    expect(hrefs[3]).toBe('/Task');
    expect(hrefs[4]).toBe('/team-tasks');
  });

  test('logs and keeps links empty when role lookup fails', async () => {
    profileState.value = {
      resourceType: 'Practitioner',
      id: 'pr2',
    } as Practitioner;

    searchResources.mockRejectedValue(new Error('boom'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { result } = renderHook(() => usePractitionerTaskMenu());

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalled();
    });

    expect(result.current).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith('Failed to fetch PractitionerRoles', 'boom');
  });
});
