import { useProjectOrganizationStore } from '../store/projectOrganizationStore';

const BASE_URL = 'http://fhir.chimera.health';

export const MH_SERVICE_VALUESET_VITALITY_URL = `${BASE_URL}/ValueSet/mh-service-vitality`;
export const MH_SERVICE_VALUESET_AVIVA_URL = `${BASE_URL}/ValueSet/mh-service-aviva`;
export const MH_SERVICE_VALUESET_OPTIMA_URL = `${BASE_URL}/ValueSet/mh-service-optima`;
export const MH_TREATMENT_PATHWAY_CODE_SYSTEM_URL = `${BASE_URL}/CodeSystem/mh-treatment-pathway`;
export const MH_DIAGNOSIS_VALUESET_URL = `${BASE_URL}/ValueSet/mh-diagnosis`;
export const MH_DIAGNOSIS_CODE_SYSTEM_URL = `${BASE_URL}/CodeSystem/mh-diagnosis`;
export const MH_CLOSURE_REASON_VALUESET_URL = `${BASE_URL}/ValueSet/mh-closure-reason`;
export const OPTIMA_EMPLOYER_EXTENSION_URL = `${BASE_URL}/StructureDefinition/optima-employer`;
export const MH_SERVICE_VALUESET_URL = `${BASE_URL}/ValueSet/mh-service`;
export const MH_SERVICE_CODE_SYSTEM_URL = `${BASE_URL}/CodeSystem/mh-service`;
export const MH_CASE_CONSENT_SIGNED_URL = `${BASE_URL}/StructureDefinition/mh-case-consent-signed`;
export const MH_CASE_CONSENT_DATE_URL = `${BASE_URL}/StructureDefinition/mh-case-consent-date`;
export const MH_AWG_INTAKE_ASSESSMENT_URL = `${BASE_URL}/Questionnaire/mh-awg-intake-assessment`;
export const CASE_SERVICE_IDENTIFIER_URL = `${BASE_URL}/identifier/case-service`;
export const CASE_TASK_IDENTIFIER_URL = `${BASE_URL}/identifier/case-task`;

export const CASE_NOTE_URL = `${BASE_URL}/StructureDefinition/case-note`;
export const CASE_STATE_VALUESET_URL = `${BASE_URL}/ValueSet/case-state`;
export const CASE_STATE_CODE_SYSTEM_URL = `${BASE_URL}/CodeSystem/case-state`;
export const CASE_NUMBER_URL = `${BASE_URL}/identifier/case-number`;

export const EOC_CASE_STATE_URL = `${BASE_URL}/StructureDefinition/episodeofcare-case-state`;
export const TASK_CODES_CODE_SYSTEM_URL = `${BASE_URL}/CodeSystem/task-codes`;
export const PATIENT_INTAKE_QUESTIONNAIRE_URL = `${BASE_URL}/Questionnaire/patient-intake`;
export const PATIENT_IDENTIFIER_URL = `${BASE_URL}/identifier/iprs-health/mrn`;
export const INTAKE_SUBMISSION_IDENTIFIER_URL = `${BASE_URL}/identifier/iprs-health/intake-submission`;
export const ACCOUNT_TYPE_VALUESET_URL = `${BASE_URL}/ValueSet/account-type`;
export const ACCOUNT_TYPE_CODE_SYSTEM_URL = `${BASE_URL}/CodeSystem/account-type`;
export const COVERAGE_INSURANCE_PLAN_EXTENSION_URL = `${BASE_URL}/StructureDefinition/coverage-insurance-plan`;
export const COVERAGE_TYPE_CODE_SYSTEM_URL = `${BASE_URL}/CodeSystem/coverage-type`;
export const EOC_ENTITLEMENT_USAGE_EXTENSION_URL = `${BASE_URL}/StructureDefinition/episodeofcare-entitlement-usage`;

export const UK_CORE_PATIENT_URL = 'https://fhir.hl7.org.uk/StructureDefinition/UKCore-Patient';

export function getOrganizationUrlForProject(_projectId?: string | null): string {
  const { organizationCode } = useProjectOrganizationStore.getState();
  return `${BASE_URL}/identifier/${organizationCode ?? 'iprs-health'}/organization`;
}
