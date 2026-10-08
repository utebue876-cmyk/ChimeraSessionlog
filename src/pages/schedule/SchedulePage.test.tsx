import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { Appointment, Schedule, Slot } from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import { MedplumProvider } from '@medplum/react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SchedulePage } from './SchedulePage';

const _SchedulingParametersURI = 'https://medplum.com/fhir/StructureDefinition/SchedulingParameters';

// ---- UI tests (hook mocked) ----

const hookState = vi.hoisted(() => ({
  createAppointmentOpened: false,
  createAppointmentHandlers: { open: vi.fn(), close: vi.fn() },
  appointmentDetailsOpened: false,
  appointmentDetailsHandlers: { open: vi.fn(), close: vi.fn() },
  appointmentInfoOpened: false,
  appointmentInfoHandlers: { open: vi.fn(), close: vi.fn() },
  schedule: undefined as Schedule | undefined,
  range: undefined,
  setRange: vi.fn(),
  slots: [] as Slot[],
  appointments: [] as Appointment[],
  appointmentSlot: undefined,
  appointmentDetails: undefined,
  selectedAppointment: undefined,
  selectedAppointmentEncounter: undefined,
  canShowSelectedAppointment: false,
  practitioner: undefined,
  mode: 'book' as const,
  setMode: vi.fn(),
  canBlockSelectedSchedule: true,
  blockSelection: undefined,
  setBlockSelection: vi.fn(),
  blockError: undefined,
  handleConfirmBlock: vi.fn(),
  handleSelectDayHeader: vi.fn(),
  handleSelectInterval: vi.fn(),
  handleSelectSlot: vi.fn(),
  handleBookSuccess: vi.fn(),
  handleSelectAppointment: vi.fn(),
  handleShowAppointment: vi.fn(),
  handleAppointmentUpdate: vi.fn(),
  handleDeleteAppointment: vi.fn(),
  handleActorChange: vi.fn(),
}));

vi.mock('./useSchedulePage', () => ({
  useSchedulePage: () => hookState,
}));

// window.innerHeight is needed by the component
Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });

const medplum = new MockClient();

function renderPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/Calendar/Schedule/schedule-1']}>
      <MedplumProvider medplum={medplum}>
        <MantineProvider>
          <Notifications />
          <Routes>
            <Route path="/Calendar/Schedule/:id" element={<SchedulePage />} />
          </Routes>
        </MantineProvider>
      </MedplumProvider>
    </MemoryRouter>
  );
}

describe('SchedulePage (UI)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.schedule = undefined;
    hookState.slots = [];
    hookState.appointments = [];
    hookState.createAppointmentOpened = false;
    hookState.appointmentDetailsOpened = false;
    hookState.appointmentInfoOpened = false;
    hookState.practitioner = undefined;
    hookState.mode = 'book';
    hookState.canBlockSelectedSchedule = true;
    hookState.blockSelection = undefined;
    hookState.blockError = undefined;
  });

  test('renders the calendar component', () => {
    renderPage();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  test('renders view switcher with Month, Week, Day options', () => {
    renderPage();
    expect(screen.getByText('Month')).toBeInTheDocument();
    expect(screen.getByText('Week')).toBeInTheDocument();
    expect(screen.getByText('Day')).toBeInTheDocument();
  });

  test('renders Practitioner label and reference input', () => {
    renderPage();
    expect(screen.getByText('Practitioner')).toBeInTheDocument();
  });

  test('does not render FindPane when schedule or range is absent', () => {
    hookState.schedule = undefined;
    renderPage();
    expect(screen.queryByText('Services')).not.toBeInTheDocument();
  });

  test('does not render create-appointment drawer when no practitioner', () => {
    hookState.practitioner = undefined;
    renderPage();
    expect(screen.queryByText('New Appointment')).not.toBeInTheDocument();
  });
});
