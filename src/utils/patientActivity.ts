import type { MedplumClient } from '@medplum/core';

/**
 * Records that the current user performed an action on a patient.
 * Creates a server-side AuditEvent for cross-device tracking.
 * Call this after any successful save/delete involving a patient.
 */
export function recordPatientActivity(medplum: MedplumClient, patientId: string | undefined): void {
  if (!patientId) return;

  const profile = medplum.getProfile();
  if (!profile?.resourceType || !profile?.id) return;

  const now = new Date().toISOString();
  const agentRef = `${profile.resourceType}/${profile.id}`;

  medplum
    .createResource({
      resourceType: 'AuditEvent',
      recorded: now,
      type: {
        system: 'http://terminology.hl7.org/CodeSystem/audit-event-type',
        code: 'rest',
        display: 'RESTful Operation',
      },
      agent: [{ who: { reference: agentRef }, requestor: true }],
      source: { observer: { reference: agentRef } },
      entity: [{ what: { reference: `Patient/${patientId}` } }],
    })
    .catch(() => {
      // Fire-and-forget
    });
}
