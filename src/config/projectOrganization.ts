import type { MedplumClient } from '@medplum/core';
import { useProjectOrganizationStore } from '../store/projectOrganizationStore';

export class ProjectNotConfiguredError extends Error {
  readonly projectId: string;
  readonly projectName: string | undefined;

  constructor(projectId: string, projectName?: string) {
    super(
      `Project "${projectName ?? projectId}" organization settings are not configured. Contact your administrator.`
    );
    this.name = 'ProjectNotConfiguredError';
    this.projectId = projectId;
    this.projectName = projectName;
  }
}

export interface ProjectOrganizationConfig {
  projectId: string;
  organizationCode: string;
  organizationName: string;
}

export function getCurrentProjectId(medplum?: MedplumClient | null): string | undefined {
  if (!medplum) {
    return undefined;
  }

  const project = medplum.getProject();
  if (project?.id) {
    return project.id;
  }

  const membership = medplum.getProjectMembership() as { project?: { id?: string }; projectId?: string } | undefined;

  return membership?.project?.id ?? membership?.projectId;
}

export function getCurrentProjectOrganization(medplum?: MedplumClient | null): ProjectOrganizationConfig {
  const { organizationCode, organizationName } = useProjectOrganizationStore.getState();
  if (!organizationCode || !organizationName) {
    const projectName = medplum?.getProject()?.name;
    throw new ProjectNotConfiguredError(getCurrentProjectId(medplum) ?? 'unknown', projectName);
  }
  return {
    projectId: getCurrentProjectId(medplum) ?? 'unknown',
    organizationCode,
    organizationName,
  };
}

export function getCurrentOrganizationCode(_medplum?: MedplumClient | null): string {
  return useProjectOrganizationStore.getState().organizationCode!;
}

export function getCurrentOrganisationName(_medplum?: MedplumClient | null): string {
  return useProjectOrganizationStore.getState().organizationName!;
}

export function getOrganizationUrlForProject(_projectId?: string | null): string {
  const code = useProjectOrganizationStore.getState().organizationCode!;
  return `http://fhir.chimera.health/identifier/${code}/organization`;
}

export function getCurrentOrganizationUrl(medplum?: MedplumClient | null): string {
  return getOrganizationUrlForProject(getCurrentProjectId(medplum));
}

export async function fetchProjectOrganizationSettings(medplum: MedplumClient): Promise<void> {
  const project = medplum.getProject();
  if (!project?.id) {
    throw new ProjectNotConfiguredError('unknown');
  }
  const fullProject = await medplum.readResource('Project', project.id);
  const code = fullProject.setting?.find((s) => s.name === 'organization-code')?.valueString;
  const name = fullProject.setting?.find((s) => s.name === 'organization-name')?.valueString;
  if (!code || !name) {
    throw new ProjectNotConfiguredError(project.id, fullProject.name);
  }
  useProjectOrganizationStore.getState().setOrganization(code, name);
}
