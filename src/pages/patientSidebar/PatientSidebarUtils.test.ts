import { HTTP_HL7_ORG } from '@medplum/core';
import type { Patient } from '@medplum/fhirtypes';
import { describe, expect, test } from 'vitest';
import {
  formatPatientGenderDisplay,
  formatPatientRaceEthnicityDisplay,
  getPreferredLanguage,
} from './PatientSidebarUtils';

describe('PatientSidebar.utils', () => {
  test('formats gender display with gender identity and birth sex', () => {
    const patient: Patient = {
      resourceType: 'Patient',
      extension: [
        {
          url: `${HTTP_HL7_ORG}/fhir/us/core/StructureDefinition/us-core-genderIdentity`,
          valueCodeableConcept: { coding: [{ display: 'Non-binary' }] },
        },
        {
          url: `${HTTP_HL7_ORG}/fhir/us/core/StructureDefinition/us-core-birthsex`,
          valueCode: 'F',
        },
      ],
      gender: 'male',
    };

    expect(formatPatientGenderDisplay(patient)).toBe('Male · Non-binary · Born as F');
  });

  test('formats race and ethnicity display', () => {
    const patient: Patient = {
      resourceType: 'Patient',
      extension: [
        {
          url: `${HTTP_HL7_ORG}/fhir/us/core/StructureDefinition/us-core-race`,
          extension: [{ url: 'ombCategory', valueCoding: { display: 'White' } }],
        },
        {
          url: `${HTTP_HL7_ORG}/fhir/us/core/StructureDefinition/us-core-ethnicity`,
          extension: [{ url: 'ombCategory', valueCoding: { display: 'Not Hispanic or Latino' } }],
        },
      ],
    };

    expect(formatPatientRaceEthnicityDisplay(patient)).toBe('White · Not Hispanic or Latino');
  });

  test('returns preferred communication language when available', () => {
    const patient: Patient = {
      resourceType: 'Patient',
      communication: [
        { preferred: false, language: { coding: [{ display: 'Spanish' }] } },
        { preferred: true, language: { coding: [{ display: 'English' }] } },
      ],
    };

    expect(getPreferredLanguage(patient)).toBe('English');
  });
});
