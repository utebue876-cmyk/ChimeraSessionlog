import type { PatientSidebarSectionConfig } from './PatientSidebarTypes';
import {
  DemographicsSectionComponent,
  EpisodesOfCareSectionComponent,
  PatientProblemsSectionComponent,
} from './sidebarSectionComponents';

/** Demographics section — no FHIR searches, renders patient info items directly. */
export const DemographicsSection: PatientSidebarSectionConfig = {
  key: 'demographics',
  title: 'Demographics',
  component: DemographicsSectionComponent,
};

/** Episodes of Care section — searches for EpisodeOfCare resources. */
export const EpisodesOfCareSection: PatientSidebarSectionConfig = {
  key: 'episodesOfCare',
  title: 'Case(s)',
  searches: [{ key: 'episodesOfCare', resourceType: 'EpisodeOfCare', patientParam: 'patient' }],
  component: EpisodesOfCareSectionComponent,
};

/** Condition List section — searches for Condition resources. */
export const PatientProblemsSection: PatientSidebarSectionConfig = {
  key: 'problemList',
  title: 'Conditions',
  searches: [{ key: 'conditions', resourceType: 'Condition', patientParam: 'patient' }],
  component: PatientProblemsSectionComponent,
};

export function getDefaultSections(): PatientSidebarSectionConfig[] {
  return [DemographicsSection, EpisodesOfCareSection, PatientProblemsSection];
}
