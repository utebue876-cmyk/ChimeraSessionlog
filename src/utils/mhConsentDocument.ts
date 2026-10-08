import type { MedplumClient } from '@medplum/core';
import {
  createReference,
  formatCodeableConcept,
  formatHumanName,
  getQuestionnaireAnswers,
  isResource,
} from '@medplum/core';
import type {
  Device,
  DocumentReference,
  Encounter,
  EpisodeOfCare,
  Group,
  Patient,
  Practitioner,
  Questionnaire,
  QuestionnaireItem,
  QuestionnaireResponse,
  QuestionnaireResponseItemAnswer,
  Reference,
  Task,
} from '@medplum/fhirtypes';
import { jsPDF } from 'jspdf';
import { getCurrentOrganisationName } from '../config/projectOrganization';

const MH_CONSENT_FORM_NAME = 'mh consent form';
const MH_CONSENT_IDENTIFIER = 'mh-consent';

interface QuestionnairePdfRow {
  question: string;
  answer: string;
}

type DocumentReferenceSubject = Reference<Patient | Practitioner | Device | Group>;

interface MhConsentPdfHeader {
  readonly patientName?: string;
  readonly practitionerName?: string;
  readonly consentDate: string;
}

export function isMhConsentForm(questionnaire: Questionnaire): boolean {
  const normalizedName = normalizeText(questionnaire.name);
  const normalizedTitle = normalizeText(questionnaire.title);
  const hasMatchingIdentifier =
    questionnaire.identifier?.some((identifier) => normalizeText(identifier.value) === MH_CONSENT_IDENTIFIER) ?? false;

  return normalizedName === MH_CONSENT_FORM_NAME || normalizedTitle === MH_CONSENT_FORM_NAME || hasMatchingIdentifier;
}

export async function buildMhConsentPdfBlob(
  questionnaire: Questionnaire,
  response: QuestionnaireResponse,
  header: MhConsentPdfHeader,
  organizationName: string
): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 40;
  const headerTop = 24;
  const logoWidth = 28;
  const logoHeight = 28;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const answers = getQuestionnaireAnswers(response);
  const rows = collectQuestionAnswerRows(questionnaire.item, answers);
  const logoDataUrl = await loadLogoDataUrl();

  let y = 88;

  const renderHeader = (): void => {
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', margin, headerTop, logoWidth, logoHeight);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(organizationName, margin + logoWidth + 12, headerTop + 19);

    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.75);
    doc.line(margin, 66, pageWidth - margin, 66);
  };

  const ensurePageSpace = (requiredHeight: number): void => {
    if (y + requiredHeight <= pageHeight - margin) {
      return;
    }

    doc.addPage();
    y = 88;
    renderHeader();
  };

  const writeLine = (text: string, options?: { bold?: boolean; gapAfter?: number }): void => {
    doc.setFont('helvetica', options?.bold ? 'bold' : 'normal');
    doc.setFontSize(options?.bold ? 12 : 11);

    const lines = doc.splitTextToSize(text, contentWidth) as string[];
    ensurePageSpace(lines.length * 16 + (options?.gapAfter ?? 0));

    for (const line of lines) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = 88;
        renderHeader();
      }
      doc.text(line, margin, y);
      y += 16;
    }

    y += options?.gapAfter ?? 0;
  };

  renderHeader();

  writeLine('MH Consent Form', { bold: true, gapAfter: 8 });
  writeLine(`Patient Name: ${header.patientName ?? 'Unknown'}`);
  writeLine(`Practitioner Name: ${header.practitionerName ?? 'Unknown'}`);
  writeLine(`Consent Date: ${header.consentDate}`, { gapAfter: 12 });

  if (rows.length === 0) {
    writeLine('No questionnaire answers found in the response.');
    return doc.output('blob');
  }

  rows.forEach((row, index) => {
    writeLine(`${index + 1}. ${row.question}`, { bold: true });
    writeLine(`Answer: ${row.answer}`, { gapAfter: 6 });
  });

  return doc.output('blob');
}

export async function createMhConsentDocumentIfApplicable(medplum: MedplumClient, task: Task): Promise<boolean> {
  const questionnaireReference = getQuestionnaireReference(task);
  if (!questionnaireReference) {
    return false;
  }

  const questionnaire = (await medplum.readReference(questionnaireReference)) as Questionnaire;
  if (!isMhConsentForm(questionnaire)) {
    return false;
  }

  const questionnaireResponseReference = getQuestionnaireResponseReference(task);
  if (!questionnaireResponseReference) {
    return false;
  }

  const questionnaireResponse = (await medplum.readReference(questionnaireResponseReference)) as QuestionnaireResponse;
  const subject = getDocumentReferenceSubject(task.for) ?? getDocumentReferenceSubject(questionnaireResponse.subject);
  const patientName = await getPatientDisplayName(medplum, subject);

  const pdfBlob = await buildMhConsentPdfBlob(
    questionnaire,
    questionnaireResponse,
    {
      patientName,
      practitionerName: getPractitionerDisplayName(medplum.getProfile()),
      consentDate: formatConsentDate(questionnaireResponse.authored ?? new Date().toISOString()),
    },
    getCurrentOrganisationName(medplum)
  );
  const fileName = `mh-consent-${getFileSafeTimestamp(new Date())}.pdf`;
  const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

  const attachment = await medplum.createAttachment({
    data: file,
    filename: fileName,
    contentType: 'application/pdf',
  });

  const profile = medplum.getProfile();
  const practitioner = isResource<Practitioner>(profile, 'Practitioner') ? profile : undefined;
  const episodeReference = await resolveEpisodeOfCareReference(medplum, task, questionnaireResponse);
  const contextEncounter = episodeReference ?? task.encounter;

  const documentReference: DocumentReference = {
    resourceType: 'DocumentReference',
    status: 'current',
    docStatus: 'final',
    description: 'MH Consent Form',
    type: {
      text: 'MH Consent Form',
    },
    date: new Date().toISOString(),
    ...(subject ? { subject } : {}),
    ...(contextEncounter ? { context: { encounter: [contextEncounter] } } : {}),
    ...(practitioner
      ? {
          author: [
            {
              ...createReference(practitioner),
            },
          ],
        }
      : {}),
    content: [{ attachment }],
  };

  await medplum.createResource(documentReference);
  return true;
}

function getQuestionnaireReference(task: Task): Reference<Questionnaire> | undefined {
  const inputReference = task.input?.find((input) => input.valueReference?.reference?.startsWith('Questionnaire/'))
    ?.valueReference as Reference<Questionnaire> | undefined;

  if (inputReference) {
    return inputReference;
  }

  if (task.focus?.reference?.startsWith('Questionnaire/')) {
    return task.focus as Reference<Questionnaire>;
  }

  return undefined;
}

function getQuestionnaireResponseReference(task: Task): Reference<QuestionnaireResponse> | undefined {
  const output = task.output?.find((output) => {
    const typeText = normalizeText(output.type?.text);
    const hasQuestionnaireResponseCode =
      output.type?.coding?.some((coding) => normalizeText(coding.code) === 'questionnaireresponse') ?? false;
    const reference = output.valueReference?.reference;

    return (
      typeText === 'questionnaireresponse' ||
      hasQuestionnaireResponseCode ||
      reference?.startsWith('QuestionnaireResponse/')
    );
  });

  return output?.valueReference as Reference<QuestionnaireResponse> | undefined;
}

function getDocumentReferenceSubject(reference: Reference | undefined): DocumentReferenceSubject | undefined {
  const ref = reference?.reference;
  if (!ref) {
    return undefined;
  }

  if (
    ref.startsWith('Patient/') ||
    ref.startsWith('Practitioner/') ||
    ref.startsWith('Device/') ||
    ref.startsWith('Group/')
  ) {
    return reference as DocumentReferenceSubject;
  }

  return undefined;
}

async function resolveEpisodeOfCareReference(
  medplum: MedplumClient,
  task: Task,
  questionnaireResponse: QuestionnaireResponse
): Promise<Reference<EpisodeOfCare> | undefined> {
  const fromTask = await toEpisodeOfCareReference(medplum, task.encounter);
  if (fromTask) {
    return fromTask;
  }

  return toEpisodeOfCareReference(medplum, questionnaireResponse.encounter);
}

async function toEpisodeOfCareReference(
  medplum: MedplumClient,
  reference: Reference | undefined
): Promise<Reference<EpisodeOfCare> | undefined> {
  const ref = reference?.reference;
  if (!ref) {
    return undefined;
  }

  if (ref.startsWith('EpisodeOfCare/')) {
    return reference as Reference<EpisodeOfCare>;
  }

  if (ref.startsWith('Encounter/')) {
    try {
      const encounter = (await medplum.readReference(reference)) as Encounter;
      const episodeReference = encounter.episodeOfCare?.[0];
      if (episodeReference?.reference?.startsWith('EpisodeOfCare/')) {
        return episodeReference as Reference<EpisodeOfCare>;
      }
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function collectQuestionAnswerRows(
  questionnaireItems: QuestionnaireItem[] | undefined,
  answers: Record<string, QuestionnaireResponseItemAnswer>
): QuestionnairePdfRow[] {
  if (!questionnaireItems?.length) {
    return [];
  }

  const rows: QuestionnairePdfRow[] = [];

  const walk = (items: QuestionnaireItem[]): void => {
    for (const item of items) {
      const answer = answers[item.linkId];
      if (item.text && answer) {
        rows.push({
          question: item.text,
          answer: formatAnswer(answer),
        });
      }

      if (item.item?.length) {
        walk(item.item);
      }
    }
  };

  walk(questionnaireItems);
  return rows;
}

function formatAnswer(answer: QuestionnaireResponseItemAnswer): string {
  if (answer.valueString !== undefined) {
    return answer.valueString;
  }

  if (answer.valueBoolean !== undefined) {
    return answer.valueBoolean ? 'Yes' : 'No';
  }

  if (answer.valueDate !== undefined) {
    return answer.valueDate;
  }

  if (answer.valueDateTime !== undefined) {
    return answer.valueDateTime;
  }

  if (answer.valueInteger !== undefined) {
    return answer.valueInteger.toString();
  }

  if (answer.valueDecimal !== undefined) {
    return answer.valueDecimal.toString();
  }

  if (answer.valueTime !== undefined) {
    return answer.valueTime;
  }

  if (answer.valueUri !== undefined) {
    return answer.valueUri;
  }

  if (answer.valueCoding !== undefined) {
    return formatCodeableConcept({ coding: [answer.valueCoding] }) || answer.valueCoding.code || 'Coding answer';
  }

  if (answer.valueReference !== undefined) {
    return answer.valueReference.display ?? answer.valueReference.reference ?? 'Reference answer';
  }

  if (answer.valueQuantity !== undefined) {
    const value = answer.valueQuantity.value !== undefined ? String(answer.valueQuantity.value) : '';
    const unit = answer.valueQuantity.unit ?? '';
    return `${value} ${unit}`.trim() || 'Quantity answer';
  }

  if (answer.valueAttachment !== undefined) {
    return answer.valueAttachment.title ?? answer.valueAttachment.url ?? 'Attachment answer';
  }

  return 'Answer recorded';
}

function normalizeText(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function getPractitionerDisplayName(profile: unknown): string | undefined {
  if (!isResource<Practitioner>(profile, 'Practitioner')) {
    return undefined;
  }

  return profile.name?.[0] ? formatHumanName(profile.name[0]) : undefined;
}

async function getPatientDisplayName(
  medplum: MedplumClient,
  subject: DocumentReferenceSubject | undefined
): Promise<string | undefined> {
  if (!subject?.reference?.startsWith('Patient/')) {
    return undefined;
  }

  const display = subject.display?.trim();
  if (display) {
    return display;
  }

  try {
    const patient = await medplum.readReference(subject);
    if (patient.resourceType === 'Patient' && patient.name?.[0]) {
      return formatHumanName(patient.name[0]);
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function formatConsentDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function getFileSafeTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}-${hour}${minute}${second}`;
}

async function loadLogoDataUrl(): Promise<string | undefined> {
  try {
    const response = await fetch('/iprshealth.png');
    if (!response.ok) {
      return undefined;
    }

    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch {
    return undefined;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read logo blob'));
    reader.readAsDataURL(blob);
  });
}
