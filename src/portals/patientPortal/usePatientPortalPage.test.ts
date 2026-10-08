import type { Appointment, DocumentReference, Patient, Task } from '@medplum/fhirtypes';
import { useMedplumProfile } from '@medplum/react';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  formatAppointmentDateTime,
  formatSharedDate,
  getDocumentTitle,
  getInitials,
  getTaskCta,
  usePatientPortalPage,
} from './usePatientPortalPage';

const mockSearchResources = vi.fn();
const mockReadResource = vi.fn();

vi.mock('@medplum/react', async () => {
  const actual = await vi.importActual('@medplum/react');
  return {
    ...actual,
    useMedplum: () => ({ searchResources: mockSearchResources, readResource: mockReadResource }),
    useMedplumProfile: vi.fn(),
  };
});

const mockPatient: Patient = {
  resourceType: 'Patient',
  id: 'pt-1',
  name: [{ given: ['Alice'], family: 'Smith' }],
};

const futureAppointment: Appointment = {
  resourceType: 'Appointment',
  id: 'appt-1',
  status: 'booked',
  start: '2099-06-15T10:30:00.000Z',
  minutesDuration: 60,
  serviceType: [{ text: 'Video appointment' }],
  participant: [
    { actor: { reference: 'Practitioner/prac-1', display: 'Dr Jane Doe' }, status: 'accepted' },
    { actor: { reference: 'Patient/pt-1', display: 'Alice Smith' }, status: 'accepted' },
  ],
};

// ─── Utility function tests ───────────────────────────────────────────────────

describe('formatAppointmentDateTime', () => {
  test('formats ISO string as weekday day month · HH:MM', () => {
    const result = formatAppointmentDateTime('2026-08-28T10:00:00.000Z');
    expect(result).toMatch(/\w+\s+\d+\s+\w+\s+·\s+\d{2}:\d{2}/);
  });

  test('includes the correct date parts', () => {
    const result = formatAppointmentDateTime('2026-08-28T10:00:00.000Z');
    // Check structure rather than exact time (avoids timezone sensitivity)
    expect(result).toMatch(/·\s*\d{2}:\d{2}$/);
    expect(result).toContain('28');
  });
});

describe('formatSharedDate', () => {
  test('formats ISO date string as day month', () => {
    const result = formatSharedDate('2026-08-15T00:00:00.000Z');
    expect(result).toMatch(/\d+\s+\w+/);
    expect(result).toContain('15');
  });

  test('returns empty string for undefined', () => {
    expect(formatSharedDate(undefined)).toBe('');
  });
});

describe('getInitials', () => {
  test('returns first letters of each word uppercased', () => {
    expect(getInitials('Sarah Jones')).toBe('SJ');
  });

  test('caps at two characters', () => {
    expect(getInitials('Alice Bob Charles')).toBe('AB');
  });

  test('handles single name', () => {
    expect(getInitials('Alice')).toBe('A');
  });
});

describe('getDocumentTitle', () => {
  test('returns attachment title when present', () => {
    const doc: DocumentReference = {
      resourceType: 'DocumentReference',
      status: 'current',
      content: [{ attachment: { title: 'Attachment title' } }],
      description: 'Description fallback',
    };
    expect(getDocumentTitle(doc)).toBe('Attachment title');
  });

  test('falls back to description when no attachment title', () => {
    const doc: DocumentReference = {
      resourceType: 'DocumentReference',
      status: 'current',
      content: [{ attachment: {} }],
      description: 'Description fallback',
    };
    expect(getDocumentTitle(doc)).toBe('Description fallback');
  });

  test('returns "Document" as last resort', () => {
    const doc: DocumentReference = {
      resourceType: 'DocumentReference',
      status: 'current',
      content: [{ attachment: {} }],
    };
    expect(getDocumentTitle(doc)).toBe('Document');
  });
});

describe('getTaskCta', () => {
  test('returns "Start" for questionnaire task code', () => {
    const task: Task = {
      resourceType: 'Task',
      status: 'requested',
      intent: 'order',
      code: { coding: [{ code: 'complete-questionnaire' }] },
    };
    expect(getTaskCta(task)).toBe('Start');
  });

  test('returns "Start" for questionnaire in code text', () => {
    const task: Task = {
      resourceType: 'Task',
      status: 'requested',
      intent: 'order',
      code: { text: 'Complete Questionnaire' },
    };
    expect(getTaskCta(task)).toBe('Start');
  });

  test('returns "Read" for non-questionnaire tasks', () => {
    const task: Task = {
      resourceType: 'Task',
      status: 'requested',
      intent: 'order',
      code: { text: 'Read document' },
    };
    expect(getTaskCta(task)).toBe('Read');
  });

  test('returns "Read" when no code is present', () => {
    const task: Task = { resourceType: 'Task', status: 'requested', intent: 'order' };
    expect(getTaskCta(task)).toBe('Read');
  });
});

// ─── Hook tests ───────────────────────────────────────────────────────────────

describe('usePatientPortalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMedplumProfile).mockReturnValue(mockPatient);
    mockSearchResources.mockResolvedValue([]);
    mockReadResource.mockResolvedValue(futureAppointment);
  });

  test('starts with loading true', () => {
    mockSearchResources.mockImplementation(() => new Promise(() => {})); // never resolves
    const { result } = renderHook(() => usePatientPortalPage());
    expect(result.current.loading).toBe(true);
  });

  test('sets loading false and exposes patientFirstName when no patientId', async () => {
    vi.mocked(useMedplumProfile).mockReturnValue(undefined);
    const { result } = renderHook(() => usePatientPortalPage());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.patientFirstName).toBeUndefined();
  });

  test('exposes patient first name from profile', async () => {
    const { result } = renderHook(() => usePatientPortalPage());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.patientFirstName).toBe('Alice');
  });

  test('returns next appointment found via direct actor search', async () => {
    mockSearchResources.mockImplementation((type: string) => {
      if (type === 'Appointment') return Promise.resolve([futureAppointment]);
      return Promise.resolve([]);
    });

    const { result } = renderHook(() => usePatientPortalPage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.nextAppointment?.id).toBe('appt-1');
  });

  test('builds appointmentSubLabel from serviceType and duration', async () => {
    mockSearchResources.mockImplementation((type: string) => {
      if (type === 'Appointment') return Promise.resolve([futureAppointment]);
      return Promise.resolve([]);
    });

    const { result } = renderHook(() => usePatientPortalPage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.appointmentSubLabel).toBe('Video appointment · 60 minutes');
  });

  test('extracts practitionerName from appointment participant', async () => {
    mockSearchResources.mockImplementation((type: string) => {
      if (type === 'Appointment') return Promise.resolve([futureAppointment]);
      return Promise.resolve([]);
    });

    const { result } = renderHook(() => usePatientPortalPage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.practitionerName).toBe('Dr Jane Doe');
  });

  test('filters out terminal-status appointments', async () => {
    const cancelledAppt: Appointment = { ...futureAppointment, id: 'cancelled-1', status: 'cancelled' };
    mockSearchResources.mockImplementation((type: string) => {
      if (type === 'Appointment') return Promise.resolve([cancelledAppt]);
      return Promise.resolve([]);
    });

    const { result } = renderHook(() => usePatientPortalPage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.nextAppointment).toBeUndefined();
  });

  test('filters out past appointments', async () => {
    const pastAppt: Appointment = { ...futureAppointment, id: 'past-1', start: '2000-01-01T10:00:00.000Z' };
    mockSearchResources.mockImplementation((type: string) => {
      if (type === 'Appointment') return Promise.resolve([pastAppt]);
      return Promise.resolve([]);
    });

    const { result } = renderHook(() => usePatientPortalPage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.nextAppointment).toBeUndefined();
  });

  test('returns tasks from search', async () => {
    const task: Task = {
      resourceType: 'Task',
      id: 'task-1',
      status: 'requested',
      intent: 'order',
      description: 'Complete form',
    };
    mockSearchResources.mockImplementation((type: string) => {
      if (type === 'Task') return Promise.resolve([task]);
      return Promise.resolve([]);
    });

    const { result } = renderHook(() => usePatientPortalPage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].id).toBe('task-1');
  });

  test('returns documents from search', async () => {
    const doc: DocumentReference = {
      resourceType: 'DocumentReference',
      id: 'doc-1',
      status: 'current',
      content: [{ attachment: { title: 'Welcome pack' } }],
    };
    mockSearchResources.mockImplementation((type: string) => {
      if (type === 'DocumentReference') return Promise.resolve([doc]);
      return Promise.resolve([]);
    });

    const { result } = renderHook(() => usePatientPortalPage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.documents).toHaveLength(1);
    expect(result.current.documents[0].id).toBe('doc-1');
  });

  test('handles Forbidden search errors gracefully', async () => {
    mockSearchResources.mockRejectedValue(new Error('Forbidden'));

    const { result } = renderHook(() => usePatientPortalPage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.nextAppointment).toBeUndefined();
    expect(result.current.tasks).toEqual([]);
    expect(result.current.documents).toEqual([]);
  });

  test('deduplicates appointment found by both strategies', async () => {
    const encounter = {
      resourceType: 'Encounter',
      id: 'enc-1',
      status: 'planned',
      appointment: [{ reference: 'Appointment/appt-1' }],
    };
    mockSearchResources.mockImplementation((type: string) => {
      if (type === 'Appointment') return Promise.resolve([futureAppointment]);
      if (type === 'Encounter') return Promise.resolve([encounter]);
      return Promise.resolve([]);
    });
    mockReadResource.mockResolvedValue(futureAppointment);

    const { result } = renderHook(() => usePatientPortalPage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Should only appear once despite being found by both strategies
    expect(result.current.nextAppointment?.id).toBe('appt-1');
  });
});
