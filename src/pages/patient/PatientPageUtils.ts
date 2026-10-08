import type { Patient, ProjectMembership } from '@medplum/fhirtypes';
import { hasDoseSpotIdentifier } from '../../components/common/utils';

export function patientPathPrefix(patientId: string): string {
  return `/Patient/${patientId}`;
}

export function prependPatientPath(patient: Patient | undefined, path: string): string {
  if (patient?.id) {
    return `${patientPathPrefix(patient.id)}${!path.startsWith('/') ? '/' : ''}${path}`;
  }

  return path;
}

export function formatPatientPageTabUrl(patientId: string, tab: PatientPageTabInfo): string {
  return `${patientPathPrefix(patientId)}/${tab.url.replace('%patient.id', patientId)}`;
}

export type PatientPageTabInfo = {
  id: string;
  url: string;
  label: string;
};

export function getPatientPageTabOrThrow(tabId: string): PatientPageTabInfo {
  const result = PatientPageTabs.find((tab) => tab.id === tabId);

  if (!result) {
    throw new Error(`Could not find patient page tab with id ${tabId}`);
  }
  return result;
}

/**
 * Returns the patient page tabs filtered based on user permissions.
 * Currently filters out the DoseSpot tab if the user doesn't have DoseSpot access.
 * @param membership - The current user's project membership.
 * @returns Filtered array of patient page tabs.
 */
export function getPatientPageTabs(membership: ProjectMembership | undefined): PatientPageTabInfo[] {
  const hasDoseSpot = hasDoseSpotIdentifier(membership);
  return PatientPageTabs.filter((tab) => tab.id !== 'dosespot' || hasDoseSpot);
}

export const PatientPageTabs: PatientPageTabInfo[] = [
  { id: 'case', url: '', label: 'Case' },
  {
    id: 'encounter',
    url: 'encounters',
    label: 'Appointments',
  },
  {
    id: 'treatment',
    url: 'treatment',
    label: 'Treatment Pathway',
  },
  {
    id: 'tasks',
    url: 'Task',
    label: 'Tasks',
  },
  {
    id: 'documentreference',
    url: 'documents',
    label: 'Documents',
  },
  // { id: 'message', url: 'Communication', label: 'Messages' },
  {
    id: 'account',
    url: 'account',
    label: 'Account',
  },
  { id: 'export', url: 'export', label: 'Export' },
  { id: 'timeline', url: 'timeline', label: 'Timeline' },
];
