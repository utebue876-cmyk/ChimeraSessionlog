/**
 * Integration tests for SchedulePage that require a real MockClient and the
 * real useSchedulePage hook (no mocks). Kept separate from SchedulePage.test.tsx
 * so the hook mock in that file doesn't interfere.
 */
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ReadablePromise } from '@medplum/core';
import type { Bundle, CodeableConcept, Schedule, Slot } from '@medplum/fhirtypes';
import { DrAliceSmith, MockClient } from '@medplum/mock';
import { MedplumProvider } from '@medplum/react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { JSX } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SchedulePage } from './SchedulePage';

const SchedulingParametersURI = 'https://medplum.com/fhir/StructureDefinition/SchedulingParameters';

function LocationProbe(): JSX.Element {
  const location = useLocation();
  return <div data-testid="location-pathname">{location.pathname}</div>;
}

describe('$find/$book component integration tests', () => {
  let medplum: MockClient;

  beforeEach(async () => {
    medplum = new MockClient({ profile: DrAliceSmith });
    vi.clearAllMocks();

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });
  });

  const setup = (initialPath = '/Calendar/Schedule/alice-smith-schedule'): ReturnType<typeof render> => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <MedplumProvider medplum={medplum}>
          <MantineProvider>
            <Notifications />
            <LocationProbe />
            <Routes>
              <Route path="/Calendar/Schedule/:id" element={<SchedulePage />} />
              <Route path="/Calendar/Schedule" element={<SchedulePage />} />
            </Routes>
          </MantineProvider>
        </MedplumProvider>
      </MemoryRouter>
    );
  };

  const serviceType1: CodeableConcept = {
    coding: [{ system: 'http://example.com/service-types', code: 'checkup' }],
    text: 'Annual Checkup',
  };

  const serviceType2: CodeableConcept = {
    coding: [{ system: 'http://example.com/service-types', code: 'followup' }],
    text: 'Follow-up Visit',
  };

  const createScheduleWithServiceTypes = (serviceTypes: (CodeableConcept | undefined)[]): Schedule => ({
    resourceType: 'Schedule',
    id: 'schedule-1',
    actor: [{ reference: 'Practitioner/practitioner-1' }],
    active: true,
    extension: serviceTypes.map((st) => ({
      url: SchedulingParametersURI,
      extension: st ? [{ url: 'serviceType', valueCodeableConcept: st }] : [],
    })),
  });

  test('renders ScheduleFindPane when schedule has scheduling parameters', async () => {
    const scheduleWithServiceTypes = createScheduleWithServiceTypes([serviceType1]);
    await medplum.createResource(scheduleWithServiceTypes);

    await act(async () => {
      setup('/Calendar/Schedule/schedule-1');
    });

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Annual Checkup')).toBeInTheDocument();
  });

  test('does not render ScheduleFindPane when schedule has no scheduling parameters', async () => {
    await act(async () => {
      setup();
    });

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.queryByText('Services')).not.toBeInTheDocument();
  });

  test('keeps /Calendar/Schedule route after load when opened from sidebar', async () => {
    await medplum.createResource({
      resourceType: 'Schedule',
      id: 'sidebar-opened-schedule',
      actor: [{ reference: `Practitioner/${DrAliceSmith.id}` }],
      active: true,
    });

    await act(async () => {
      setup('/Calendar/Schedule');
    });

    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    expect(screen.getByTestId('location-pathname')).toHaveTextContent('/Calendar/Schedule');
  });

  test('renders multiple service types in ScheduleFindPane', async () => {
    vi.setSystemTime('2024-01-15');
    const scheduleWithServiceTypes = createScheduleWithServiceTypes([serviceType1, serviceType2]);
    await medplum.createResource(scheduleWithServiceTypes);

    await act(async () => {
      setup('/Calendar/Schedule/schedule-1');
    });

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
    expect(screen.getByText('Annual Checkup')).toBeInTheDocument();
    expect(screen.getByText('Follow-up Visit')).toBeInTheDocument();
  });

  test('allows selecting different service types', async () => {
    const user = userEvent.setup();
    const scheduleWithServiceTypes = createScheduleWithServiceTypes([serviceType1, serviceType2]);
    await medplum.createResource(scheduleWithServiceTypes);

    const originalGet = medplum.get.bind(medplum);
    vi.spyOn(medplum, 'get').mockImplementation((url, options) => {
      if (url.toString().includes('$find')) {
        return new ReadablePromise(
          Promise.resolve({ resourceType: 'Bundle', type: 'searchset', entry: [] } as Bundle<Slot>)
        );
      }
      return originalGet(url, options);
    });

    await act(async () => {
      setup('/Calendar/Schedule/schedule-1');
    });

    await waitFor(() => expect(screen.getByText('Annual Checkup')).toBeInTheDocument());

    await user.click(screen.getByText('Annual Checkup'));

    expect(screen.queryByText('Services')).not.toBeInTheDocument();
    expect(screen.getByText('Annual Checkup')).toBeInTheDocument();
  });
});
