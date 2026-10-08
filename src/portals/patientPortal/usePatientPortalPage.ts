import type { Appointment, DocumentReference, Encounter, Patient, Task } from '@medplum/fhirtypes';
import { useMedplum, useMedplumProfile } from '@medplum/react';
import { useEffect, useState } from 'react';

export function formatAppointmentDateTime(isoString: string): string {
  const date = new Date(isoString);
  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(date);
  const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' }).format(date);
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  return `${weekday} ${dayMonth} · ${time}`;
}

export function formatSharedDate(isoString: string | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' }).format(date);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getDocumentTitle(doc: DocumentReference): string {
  return doc.content?.[0]?.attachment?.title ?? doc.description ?? 'Document';
}

export function getTaskCta(task: Task): string {
  const codeText = (task.code?.coding?.[0]?.code ?? task.code?.text ?? '').toLowerCase();
  return codeText.includes('questionnaire') ? 'Start' : 'Read';
}

const TERMINAL_STATUSES = new Set(['cancelled', 'noshow', 'entered-in-error', 'fulfilled']);

export interface PatientPortalData {
  loading: boolean;
  patientFirstName: string | undefined;
  nextAppointment: Appointment | undefined;
  appointmentSubLabel: string;
  practitionerName: string | undefined;
  practitionerRole: string | undefined;
  tasks: Task[];
  documents: DocumentReference[];
}

export function usePatientPortalPage(): PatientPortalData {
  const medplum = useMedplum();
  const profile = useMedplumProfile() as Patient | undefined;
  const patientId = profile?.id;

  const [nextAppointment, setNextAppointment] = useState<Appointment | undefined>();
  const [nextEncounter, setNextEncounter] = useState<Encounter | undefined>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<DocumentReference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    const run = async (): Promise<void> => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayIso = todayStart.toISOString();

      const loadNextAppointment = async (): Promise<
        { appointment: Appointment; encounter?: Encounter } | undefined
      > => {
        type Hit = { appointment: Appointment; encounter?: Encounter };

        // Strategy 1: direct Appointment search by actor
        const directAppts = await medplum
          .searchResources('Appointment', [
            ['actor', `Patient/${patientId}`],
            ['_count', '50'],
          ])
          .catch(() => [] as Appointment[]);

        // Strategy 2: Encounter → appointment ref → read Appointment
        const encounters = await medplum
          .searchResources('Encounter', [
            ['subject', `Patient/${patientId}`],
            ['_count', '100'],
          ])
          .catch(() => [] as Encounter[]);

        const encHits = (
          await Promise.all(
            encounters.flatMap((enc) =>
              (enc.appointment ?? []).map(({ reference }) =>
                medplum
                  .readResource('Appointment', reference!.split('/')[1])
                  .then((appt) => ({ appointment: appt as Appointment, encounter: enc as Encounter }))
                  .catch(() => null)
              )
            )
          )
        ).filter((r): r is { appointment: Appointment; encounter: Encounter } => !!r);

        const all: Hit[] = [...directAppts.map((a) => ({ appointment: a })), ...encHits].filter(
          (h, i, arr) => arr.findIndex((x) => x.appointment.id === h.appointment.id) === i
        );

        const upcoming = all.filter(
          ({ appointment: a }) => !TERMINAL_STATUSES.has(a.status ?? '') && !!a.start && a.start >= todayIso
        );
        return upcoming.sort((a, b) => (a.appointment.start ?? '').localeCompare(b.appointment.start ?? ''))[0];
      };

      const [next, taskList, docs] = await Promise.all([
        loadNextAppointment(),
        medplum
          .searchResources('Task', {
            subject: `Patient/${patientId}`,
            status: 'requested,ready,in-progress',
            _sort: 'priority,-_lastUpdated',
            _count: '10',
          })
          .catch(() => [] as Task[]),
        medplum
          .searchResources('DocumentReference', {
            subject: `Patient/${patientId}`,
            status: 'current',
            _sort: '-date',
            _count: '10',
          })
          .catch(() => [] as DocumentReference[]),
      ]);

      setNextAppointment(next?.appointment);
      setNextEncounter(next?.encounter as Encounter | undefined);
      setTasks(taskList);
      setDocuments(docs);
      setLoading(false);
    };

    run().catch(() => setLoading(false));
  }, [medplum, patientId]);

  const patientFirstName = profile?.name?.[0]?.given?.[0];

  const practitionerParticipant = nextAppointment?.participant?.find((p) =>
    p.actor?.reference?.startsWith('Practitioner/')
  );
  // Fall back to the encounter participant when the appointment has no practitioner actor
  const practitionerName =
    practitionerParticipant?.actor?.display ?? nextEncounter?.participant?.[0]?.individual?.display;
  const practitionerRole =
    practitionerParticipant?.type?.[0]?.text ?? practitionerParticipant?.type?.[0]?.coding?.[0]?.display;

  const serviceType =
    nextAppointment?.serviceType?.[0]?.text ?? nextAppointment?.serviceType?.[0]?.coding?.[0]?.display;
  const appointmentSubLabel = [
    serviceType,
    nextAppointment?.minutesDuration ? `${nextAppointment.minutesDuration} minutes` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    loading,
    patientFirstName,
    nextAppointment,
    appointmentSubLabel,
    practitionerName,
    practitionerRole,
    tasks,
    documents,
  };
}
