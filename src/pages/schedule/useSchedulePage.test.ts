import type { Appointment, Encounter, Schedule, Slot } from '@medplum/fhirtypes';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SchedulingTransientIdentifier } from '../../utils/scheduling';
import { useSchedulePage } from './useSchedulePage';

// ---- Hoisted mocks ----

const navigateMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const paramsMock = vi.hoisted(() => ({ id: 'schedule-1' }));

const medplumMock = vi.hoisted(() => ({
  searchOne: vi.fn(),
  readResource: vi.fn(),
  searchResources: vi.fn(),
  createResource: vi.fn(),
  deleteResource: vi.fn(),
}));

const profileMock = vi.hoisted(() => ({
  resourceType: 'Practitioner' as const,
  id: 'pr-1',
  name: [{ family: 'Smith' }],
}));

const showErrorNotificationMock = vi.hoisted(() => vi.fn());
const mergeOverlappingSlotsMock = vi.hoisted(() => vi.fn((slots: Slot[]) => slots));

vi.mock('react-router', () => ({
  useNavigate: () => navigateMock,
  useParams: () => paramsMock,
}));

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumMock,
  useMedplumProfile: () => profileMock,
}));

vi.mock('../../utils/notifications', () => ({
  showErrorNotification: (...args: unknown[]) => showErrorNotificationMock(...args),
}));

vi.mock('../../utils/slots', () => ({
  mergeOverlappingSlots: (...args: unknown[]) => mergeOverlappingSlotsMock(...(args as [Slot[]])),
}));

// ---- Fixtures ----

const mockSchedule: Schedule = {
  resourceType: 'Schedule',
  id: 'schedule-1',
  actor: [{ reference: 'Practitioner/pr-1' }],
  active: true,
};

const mockAppointment: Appointment = {
  resourceType: 'Appointment',
  id: 'apt-1',
  status: 'booked',
  start: '2026-07-17T09:00:00Z',
  end: '2026-07-17T09:30:00Z',
  participant: [{ actor: { reference: 'Practitioner/pr-1' }, status: 'accepted' }],
};

const mockFreeSlot: Slot = {
  resourceType: 'Slot',
  id: 'slot-free',
  status: 'free',
  start: '2026-07-17T09:00:00Z',
  end: '2026-07-17T09:30:00Z',
  schedule: { reference: 'Schedule/schedule-1' },
};

const mockBusySlot: Slot = {
  resourceType: 'Slot',
  id: 'slot-busy',
  status: 'busy',
  start: '2026-07-17T09:00:00Z',
  end: '2026-07-17T09:30:00Z',
  schedule: { reference: 'Schedule/schedule-1' },
};

// ---- Setup helpers ----

/** Render the hook and wait for the schedule to load from the URL param */
async function setupWithSchedule() {
  medplumMock.readResource.mockResolvedValue(mockSchedule);
  const hook = renderHook(() => useSchedulePage());
  await waitFor(() => expect(hook.result.current.schedule).toBeDefined());
  return hook;
}

// ---- Tests ----

describe('useSchedulePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paramsMock.id = 'schedule-1';
    medplumMock.searchOne.mockResolvedValue(undefined);
    medplumMock.readResource.mockResolvedValue(undefined);
    medplumMock.searchResources.mockResolvedValue([]);
    medplumMock.createResource.mockResolvedValue({ resourceType: 'Schedule', id: 'new-sched' });
    medplumMock.deleteResource.mockResolvedValue({});
    mergeOverlappingSlotsMock.mockImplementation((slots: Slot[]) => slots);
  });

  // ---- Schedule loading ----

  describe('schedule loading', () => {
    test('loads schedule from URL param on mount', async () => {
      medplumMock.readResource.mockResolvedValue(mockSchedule);
      const { result } = renderHook(() => useSchedulePage());

      await waitFor(() => expect(result.current.schedule).toEqual(mockSchedule));
      expect(medplumMock.readResource).toHaveBeenCalledWith('Schedule', 'schedule-1');
    });

    test('clears schedule when id param is absent', async () => {
      paramsMock.id = undefined as unknown as string;
      const { result } = renderHook(() => useSchedulePage());
      expect(result.current.schedule).toBeUndefined();
    });

    test('shows error notification when schedule load fails', async () => {
      medplumMock.readResource.mockRejectedValue(new Error('Not found'));
      renderHook(() => useSchedulePage());
      await waitFor(() => expect(showErrorNotificationMock).toHaveBeenCalled());
    });
  });

  // ---- Redirect (no id in URL) ----

  describe('redirect when no id in URL', () => {
    test('loads existing schedule into state without navigating', async () => {
      paramsMock.id = undefined as unknown as string;
      medplumMock.searchOne.mockResolvedValue(mockSchedule);

      const { result } = renderHook(() => useSchedulePage());
      await waitFor(() => expect(result.current.schedule).toEqual(mockSchedule));
      expect(navigateMock).not.toHaveBeenCalled();
    });

    test('creates a new schedule and keeps the current route when none exists', async () => {
      paramsMock.id = undefined as unknown as string;
      medplumMock.searchOne.mockResolvedValue(undefined);
      medplumMock.createResource.mockResolvedValue({ resourceType: 'Schedule', id: 'new-sched' });

      const { result } = renderHook(() => useSchedulePage());
      await waitFor(() =>
        expect(medplumMock.createResource).toHaveBeenCalledWith(
          expect.objectContaining({ resourceType: 'Schedule', active: true })
        )
      );
      await waitFor(() => expect(result.current.schedule?.id).toBe('new-sched'));
      expect(navigateMock).not.toHaveBeenCalled();
    });
  });

  // ---- handleSelectSlot ----

  describe('fallback free-slot generation', () => {
    test('generates transient free slots when backend returns only blocked slots', async () => {
      const scheduleWithAvailability: Schedule = {
        ...mockSchedule,
        extension: [
          {
            url: 'https://medplum.com/fhir/StructureDefinition/SchedulingParameters',
            extension: [
              { url: 'timezone', valueCode: 'UTC' },
              {
                url: 'availability',
                extension: [
                  {
                    url: 'availableTime',
                    extension: [
                      { url: 'daysOfWeek', valueCode: 'mon' },
                      { url: 'daysOfWeek', valueCode: 'tue' },
                      { url: 'daysOfWeek', valueCode: 'wed' },
                      { url: 'daysOfWeek', valueCode: 'thu' },
                      { url: 'daysOfWeek', valueCode: 'fri' },
                      { url: 'daysOfWeek', valueCode: 'sat' },
                      { url: 'daysOfWeek', valueCode: 'sun' },
                      { url: 'availableStartTime', valueTime: '08:00:00' },
                      { url: 'availableEndTime', valueTime: '18:00:00' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const blockedSlot: Slot = {
        resourceType: 'Slot',
        id: 'blocked-1',
        status: 'busy-unavailable',
        start: '2099-01-05T10:00:00.000Z',
        end: '2099-01-05T10:30:00.000Z',
        schedule: { reference: 'Schedule/schedule-1' },
      };

      medplumMock.readResource.mockResolvedValue(scheduleWithAvailability);
      medplumMock.searchResources.mockImplementation(async (resourceType: string) => {
        if (resourceType === 'Slot') {
          return [blockedSlot];
        }
        if (resourceType === 'Appointment') {
          return [];
        }
        return [];
      });

      const { result } = renderHook(() => useSchedulePage());
      await waitFor(() => expect(result.current.schedule).toBeDefined());

      act(() => {
        result.current.setRange({
          start: new Date('2099-01-05T00:00:00.000Z'),
          end: new Date('2099-01-06T00:00:00.000Z'),
        });
      });

      await waitFor(() => {
        const freeSlots = (result.current.slots ?? []).filter((slot) => slot.status === 'free');
        expect(freeSlots.length).toBeGreaterThan(0);
        expect(SchedulingTransientIdentifier.get(freeSlots[0])).toBeDefined();
      });
    });
  });

  describe('handleSelectSlot', () => {
    test('opens create-appointment drawer for a free slot when practitioner exists', async () => {
      const { result } = await setupWithSchedule();

      act(() => result.current.handleSelectSlot(mockFreeSlot));

      expect(result.current.createAppointmentOpened).toBe(true);
      expect(result.current.appointmentSlot).toEqual({
        start: new Date(mockFreeSlot.start),
        end: new Date(mockFreeSlot.end),
      });
    });

    test('does not open drawer for a non-free slot', async () => {
      const { result } = await setupWithSchedule();

      act(() => result.current.handleSelectSlot(mockBusySlot));

      expect(result.current.createAppointmentOpened).toBe(false);
    });

    test('shows error notification when no practitioner on the schedule', async () => {
      medplumMock.readResource.mockResolvedValue({
        ...mockSchedule,
        actor: [{ reference: 'Organization/org-1' }],
      });
      const { result } = renderHook(() => useSchedulePage());
      await waitFor(() => expect(result.current.schedule).toBeDefined());

      act(() => result.current.handleSelectSlot(mockFreeSlot));

      expect(showErrorNotificationMock).toHaveBeenCalledWith(expect.stringContaining('Practitioner'));
      expect(result.current.createAppointmentOpened).toBe(false);
    });
  });

  // ---- handleSelectInterval ----

  describe('handleSelectInterval', () => {
    test('opens create-appointment drawer when practitioner exists', async () => {
      const { result } = await setupWithSchedule();
      const slotInfo = { start: new Date(), end: new Date(), slots: [], action: 'select' as const };

      act(() => result.current.handleSelectInterval(slotInfo));

      expect(result.current.createAppointmentOpened).toBe(true);
    });

    test('shows error notification when no practitioner', async () => {
      medplumMock.readResource.mockResolvedValue({ ...mockSchedule, actor: [] });
      const { result } = renderHook(() => useSchedulePage());
      await waitFor(() => expect(result.current.schedule).toBeDefined());
      const slotInfo = { start: new Date(), end: new Date(), slots: [], action: 'select' as const };

      act(() => result.current.handleSelectInterval(slotInfo));

      expect(showErrorNotificationMock).toHaveBeenCalledWith(expect.stringContaining('Practitioner'));
    });
  });

  // ---- blocking mode ----

  describe('blocking mode', () => {
    test('selects a block draft when selecting an interval in block mode', async () => {
      const { result } = await setupWithSchedule();
      const start = new Date('2026-07-17T13:00:00.000Z');
      const end = new Date('2026-07-17T14:00:00.000Z');

      act(() => {
        result.current.setMode('block');
      });

      act(() => {
        result.current.handleSelectInterval({ start, end, slots: [], action: 'select' } as any);
      });

      expect(result.current.blockSelection).toEqual({ start, end, allDay: false });
      expect(medplumMock.createResource).not.toHaveBeenCalledWith(expect.objectContaining({ resourceType: 'Slot' }));
    });

    test('creates a busy-unavailable slot when confirming a block draft', async () => {
      const { result } = await setupWithSchedule();
      const start = new Date('2026-07-17T13:00:00.000Z');
      const end = new Date('2026-07-17T14:00:00.000Z');

      medplumMock.createResource.mockResolvedValue({
        resourceType: 'Slot',
        id: 'blocked-1',
        status: 'busy-unavailable',
        start: start.toISOString(),
        end: end.toISOString(),
        schedule: { reference: 'Schedule/schedule-1' },
      });

      act(() => {
        result.current.setMode('block');
        result.current.setBlockSelection({ start, end, allDay: false });
      });

      await act(async () => {
        await result.current.handleConfirmBlock();
      });

      await waitFor(() => {
        expect(medplumMock.createResource).toHaveBeenCalledWith(
          expect.objectContaining({
            resourceType: 'Slot',
            status: 'busy-unavailable',
            start: start.toISOString(),
            end: end.toISOString(),
          })
        );
      });
    });

    test('prevents practitioners from blocking another practitioner schedule', async () => {
      medplumMock.readResource.mockResolvedValue({
        ...mockSchedule,
        actor: [{ reference: 'Practitioner/pr-2' }],
      });
      const { result } = renderHook(() => useSchedulePage());
      await waitFor(() => expect(result.current.schedule).toBeDefined());

      act(() => {
        result.current.setMode('block');
        result.current.setBlockSelection({
          start: new Date('2026-07-17T13:00:00.000Z'),
          end: new Date('2026-07-17T14:00:00.000Z'),
          allDay: false,
        });
      });

      await act(async () => {
        await result.current.handleConfirmBlock();
      });

      await waitFor(() => {
        expect(showErrorNotificationMock).toHaveBeenCalledWith('You can only block your own calendar');
      });
      expect(medplumMock.createResource).not.toHaveBeenCalledWith(expect.objectContaining({ resourceType: 'Slot' }));
    });

    test('rejects blocking when a booked appointment overlaps the selected range', async () => {
      const { result } = await setupWithSchedule();
      const start = new Date('2026-07-17T09:00:00.000Z');
      const end = new Date('2026-07-17T10:00:00.000Z');
      const overlappingAppointment: Appointment = {
        resourceType: 'Appointment',
        id: 'apt-overlap',
        status: 'booked',
        start: '2026-07-17T09:30:00.000Z',
        end: '2026-07-17T10:30:00.000Z',
        participant: [],
      };

      medplumMock.searchResources.mockResolvedValue([overlappingAppointment]);

      act(() => {
        result.current.setMode('block');
        result.current.setBlockSelection({ start, end, allDay: false });
        result.current.setRange({
          start: new Date('2026-07-17T00:00:00.000Z'),
          end: new Date('2026-07-18T00:00:00.000Z'),
        });
      });

      await waitFor(() => expect(result.current.appointments).toContainEqual(overlappingAppointment));

      await act(async () => {
        await result.current.handleConfirmBlock();
      });

      expect(showErrorNotificationMock).toHaveBeenCalledWith(
        'This range contains booked appointments. Remove the booking or change the practitioner before trying again.'
      );
      expect(medplumMock.createResource).not.toHaveBeenCalledWith(expect.objectContaining({ resourceType: 'Slot' }));
    });

    test('removes blocked slots when selecting a blocked slot in block mode', async () => {
      const { result } = await setupWithSchedule();
      const blockedSlot: Slot = {
        resourceType: 'Slot',
        id: 'blocked-1',
        status: 'busy-unavailable',
        start: '2026-07-17T13:00:00.000Z',
        end: '2026-07-17T14:00:00.000Z',
        schedule: { reference: 'Schedule/schedule-1' },
      };

      medplumMock.searchResources.mockResolvedValue([blockedSlot]);

      act(() => {
        result.current.setMode('block');
      });

      act(() => {
        result.current.handleSelectSlot(blockedSlot);
      });

      await waitFor(() => {
        expect(result.current.pendingRemoveSlot).toEqual(blockedSlot);
      });

      await act(async () => {
        await result.current.handleConfirmRemove();
      });

      await waitFor(() => {
        expect(medplumMock.deleteResource).toHaveBeenCalledWith('Slot', 'blocked-1');
      });
    });
  });

  // ---- handleBookSuccess ----

  describe('handleBookSuccess', () => {
    test('adds new appointment to state and opens appointment-details drawer', async () => {
      const { result } = await setupWithSchedule();

      act(() => result.current.handleBookSuccess({ appointments: [mockAppointment], slots: [] }));

      expect(result.current.appointments).toContainEqual(mockAppointment);
      expect(result.current.appointmentDetails).toEqual(mockAppointment);
      expect(result.current.appointmentDetailsOpened).toBe(true);
    });

    test('adds non-busy slots to state but filters out busy ones', async () => {
      const { result } = await setupWithSchedule();

      act(() =>
        result.current.handleBookSuccess({
          appointments: [mockAppointment],
          slots: [mockFreeSlot, mockBusySlot],
        })
      );

      expect(result.current.slots).toContainEqual(mockFreeSlot);
      expect(result.current.slots).not.toContainEqual(mockBusySlot);
    });
  });

  // ---- handleSelectAppointment ----

  describe('handleSelectAppointment', () => {
    test('sets selected appointment, loads encounter, and opens appointment-info drawer', async () => {
      const encounter: Encounter = {
        resourceType: 'Encounter',
        id: 'enc-1',
        status: 'planned',
        class: { code: 'AMB' },
        subject: { reference: 'Patient/p-1' },
      };
      medplumMock.searchResources.mockResolvedValue([encounter]);
      const { result } = await setupWithSchedule();

      await act(() => result.current.handleSelectAppointment(mockAppointment));

      expect(result.current.selectedAppointment).toEqual(mockAppointment);
      expect(result.current.selectedAppointmentEncounter).toEqual(encounter);
      expect(result.current.canShowSelectedAppointment).toBe(true);
      expect(result.current.appointmentInfoOpened).toBe(true);
    });

    test('canShowSelectedAppointment is false when encounter has no subject', async () => {
      const encounter: Encounter = {
        resourceType: 'Encounter',
        id: 'enc-1',
        status: 'planned',
        class: { code: 'AMB' },
      };
      medplumMock.searchResources.mockResolvedValue([encounter]);
      const { result } = await setupWithSchedule();

      await act(() => result.current.handleSelectAppointment(mockAppointment));

      expect(result.current.canShowSelectedAppointment).toBe(false);
    });

    test('shows error notification when encounter search fails', async () => {
      medplumMock.searchResources.mockRejectedValue(new Error('Search failed'));
      const { result } = await setupWithSchedule();

      await act(() => result.current.handleSelectAppointment(mockAppointment));

      expect(showErrorNotificationMock).toHaveBeenCalled();
      expect(result.current.appointmentInfoOpened).toBe(false);
    });
  });

  // ---- handleShowAppointment ----

  describe('handleShowAppointment', () => {
    test('navigates to the encounter chart and closes the info drawer', async () => {
      const encounter: Encounter = {
        resourceType: 'Encounter',
        id: 'enc-1',
        status: 'planned',
        class: { code: 'AMB' },
        subject: { reference: 'Patient/p-1' },
      };
      medplumMock.searchResources.mockResolvedValue([encounter]);
      const { result } = await setupWithSchedule();
      await act(() => result.current.handleSelectAppointment(mockAppointment));

      await act(() => result.current.handleShowAppointment());

      expect(navigateMock).toHaveBeenCalledWith('/Patient/p-1/Encounter/enc-1');
      expect(result.current.appointmentInfoOpened).toBe(false);
    });

    test('does nothing when patient ref or encounter id is missing', async () => {
      const { result } = await setupWithSchedule();

      await act(() => result.current.handleShowAppointment());

      expect(navigateMock).not.toHaveBeenCalledWith(expect.stringContaining('Encounter'));
    });
  });

  // ---- handleAppointmentUpdate ----

  describe('handleAppointmentUpdate', () => {
    test('updates the matching appointment in state', async () => {
      const { result } = await setupWithSchedule();
      act(() => result.current.handleBookSuccess({ appointments: [mockAppointment], slots: [] }));

      const updated: Appointment = { ...mockAppointment, status: 'cancelled' };
      act(() => result.current.handleAppointmentUpdate(updated));

      expect(result.current.appointments?.find((a) => a.id === 'apt-1')?.status).toBe('cancelled');
      expect(result.current.appointmentDetails?.status).toBe('cancelled');
    });
  });

  // ---- handleDeleteAppointment ----

  describe('handleDeleteAppointment', () => {
    test('removes the deleted appointment from state', async () => {
      const { result } = await setupWithSchedule();
      act(() => result.current.handleBookSuccess({ appointments: [mockAppointment], slots: [] }));

      act(() => result.current.handleDeleteAppointment(mockAppointment));

      expect(result.current.appointments?.find((a) => a.id === 'apt-1')).toBeUndefined();
    });

    test('removes referenced slot IDs from slots state', async () => {
      const { result } = await setupWithSchedule();
      act(() =>
        result.current.handleBookSuccess({
          appointments: [mockAppointment],
          slots: [mockFreeSlot],
        })
      );

      const aptWithSlot: Appointment = {
        ...mockAppointment,
        slot: [{ reference: `Slot/${mockFreeSlot.id}` }],
      };
      act(() => result.current.handleDeleteAppointment(aptWithSlot));

      expect(result.current.slots?.find((s) => s.id === mockFreeSlot.id)).toBeUndefined();
    });
  });

  // ---- handleActorChange ----

  describe('handleActorChange', () => {
    test('clears schedule, slots, and appointments when ref is undefined', async () => {
      const { result } = await setupWithSchedule();
      act(() => result.current.handleBookSuccess({ appointments: [mockAppointment], slots: [mockFreeSlot] }));

      act(() => result.current.handleActorChange(undefined));

      expect(result.current.schedule).toBeUndefined();
      expect(result.current.slots).toBeUndefined();
      expect(result.current.appointments).toBeUndefined();
    });

    test('searches for schedule and updates state when a practitioner ref is provided', async () => {
      medplumMock.searchOne.mockResolvedValue(mockSchedule);
      const { result } = await setupWithSchedule();

      await act(() => result.current.handleActorChange({ reference: 'Practitioner/pr-2' }));

      await waitFor(() =>
        expect(medplumMock.searchOne).toHaveBeenCalledWith('Schedule', { actor: 'Practitioner/pr-2' })
      );
      expect(result.current.schedule).toEqual(mockSchedule);
      expect(navigateMock).not.toHaveBeenCalled();
    });

    test('clears state when no schedule is found for the actor', async () => {
      medplumMock.searchOne.mockResolvedValue(undefined);
      const { result } = await setupWithSchedule();

      await act(() => result.current.handleActorChange({ reference: 'Practitioner/pr-unknown' }));

      await waitFor(() => expect(result.current.schedule).toBeUndefined());
    });
  });

  // ---- availability ----

  describe('availability', () => {
    const SchedulingParametersURI = 'https://medplum.com/fhir/StructureDefinition/SchedulingParameters';

    test('is undefined when no schedule is loaded', () => {
      const { result } = renderHook(() => useSchedulePage());
      expect(result.current.availability).toBeUndefined();
    });

    test('has empty windows when schedule has no SchedulingParameters', async () => {
      const { result } = await setupWithSchedule();
      // mockSchedule has no extensions
      expect(result.current.availability?.windows).toHaveLength(0);
    });

    test('returns populated windows when schedule has SchedulingParameters', async () => {
      const scheduleWithAvailability: Schedule = {
        ...mockSchedule,
        extension: [
          {
            url: SchedulingParametersURI,
            extension: [
              { url: 'timezone', valueCode: 'Europe/London' },
              {
                url: 'availability',
                extension: [
                  {
                    url: 'availableTime',
                    extension: [
                      { url: 'daysOfWeek', valueCode: 'mon' },
                      { url: 'daysOfWeek', valueCode: 'fri' },
                      { url: 'availableStartTime', valueTime: '09:00:00' },
                      { url: 'availableEndTime', valueTime: '17:00:00' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      medplumMock.readResource.mockResolvedValue(scheduleWithAvailability);
      const hook = renderHook(() => useSchedulePage());
      await waitFor(() => expect(hook.result.current.schedule).toBeDefined());

      expect(hook.result.current.availability?.windows).toHaveLength(1);
      expect(hook.result.current.availability?.windows[0].days).toContain('mon');
      expect(hook.result.current.availability?.windows[0].startMinutes).toBe(9 * 60);
      expect(hook.result.current.availability?.timezone).toBe('Europe/London');
    });
  });
});
