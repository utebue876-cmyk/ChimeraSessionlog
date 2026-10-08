import type { Questionnaire } from '@medplum/fhirtypes';
import { MH_AWG_INTAKE_ASSESSMENT_URL } from '../config/chimera-urls';

export const selfReferralQuestionnaire: Questionnaire = {
  resourceType: 'Questionnaire',
  status: 'active',
  //   title: 'Mental Health Screening Assessment – Anglian Water Self-Referral',
  url: MH_AWG_INTAKE_ASSESSMENT_URL,
  name: 'anglian-water-self-referral',
  item: [
    // ─── Group 1: Clinical screening questions ───────────────────────────────
    {
      linkId: 'clinical-questions',
      text: 'Anglian Water Self-Referral',
      type: 'group',
      item: [
        {
          linkId: 'risk-of-harm',
          text: 'Do you currently feel that your mental health symptoms cause an imminent risk of harm to yourself or to other people?',
          type: 'boolean',
          required: true,
        },
        {
          linkId: 'protective-factors',
          text: 'What protective factors do you have in your life to help you manage how you feel and keep yourself safe?',
          type: 'text',
          required: false,
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-displayCategory',
              valueCodeableConcept: {
                text: 'e.g. relationships, family, friends, GP, employment, hobbies/interests, other coping strategies',
              },
            },
          ],
        },
        {
          linkId: 'triggering-factors',
          text: 'Which factor(s) do you feel have triggered the challenges with your Mental Health?',
          type: 'choice',
          required: false,
          repeats: true,
          answerOption: [
            { valueCoding: { code: 'financial', display: 'Financial' } },
            { valueCoding: { code: 'housing', display: 'Housing' } },
            { valueCoding: { code: 'elderly-relatives', display: 'Elderly relatives' } },
            { valueCoding: { code: 'other', display: 'Other' } },
            { valueCoding: { code: 'work', display: 'Work' } },
            { valueCoding: { code: 'relationship', display: 'Relationship' } },
            { valueCoding: { code: 'bereavement', display: 'Bereavement' } },
            { valueCoding: { code: 'career', display: 'Career' } },
            { valueCoding: { code: 'childcare', display: 'Childcare' } },
            { valueCoding: { code: 'general-health-wellbeing', display: 'General health and wellbeing' } },
          ],
        },
        {
          linkId: 'substance-use',
          text: 'Do you use alcohol, tobacco, or other substances to cope with your Mental Health?',
          type: 'boolean',
          required: false,
        },
        {
          linkId: 'past-psychological-problems',
          text: 'Have you suffered from any other psychological problems in the past?',
          type: 'boolean',
          required: false,
        },
        {
          linkId: 'past-therapy',
          text: 'Have you had psychological therapy in the past?',
          type: 'boolean',
          required: false,
        },
        {
          linkId: 'mental-health-medication',
          text: 'Are you on medication for a mental health problem?',
          type: 'boolean',
          required: false,
        },
        {
          linkId: 'main-problem',
          text: 'Describe the main problem you want to address through therapy',
          type: 'text',
          required: false,
        },
        {
          linkId: 'problem-start',
          text: 'When did this problem start?',
          type: 'text',
          required: false,
        },
        {
          linkId: 'problem-aspects-symptoms',
          text: 'What aspects of the problem bother you the most and what are the main symptoms of this?',
          type: 'text',
          required: false,
        },
      ],
    },

    // ─── Group 2: Personal details ────────────────────────────────────────────
    {
      linkId: 'personal-details',
      text: 'Personal Details',
      type: 'group',
      item: [
        {
          linkId: 'first-name',
          text: 'First Name',
          type: 'string',
          required: true,
        },
        {
          linkId: 'surname',
          text: 'Surname',
          type: 'string',
          required: true,
        },
        {
          linkId: 'address-line1',
          text: 'First Line of Address',
          type: 'string',
          required: true,
        },
        {
          linkId: 'address-line2',
          text: 'Second Line of Address',
          type: 'string',
          required: false,
        },
        {
          linkId: 'town',
          text: 'Town',
          type: 'string',
          required: true,
        },
        {
          linkId: 'county',
          text: 'County',
          type: 'string',
          required: false,
        },
        {
          linkId: 'postcode',
          text: 'Postcode',
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
          required: true,
          answerOption: [
            { valueCoding: { code: 'male', display: 'Male' } },
            { valueCoding: { code: 'female', display: 'Female' } },
            { valueCoding: { code: 'other', display: 'Other' } },
          ],
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl',
              valueCodeableConcept: {
                coding: [
                  {
                    system: 'http://hl7.org/fhir/questionnaire-item-control',
                    code: 'drop-down',
                  },
                ],
              },
            },
            {
              url: 'http://hl7.org/fhir/StructureDefinition/entryFormat',
              valueString: 'Select gender',
            },
          ],
        },
        {
          linkId: 'preferred-contact-number',
          text: 'Preferred Contact No.',
          type: 'string',
          required: true,
        },
        {
          linkId: 'email',
          text: 'Email Address',
          type: 'string',
          required: false,
        },
      ],
    },

    // ─── Group 3: Payment / billing address ───────────────────────────────────
    {
      linkId: 'payment-details',
      text: 'Payment Details',
      type: 'group',
      item: [
        {
          linkId: 'billing-address-line1',
          text: 'Billing Address Line 1',
          type: 'string',
          required: true,
        },
        {
          linkId: 'billing-address-line2',
          text: 'Billing Address Line 2',
          type: 'string',
          required: false,
        },
        {
          linkId: 'billing-town',
          text: 'Billing Town',
          type: 'string',
          required: true,
        },
        {
          linkId: 'billing-county',
          text: 'Billing County',
          type: 'string',
          required: false,
        },
        {
          linkId: 'billing-postcode',
          text: 'Billing Postcode',
          type: 'string',
          required: true,
        },
      ],
    },

    // ─── Group 4: Appointment ─────────────────────────────────────────────────
    {
      linkId: 'appointment-details',
      text: 'Appointment',
      type: 'group',
      item: [
        {
          linkId: 'appointment-datetime',
          text: 'Selected Appointment Date and Time',
          type: 'dateTime',
          required: false,
        },
      ],
    },

    // ─── Group 5: Consent ─────────────────────────────────────────────────────
    {
      linkId: 'consent',
      text: 'Consent',
      type: 'group',
      item: [
        {
          linkId: 'consent-data-processing',
          text: 'Do you agree that IPRS Health can process and store your personal data in order to manage your referral?',
          type: 'boolean',
          required: true,
        },
        {
          linkId: 'consent-share-alliance',
          text: 'Do you agree that IPRS Health can share personal and, where appropriate, medical information with Alliance Health Group for the purpose of progressing your referral?',
          type: 'boolean',
          required: true,
        },
        {
          linkId: 'consent-share-anglian-water',
          text: 'Do you agree that IPRS Health can share personal and, where appropriate, medical information with Anglian Water for the purpose of progressing your referral?',
          type: 'boolean',
          required: true,
        },
      ],
    },
  ],
};
