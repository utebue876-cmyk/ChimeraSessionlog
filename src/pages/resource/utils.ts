import type { ResourceType } from '@medplum/fhirtypes';
import { UK_CORE_PATIENT_URL } from '../../config/chimera-urls';

export const RESOURCE_PROFILE_URLS: Partial<Record<ResourceType, string>> = {
  Patient: UK_CORE_PATIENT_URL,
  ServiceRequest: 'http://medplum.com/StructureDefinition/medplum-provider-lab-procedure-servicerequest',
  Device: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-implantable-device',
};
