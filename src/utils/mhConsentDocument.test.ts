import type { Questionnaire, QuestionnaireResponse, Task } from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useProjectOrganizationStore } from '../store/projectOrganizationStore';
import { createMhConsentDocumentIfApplicable, isMhConsentForm } from './mhConsentDocument';

describe('isMhConsentForm', () => {
  test('matches on the well-known name', () => {
    expect(isMhConsentForm({ resourceType: 'Questionnaire', status: 'active', name: 'MH Consent Form' })).toBe(true);
  });

  test('matches case-insensitively and ignores surrounding whitespace', () => {
    expect(isMhConsentForm({ resourceType: 'Questionnaire', status: 'active', name: '  Mh Consent Form  ' })).toBe(
      true
    );
  });

  test('matches on the well-known title', () => {
    expect(isMhConsentForm({ resourceType: 'Questionnaire', status: 'active', title: 'MH Consent Form' })).toBe(true);
  });

  test('matches on the well-known identifier value', () => {
    expect(
      isMhConsentForm({
        resourceType: 'Questionnaire',
        status: 'active',
        name: 'Some other name',
        identifier: [{ value: 'mh-consent' }],
      })
    ).toBe(true);
  });

  test('does not match unrelated questionnaires', () => {
    expect(isMhConsentForm({ resourceType: 'Questionnaire', status: 'active', name: 'Patient Intake Form' })).toBe(
      false
    );
  });
});

describe('createMhConsentDocumentIfApplicable', () => {
  beforeEach(() => {
    useProjectOrganizationStore.getState().setOrganization('iprs-health', 'IPRS Health');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false } as Response));
  });

  const mhConsentQuestionnaire: Questionnaire = {
    resourceType: 'Questionnaire',
    status: 'active',
    name: 'MH Consent Form',
    item: [{ linkId: 'q1', text: 'Do you consent to treatment?', type: 'boolean' }],
  };

  const otherQuestionnaire: Questionnaire = {
    resourceType: 'Questionnaire',
    status: 'active',
    name: 'Patient Intake Form',
  };

  function buildTask(overrides?: Partial<Task>): Task {
    return {
      resourceType: 'Task',
      status: 'completed',
      intent: 'order',
      for: { reference: 'Patient/patient-1', display: 'Jamie Doe' },
      input: [{ type: { text: 'questionnaire' }, valueReference: { reference: 'Questionnaire/q-1' } }],
      output: [
        {
          type: { text: 'QuestionnaireResponse' },
          valueReference: { reference: 'QuestionnaireResponse/qr-1' },
        },
      ],
      ...overrides,
    };
  }

  test('returns false when the task has no questionnaire reference', async () => {
    const medplum = new MockClient();
    const created = await createMhConsentDocumentIfApplicable(medplum, {
      resourceType: 'Task',
      status: 'completed',
      intent: 'order',
    });

    expect(created).toBe(false);
  });

  test('returns false when the referenced questionnaire is not the MH consent form', async () => {
    const medplum = new MockClient();
    vi.spyOn(medplum, 'readReference').mockImplementation((async (ref: any) => {
      if (ref.reference === 'Questionnaire/q-1') return otherQuestionnaire;
      throw new Error(`Unexpected reference: ${ref.reference}`);
    }) as any);

    const created = await createMhConsentDocumentIfApplicable(medplum, buildTask());

    expect(created).toBe(false);
  });

  test('creates a DocumentReference from the consent form response', async () => {
    const medplum = new MockClient();
    const questionnaireResponse: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
      authored: '2026-01-15T10:30:00.000Z',
      subject: { reference: 'Patient/patient-1', display: 'Jamie Doe' },
      item: [{ linkId: 'q1', text: 'Do you consent to treatment?', answer: [{ valueBoolean: true }] }],
    };

    vi.spyOn(medplum, 'readReference').mockImplementation((async (ref: any) => {
      if (ref.reference === 'Questionnaire/q-1') return mhConsentQuestionnaire;
      if (ref.reference === 'QuestionnaireResponse/qr-1') return questionnaireResponse;
      throw new Error(`Unexpected reference: ${ref.reference}`);
    }) as any);
    const createAttachmentSpy = vi
      .spyOn(medplum, 'createAttachment')
      .mockResolvedValue({ url: 'Binary/attachment-1', contentType: 'application/pdf' });
    const createResourceSpy = vi.spyOn(medplum, 'createResource');

    const created = await createMhConsentDocumentIfApplicable(medplum, buildTask());

    expect(created).toBe(true);
    expect(createAttachmentSpy).toHaveBeenCalledWith(expect.objectContaining({ contentType: 'application/pdf' }));
    expect(createResourceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'DocumentReference',
        status: 'current',
        description: 'MH Consent Form',
        subject: { reference: 'Patient/patient-1', display: 'Jamie Doe' },
        content: [{ attachment: { url: 'Binary/attachment-1', contentType: 'application/pdf' } }],
      })
    );
  });

  test('returns false when the task has no questionnaire response reference', async () => {
    const medplum = new MockClient();
    vi.spyOn(medplum, 'readReference').mockImplementation((async (ref: any) => {
      if (ref.reference === 'Questionnaire/q-1') return mhConsentQuestionnaire;
      throw new Error(`Unexpected reference: ${ref.reference}`);
    }) as any);

    const created = await createMhConsentDocumentIfApplicable(medplum, buildTask({ output: [] }));

    expect(created).toBe(false);
  });
});
