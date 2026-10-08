import { createReference, MedplumClient } from '@medplum/core';
import { Account, Coverage, EpisodeOfCare, Organization, Patient, Reference } from '@medplum/fhirtypes';
import {
  ACCOUNT_TYPE_CODE_SYSTEM_URL,
  INTAKE_SUBMISSION_IDENTIFIER_URL,
  PATIENT_IDENTIFIER_URL,
} from '../config/chimera-urls';
import { MH, OPTIMA_HEALTH_NAME } from '../config/constants';

const ORGANIZATION_TYPE_PAY_CODING = { system: 'http://terminology.hl7.org/CodeSystem/organization-type', code: 'pay' };

export interface CreateAccountParams {
  patient: Patient;
  submissionKey: string;
  coverage?: Coverage;
  episodeOfCare?: EpisodeOfCare;
  insuranceProvider?: Reference<Organization>;
  managingOrganization?: Organization;
  healthcareProvider?: Reference<Organization>;
}

// PMI (private medical insurance) routes carry a residual-balance guarantor; block/NHS funders do not.
async function isPmiRoute(medplum: MedplumClient, insuranceProvider?: Reference<Organization>): Promise<boolean> {
  if (!insuranceProvider?.reference) {
    return false;
  }
  try {
    const organization = await medplum.readReference(insuranceProvider);
    return (
      organization.type?.some((type) =>
        type.coding?.some(
          (coding) =>
            coding.system === ORGANIZATION_TYPE_PAY_CODING.system && coding.code === ORGANIZATION_TYPE_PAY_CODING.code
        )
      ) ?? false
    );
  } catch {
    return false;
  }
}

// Looks up the concept's display text from the account-type CodeSystem, falling back to the code itself.
async function getAccountTypeDisplay(medplum: MedplumClient, code: string): Promise<string> {
  try {
    const codeSystem = await medplum.searchOne('CodeSystem', `url=${ACCOUNT_TYPE_CODE_SYSTEM_URL}`);
    return codeSystem?.concept?.find((concept) => concept.code === code)?.display ?? code;
  } catch {
    return code;
  }
}

export const createAccount = async (medplum: MedplumClient, params: CreateAccountParams): Promise<Account> => {
  const {
    patient,
    submissionKey,
    coverage,
    episodeOfCare,
    insuranceProvider,
    managingOrganization,
    healthcareProvider,
  } = params;

  const mrn =
    patient.identifier?.find((identifier) => identifier.system === PATIENT_IDENTIFIER_URL)?.value ?? patient.id;
  const funderName = insuranceProvider?.display;
  const isBlockContract = funderName === OPTIMA_HEALTH_NAME;
  const accountTypeCode = isBlockContract ? 'block-contract' : 'fee-for-service';
  const accountTypeDisplay = await getAccountTypeDisplay(medplum, accountTypeCode);
  const guarantorRequired = await isPmiRoute(medplum, insuranceProvider);

  const account: Account = {
    resourceType: 'Account',
    identifier: [{ system: INTAKE_SUBMISSION_IDENTIFIER_URL, value: submissionKey }],
    status: 'active',
    type: {
      coding: [
        {
          system: ACCOUNT_TYPE_CODE_SYSTEM_URL,
          code: accountTypeCode,
          display: accountTypeDisplay,
        },
      ],
    },
    name: `${mrn} \u00b7 ${funderName ?? 'Unknown Funder'} ${MH} ${accountTypeDisplay}`,
    subject: [createReference(patient)],
    ...(managingOrganization ? { owner: createReference(managingOrganization) } : {}),
    ...(episodeOfCare?.period?.start ? { servicePeriod: { start: episodeOfCare.period.start } } : {}),
    ...(coverage ? { coverage: [{ coverage: createReference(coverage), priority: 1 }] } : {}),
    ...(guarantorRequired ? { guarantor: [{ party: createReference(patient) }] } : {}),
    ...(healthcareProvider ? { owner: healthcareProvider } : {}),
  };

  return medplum.upsertResource(account, `identifier=${INTAKE_SUBMISSION_IDENTIFIER_URL}|${submissionKey}`);
};
