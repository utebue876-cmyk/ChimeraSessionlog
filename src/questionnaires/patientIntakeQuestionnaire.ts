import type { Questionnaire } from '@medplum/fhirtypes';
import { MH_SERVICE_VALUESET_URL, PATIENT_INTAKE_QUESTIONNAIRE_URL } from '../config/chimera-urls';

export function getPatientIntakeQuestionnaire(organizationName: string): Questionnaire {
  return {
    resourceType: 'Questionnaire',
    status: 'active',
    title: 'Patient Intake Questionnaire',
    url: PATIENT_INTAKE_QUESTIONNAIRE_URL,
    name: 'patient-intake',
    item: [
      {
        linkId: 'patient-demographics',
        text: 'Patient Demographics',
        type: 'group',
        item: [
          {
            linkId: 'first-name',
            text: 'First Name',
            type: 'string',
            required: true,
          },
          {
            linkId: 'last-name',
            text: 'Last Name',
            type: 'string',
            required: true,
          },
          {
            linkId: 'dob',
            text: 'Date of Birth',
            type: 'date',
            required: true,
          },
          {
            linkId: 'gender',
            text: 'Gender',
            type: 'choice',
            answerValueSet: 'http://hl7.org/fhir/ValueSet/administrative-gender',
            required: true,
          },
        ],
      },
      {
        linkId: 'home-contact-details',
        text: 'Home Address & Contact Details',
        type: 'group',
        item: [
          {
            linkId: 'home-address-line1',
            text: 'Address Line 1',
            type: 'string',
            required: true,
          },
          {
            linkId: 'home-address-line2',
            text: 'Address Line 2',
            type: 'string',
          },
          {
            linkId: 'home-city',
            text: 'Town/City',
            type: 'string',
            required: true,
          },
          {
            linkId: 'home-county',
            text: 'County',
            type: 'string',
          },
          {
            linkId: 'home-postcode',
            text: 'Postcode',
            type: 'string',
            required: true,
          },
          {
            linkId: 'home-phone',
            text: 'Home Phone Number',
            type: 'string',
            required: true,
          },
          {
            linkId: 'home-email',
            text: 'Home Email',
            type: 'string',
          },
        ],
      },
      {
        linkId: 'work-contact-details',
        text: 'Work Address & Contact Details',
        type: 'group',
        item: [
          {
            linkId: 'work-address-line1',
            text: 'Address Line 1',
            type: 'string',
          },
          {
            linkId: 'work-address-line2',
            text: 'Address Line 2',
            type: 'string',
          },
          {
            linkId: 'work-city',
            text: 'Town/City',
            type: 'string',
          },
          {
            linkId: 'work-county',
            text: 'County',
            type: 'string',
          },
          {
            linkId: 'work-postcode',
            text: 'Postcode',
            type: 'string',
          },
          {
            linkId: 'work-phone',
            text: 'Work Phone Number',
            type: 'string',
          },
          {
            linkId: 'work-email',
            text: 'Work Email',
            type: 'string',
          },
        ],
      },
      {
        linkId: 'coverage-information',
        text: 'Coverage Information',
        type: 'group',
        repeats: false,
        item: [
          {
            linkId: 'healthcare-provider',
            text: 'Service Line',
            type: 'reference',
            required: true,
            extension: [
              {
                id: 'reference-healthcare',
                url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-referenceResource',
                valueCodeableConcept: {
                  coding: [
                    {
                      system: 'http://hl7.org/fhir/fhir-types',
                      display: 'Organizations',
                      code: 'Organization',
                    },
                  ],
                },
              },
              {
                url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-referenceFilter',
                valueString: `partof:Organization.name=${organizationName}`,
              },
            ],
          },
          {
            linkId: 'insurance-provider',
            text: 'Client/Funder',
            type: 'reference',
            required: true,
            extension: [
              {
                id: 'reference-insurance',
                url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-referenceResource',
                valueCodeableConcept: {
                  coding: [
                    {
                      system: 'http://hl7.org/fhir/fhir-types',
                      display: 'Organization',
                      code: 'Organization',
                    },
                  ],
                },
              },
              {
                url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-referenceFilter',
                valueString: 'type=http://terminology.hl7.org/CodeSystem/organization-type|pay',
              },
            ],
          },
          {
            linkId: 'subscriber-id',
            text: 'Policy/Membership Number',
            type: 'string',
          },
          {
            linkId: 'optima-employer',
            text: 'Employer',
            type: 'reference',
          },
          {
            linkId: 'optima-location',
            text: 'Location',
            type: 'string',
          },
          {
            linkId: 'optima-facility',
            text: 'Facility',
            type: 'string',
          },
        ],
      },
      {
        linkId: 'case-creation',
        text: 'Intake Information',
        type: 'group',
        item: [
          {
            linkId: 'referral-date',
            text: 'Referral Date/Intake Date',
            type: 'date',
            required: true,
          },
          {
            linkId: 'service-type',
            text: 'Referral Type',
            type: 'choice',
            required: true,
            answerValueSet: MH_SERVICE_VALUESET_URL,
          },
        ],
      },
      {
        linkId: 'consent-for-treatment',
        text: 'Consent for Treatment',
        type: 'group',
        item: [
          {
            linkId: 'consent-for-treatment-signature',
            text: 'Consent to assessment and data processing',
            type: 'boolean',
          },
          {
            linkId: 'consent-for-treatment-date',
            text: 'Consent Date',
            type: 'date',
            required: true,
            enableWhen: [{ question: 'consent-for-treatment-signature', operator: '=', answerBoolean: true }],
          },
        ],
      },
    ],
  };
}
