import { WithId } from '@medplum/core';
import { EpisodeOfCare, Organization } from '@medplum/fhirtypes';
import { EOC_CASE_STATE_URL } from '../config/chimera-urls';
import { CHIMERA_MSK, MH, MSK } from '../config/constants';

export const getCaseStatus = (episode: EpisodeOfCare) => {
  return episode?.extension?.find((ext) => ext.url === EOC_CASE_STATE_URL)?.valueCoding?.display || 'N/A';
};

export const getCaseIdPrefix = (organization: WithId<Organization> | undefined) => {
  const caseIdPrefix = organization?.name === CHIMERA_MSK ? MSK : MH;
  return caseIdPrefix;
};
