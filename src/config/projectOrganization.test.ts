import type { MedplumClient } from '@medplum/core';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useProjectOrganizationStore } from '../store/projectOrganizationStore';
import {
  fetchProjectOrganizationSettings,
  getCurrentOrganisationName,
  getCurrentOrganizationCode,
  getCurrentOrganizationUrl,
  getCurrentProjectId,
  getCurrentProjectOrganization,
  getOrganizationUrlForProject,
  ProjectNotConfiguredError,
} from './projectOrganization';

function makeMedplum(overrides: Partial<MedplumClient> = {}): MedplumClient {
  return {
    getProject: vi.fn(),
    getProjectMembership: vi.fn(),
    readResource: vi.fn(),
    ...overrides,
  } as unknown as MedplumClient;
}

describe('ProjectNotConfiguredError', () => {
  test('includes project name in message when provided', () => {
    const err = new ProjectNotConfiguredError('proj-1', 'Handl Pilot');
    expect(err.message).toContain('Handl Pilot');
    expect(err.projectId).toBe('proj-1');
    expect(err.projectName).toBe('Handl Pilot');
    expect(err.name).toBe('ProjectNotConfiguredError');
    expect(err).toBeInstanceOf(Error);
  });

  test('falls back to project id in message when no name provided', () => {
    const err = new ProjectNotConfiguredError('proj-1');
    expect(err.message).toContain('proj-1');
    expect(err.projectName).toBeUndefined();
  });
});

describe('getCurrentProjectId', () => {
  test('returns undefined when medplum is null', () => {
    expect(getCurrentProjectId(null)).toBeUndefined();
    expect(getCurrentProjectId(undefined)).toBeUndefined();
  });

  test('returns id from getProject when available', () => {
    const medplum = makeMedplum({ getProject: vi.fn().mockReturnValue({ id: 'proj-abc' }) });
    expect(getCurrentProjectId(medplum)).toBe('proj-abc');
  });

  test('falls back to membership.project.id when getProject returns no id', () => {
    const medplum = makeMedplum({
      getProject: vi.fn().mockReturnValue({}),
      getProjectMembership: vi.fn().mockReturnValue({ project: { id: 'mem-proj-1' } }),
    });
    expect(getCurrentProjectId(medplum)).toBe('mem-proj-1');
  });

  test('falls back to membership.projectId when project.id is absent', () => {
    const medplum = makeMedplum({
      getProject: vi.fn().mockReturnValue({}),
      getProjectMembership: vi.fn().mockReturnValue({ projectId: 'mem-proj-2' }),
    });
    expect(getCurrentProjectId(medplum)).toBe('mem-proj-2');
  });
});

describe('store-dependent functions', () => {
  beforeEach(() => {
    useProjectOrganizationStore.getState().setOrganization('iprs-health', 'IPRS Health');
  });

  afterEach(() => {
    useProjectOrganizationStore.setState({ organizationCode: undefined, organizationName: undefined });
  });

  describe('getCurrentProjectOrganization', () => {
    test('returns config from store when populated', () => {
      const medplum = makeMedplum({ getProject: vi.fn().mockReturnValue({ id: 'proj-1' }) });
      const config = getCurrentProjectOrganization(medplum);
      expect(config.organizationCode).toBe('iprs-health');
      expect(config.organizationName).toBe('IPRS Health');
      expect(config.projectId).toBe('proj-1');
    });

    test('throws ProjectNotConfiguredError when store is empty', () => {
      useProjectOrganizationStore.setState({ organizationCode: undefined, organizationName: undefined });
      const medplum = makeMedplum({ getProject: vi.fn().mockReturnValue({ id: 'proj-1', name: 'My Project' }) });
      expect(() => getCurrentProjectOrganization(medplum)).toThrow(ProjectNotConfiguredError);
    });
  });

  describe('getCurrentOrganizationCode', () => {
    test('returns organization code from store', () => {
      expect(getCurrentOrganizationCode()).toBe('iprs-health');
    });
  });

  describe('getCurrentOrganisationName', () => {
    test('returns organization name from store', () => {
      expect(getCurrentOrganisationName()).toBe('IPRS Health');
    });
  });

  describe('getOrganizationUrlForProject', () => {
    test('builds correct URL from store code', () => {
      expect(getOrganizationUrlForProject()).toBe('http://fhir.chimera.health/identifier/iprs-health/organization');
    });
  });

  describe('getCurrentOrganizationUrl', () => {
    test('builds URL using project id from medplum', () => {
      const medplum = makeMedplum({ getProject: vi.fn().mockReturnValue({ id: 'proj-1' }) });
      expect(getCurrentOrganizationUrl(medplum)).toBe('http://fhir.chimera.health/identifier/iprs-health/organization');
    });
  });
});

describe('fetchProjectOrganizationSettings', () => {
  afterEach(() => {
    useProjectOrganizationStore.setState({ organizationCode: undefined, organizationName: undefined });
  });

  test('populates store from project settings', async () => {
    const medplum = makeMedplum({
      getProject: vi.fn().mockReturnValue({ id: 'proj-1' }),
      readResource: vi.fn().mockResolvedValue({
        resourceType: 'Project',
        id: 'proj-1',
        setting: [
          { name: 'organization-code', valueString: 'handl' },
          { name: 'organization-name', valueString: 'Handl Pilot' },
        ],
      }),
    });

    await fetchProjectOrganizationSettings(medplum);

    const { organizationCode, organizationName } = useProjectOrganizationStore.getState();
    expect(organizationCode).toBe('handl');
    expect(organizationName).toBe('Handl Pilot');
  });

  test('throws ProjectNotConfiguredError when project has no id', async () => {
    const medplum = makeMedplum({ getProject: vi.fn().mockReturnValue({}) });
    await expect(fetchProjectOrganizationSettings(medplum)).rejects.toBeInstanceOf(ProjectNotConfiguredError);
  });

  test('throws ProjectNotConfiguredError when settings are missing from project', async () => {
    const medplum = makeMedplum({
      getProject: vi.fn().mockReturnValue({ id: 'proj-1', name: 'Handl Pilot' }),
      readResource: vi.fn().mockResolvedValue({
        resourceType: 'Project',
        id: 'proj-1',
        name: 'Handl Pilot',
        setting: [],
      }),
    });

    await expect(fetchProjectOrganizationSettings(medplum)).rejects.toBeInstanceOf(ProjectNotConfiguredError);
  });

  test('throws ProjectNotConfiguredError when only one setting is present', async () => {
    const medplum = makeMedplum({
      getProject: vi.fn().mockReturnValue({ id: 'proj-1' }),
      readResource: vi.fn().mockResolvedValue({
        resourceType: 'Project',
        id: 'proj-1',
        setting: [{ name: 'organization-code', valueString: 'handl' }],
      }),
    });

    await expect(fetchProjectOrganizationSettings(medplum)).rejects.toBeInstanceOf(ProjectNotConfiguredError);
  });
});
