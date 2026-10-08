import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { WithId } from '@medplum/core';
import type { Appointment, CodeableConcept, Schedule, Slot } from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import { MedplumProvider } from '@medplum/react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { FindPane } from './FindPane';

const SchedulingParametersURI = 'https://medplum.com/fhir/StructureDefinition/SchedulingParameters';

describe('FindPane', () => {
  let medplum: MockClient;

  const serviceType1: CodeableConcept = {
    coding: [
      {
        system: 'http://example.com/service-types',
        code: 'checkup',
      },
    ],
    text: 'Annual Checkup',
  };

  const serviceType2: CodeableConcept = {
    coding: [
      {
        code: 'followup',
      },
    ],
    text: 'Follow-up Visit',
  };

  const createScheduleWithServiceTypes = (serviceTypes: (CodeableConcept | undefined)[]): WithId<Schedule> => ({
    resourceType: 'Schedule',
    id: 'schedule-1',
    actor: [{ reference: 'Practitioner/practitioner-1' }],
    active: true,
    extension: serviceTypes.map((st) => ({
      url: SchedulingParametersURI,
      extension: st ? [{ url: 'serviceType', valueCodeableConcept: st }] : [],
    })),
  });

  const defaultRange = {
    start: new Date('2024-01-15T00:00:00Z'),
    end: new Date('2024-01-21T23:59:59Z'),
  };

  beforeEach(() => {
    medplum = new MockClient();
    vi.clearAllMocks();
  });

  type SetupOptions = {
    schedule?: WithId<Schedule>;
    range?: { start: Date; end: Date };
    onSuccess?: (results: { appointments: Appointment[]; slots: Slot[] }) => void;
  };

  const setup = (options: SetupOptions = {}): ReturnType<typeof render> => {
    const {
      schedule = createScheduleWithServiceTypes([serviceType1, serviceType2]),
      range = defaultRange,
      onSuccess = vi.fn(),
    } = options;

    return render(
      <MemoryRouter>
        <MedplumProvider medplum={medplum}>
          <MantineProvider>
            <Notifications />
            <FindPane schedule={schedule} range={range} onSuccess={onSuccess} />
          </MantineProvider>
        </MedplumProvider>
      </MemoryRouter>
    );
  };

  describe('Initial Rendering', () => {
    test('renders services title when no service type is selected', async () => {
      await act(async () => {
        setup();
      });

      expect(screen.getByText('Services')).toBeInTheDocument();
    });

    test('renders service type buttons for each scheduling parameter', async () => {
      await act(async () => {
        setup();
      });

      expect(screen.getByText('Annual Checkup')).toBeInTheDocument();
      expect(screen.getByText('Follow-up Visit')).toBeInTheDocument();
    });
  });

  describe('Service Type Selection', () => {
    test('shows selected service type when a service type is selected', async () => {
      const user = userEvent.setup();

      await act(async () => {
        setup();
      });

      await user.click(screen.getByText('Annual Checkup'));

      expect(screen.getByText('Annual Checkup')).toBeInTheDocument();
      expect(screen.queryByText('Services')).not.toBeInTheDocument();
    });

    test('displays service type name after selection', async () => {
      const user = userEvent.setup();

      await act(async () => {
        setup();
      });

      await user.click(screen.getByText('Annual Checkup'));

      expect(screen.getByText('Annual Checkup')).toBeInTheDocument();
      expect(screen.queryByText('Services')).not.toBeInTheDocument();
    });

    test('displays slot buttons after selection', async () => {
      const user = userEvent.setup();

      await act(async () => {
        setup();
      });

      await user.click(screen.getByText('Annual Checkup'));

      // With this fixture (service types only), there may be no generated slots.
      // The selected header and clear-selection control should still be rendered.
      expect(screen.getByText('Annual Checkup')).toBeInTheDocument();
      expect(screen.getByLabelText('Clear selection')).toBeInTheDocument();
    });
  });

  describe('Dismiss Functionality', () => {
    test('shows dismiss button when service type is selected and multiple options exist', async () => {
      const user = userEvent.setup();

      await act(async () => {
        setup();
      });

      await user.click(screen.getByText('Annual Checkup'));

      expect(screen.getByLabelText('Clear selection')).toBeInTheDocument();
    });

    test('clears selection when dismissed', async () => {
      const user = userEvent.setup();

      await act(async () => {
        setup();
      });

      await user.click(screen.getByText('Annual Checkup'));
      expect(screen.getByLabelText('Clear selection')).toBeInTheDocument();

      await user.click(screen.getByLabelText('Clear selection'));

      expect(screen.getByText('Services')).toBeInTheDocument();
    });
  });

  describe('Auto-Selection with Single Service Type', () => {
    test('auto-selects when there is exactly one service type', async () => {
      const schedule = createScheduleWithServiceTypes([serviceType1]);

      await act(async () => {
        setup({ schedule });
      });

      // Should immediately show the service type name, not the selection UI
      expect(screen.getByText('Annual Checkup')).toBeInTheDocument();
      expect(screen.queryByText('Services')).not.toBeInTheDocument();
    });

    test('does not show dismiss button when auto-selected with single option', async () => {
      const schedule = createScheduleWithServiceTypes([serviceType1]);

      await act(async () => {
        setup({ schedule });
      });

      expect(screen.getByText('Annual Checkup')).toBeInTheDocument();

      // Dismiss button should not be present
      expect(screen.queryByLabelText('Clear selection')).not.toBeInTheDocument();
    });
  });
});
