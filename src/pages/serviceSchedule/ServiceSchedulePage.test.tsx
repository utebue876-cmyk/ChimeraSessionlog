import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ServiceSchedulePage } from './ServiceSchedulePage';

const hookState = vi.hoisted(() => ({
  serviceTypeOptions: [],
  selectedServiceTypeKey: null as string | null,
  setSelectedServiceTypeKey: vi.fn(),
  practitioners: [],
  practitionersLoading: false,
  selectedPractitioner: undefined,
  selectPractitioner: vi.fn(),
  slotsLoading: false,
  slots: [],
  appointments: [],
  slotPropGetter: vi.fn(() => ({})),
  handleRangeChange: vi.fn(),
  startLoading: vi.fn(),
  bookingSlot: undefined as any,
  bookingDrawerOpen: false,
  setBookingDrawerOpen: vi.fn(),
  handleSelectSlot: vi.fn(),
  handleSelectAppointment: vi.fn(),
  handleBookSuccess: vi.fn(),
  appointmentDetails: undefined as any,
  appointmentDetailsOpen: false,
  setAppointmentDetailsOpen: vi.fn(),
  selectedAppointment: undefined as any,
  selectedAppointmentEncounter: undefined as any,
  appointmentInfoOpen: false,
  setAppointmentInfoOpen: vi.fn(),
  canShowSelectedAppointment: false,
  handleShowAppointment: vi.fn(),
  handleAppointmentUpdate: vi.fn(),
  dayScheduleMode: false,
  dayScheduleDate: new Date('2026-01-01T00:00:00.000Z'),
  handleDaySchedule: vi.fn(),
  exitDaySchedule: vi.fn(),
  handleDayScheduleDate: vi.fn(),
  practitionerSchedules: [],
  allPractitionersMode: false,
  handleAllPractitioners: vi.fn(),
  dayScheduleLoading: false,
}));

vi.mock('./useServiceSchedulePage', () => ({
  useServiceSchedulePage: () => hookState,
}));

vi.mock('./ServiceSelectionPane', () => ({
  ServiceSelectionPane: () => <div>Service Selection Pane</div>,
}));

vi.mock('../../components/calendar/Calendar', () => ({
  Calendar: () => <div>Calendar Component</div>,
}));

vi.mock('../../components/calendar/CalendarSchedule', () => ({
  CalendarSchedule: () => <div>Calendar Schedule Component</div>,
}));

vi.mock('../../components/schedule/BookAppointmentForm', () => ({
  BookAppointmentForm: () => <div>Book Appointment Form</div>,
}));

vi.mock('../../components/schedule/AppointmentDetails', () => ({
  AppointmentDetails: () => <div>Appointment Details Component</div>,
}));

vi.mock('../../components/schedule/AppointmentInfo', () => ({
  AppointmentInfo: () => <div>Appointment Info Component</div>,
}));

describe('ServiceSchedulePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.selectedServiceTypeKey = null;
    hookState.selectedPractitioner = undefined;
    hookState.dayScheduleMode = false;
    hookState.bookingDrawerOpen = false;
    hookState.appointmentDetailsOpen = false;
    hookState.appointmentInfoOpen = false;
    hookState.bookingSlot = undefined;
    hookState.appointmentDetails = undefined;
    hookState.selectedAppointment = undefined;
  });

  test('shows placeholder text when service type and practitioner are not selected', () => {
    render(
      <MantineProvider>
        <ServiceSchedulePage />
      </MantineProvider>
    );

    expect(screen.getByText('Service Selection Pane')).toBeInTheDocument();
    expect(screen.getByText('Select a service type and practitioner to view the schedule')).toBeInTheDocument();
  });

  test('renders calendar when service type and practitioner are selected', () => {
    hookState.selectedServiceTypeKey = 'svc1';
    hookState.selectedPractitioner = { id: 'pr1' } as any;

    render(
      <MantineProvider>
        <ServiceSchedulePage />
      </MantineProvider>
    );

    expect(screen.getByText('Calendar Component')).toBeInTheDocument();
  });

  test('renders day schedule mode and drawer contents when opened', () => {
    hookState.dayScheduleMode = true;
    hookState.selectedServiceTypeKey = 'svc1';
    hookState.bookingDrawerOpen = true;
    hookState.appointmentDetailsOpen = true;
    hookState.appointmentInfoOpen = true;
    hookState.bookingSlot = { status: 'free' } as any;
    hookState.appointmentDetails = { id: 'appt-1' } as any;
    hookState.selectedAppointment = { id: 'appt-1' } as any;

    render(
      <MantineProvider>
        <ServiceSchedulePage />
      </MantineProvider>
    );

    expect(screen.getByText('Calendar Schedule Component')).toBeInTheDocument();
    expect(screen.getByText('Book Appointment Form')).toBeInTheDocument();
    expect(screen.getByText('Appointment Details Component')).toBeInTheDocument();
    expect(screen.getByText('Appointment Info Component')).toBeInTheDocument();
  });
});
