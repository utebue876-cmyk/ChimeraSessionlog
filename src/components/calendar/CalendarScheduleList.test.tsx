import type { Appointment, Encounter, Task } from '@medplum/fhirtypes';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '../../testUtils/render';
import { CalendarScheduleList } from './CalendarScheduleList';

const mockSearchResources = vi.hoisted(() => vi.fn());
const mockSearchOne = vi.hoisted(() => vi.fn());
const mockMedplum = vi.hoisted(() => ({
  searchResources: mockSearchResources,
  searchOne: mockSearchOne,
}));

vi.mock('@medplum/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@medplum/react')>();
  return {
    ...actual,
    useMedplum: () => mockMedplum,
  };
});

describe('CalendarScheduleList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchOne.mockResolvedValue(undefined);
    mockSearchResources.mockImplementation((resourceType: string) => {
      if (resourceType === 'Encounter') {
        return Promise.resolve([{ resourceType: 'Encounter', id: 'enc-1' } as Encounter]);
      }
      if (resourceType === 'Task') {
        return Promise.resolve([{ resourceType: 'Task', id: 'task-1', basedOn: [{ display: 'Plan Alpha' }] } as Task]);
      }
      return Promise.resolve([]);
    });
  });

  test('renders no appointments message when list is empty', async () => {
    render(<CalendarScheduleList appointments={[]} />);

    await waitFor(() => {
      expect(screen.getByText('No appointments in this range.')).toBeInTheDocument();
    });
  });

  test('renders appointment row with derived plan definition name', async () => {
    const appointments: Appointment[] = [
      {
        resourceType: 'Appointment',
        id: 'appt-1',
        status: 'booked',
        start: '2024-06-05T09:00:00Z',
        end: '2024-06-05T09:30:00Z',
        serviceType: [{ coding: [{ code: 'followup', display: 'Follow Up' }] }],
        participant: [
          { actor: { reference: 'Patient/p1', display: 'Homer Simpson' }, status: 'accepted' },
          { actor: { reference: 'Practitioner/pr1', display: 'Dr. Smith' }, status: 'accepted' },
        ],
      },
    ];

    render(<CalendarScheduleList appointments={appointments} />);

    await waitFor(() => {
      expect(screen.getByText('Homer Simpson')).toBeInTheDocument();
    });

    expect(screen.getByText('Plan Alpha')).toBeInTheDocument();
    expect(screen.getByText('Follow Up')).toBeInTheDocument();
  });
});
