import { MantineProvider } from '@mantine/core';
import type { Practitioner } from '@medplum/fhirtypes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { ServiceSelectionPane } from './ServiceSelectionPane';

vi.mock('@medplum/react', () => ({
  ResourceAvatar: () => <span aria-hidden="true" />,
}));

describe('ServiceSelectionPane', () => {
  test('shows loading state and empty practitioners helper text', () => {
    render(
      <MantineProvider>
        <ServiceSelectionPane
          serviceTypeOptions={[]}
          selectedServiceTypeKey={null}
          onSelectServiceType={vi.fn()}
          practitioners={[]}
          practitionersLoading={true}
          selectedPractitioner={undefined}
          onSelectPractitioner={vi.fn()}
        />
      </MantineProvider>
    );

    expect(document.querySelector('.mantine-Loader-root')).toBeInTheDocument();
  });

  test('renders all practitioners button and practitioner list when multiple practitioners', async () => {
    const user = userEvent.setup();
    const onSelectAllPractitioners = vi.fn();
    const onSelectPractitioner = vi.fn();
    const practitioners: Practitioner[] = [
      { resourceType: 'Practitioner', id: 'p1', name: [{ family: 'Smith', given: ['John'] }] },
      { resourceType: 'Practitioner', id: 'p2', name: [{ family: 'Jones', given: ['Amy'] }] },
    ];

    render(
      <MantineProvider>
        <ServiceSelectionPane
          serviceTypeOptions={[{ key: 'svc1', label: 'Service 1' }]}
          selectedServiceTypeKey={'svc1'}
          onSelectServiceType={vi.fn()}
          practitioners={practitioners as any}
          practitionersLoading={false}
          selectedPractitioner={undefined}
          onSelectPractitioner={onSelectPractitioner}
          allPractitionersSelected={false}
          onSelectAllPractitioners={onSelectAllPractitioners}
        />
      </MantineProvider>
    );

    expect(screen.getByRole('button', { name: 'All Practitioners' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'John Smith' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Amy Jones' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All Practitioners' }));
    await user.click(screen.getByRole('button', { name: 'John Smith' }));

    expect(onSelectAllPractitioners).toHaveBeenCalled();
    expect(onSelectPractitioner).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
  });

  test('shows booking hint when practitioner or all-practitioners is selected', () => {
    const practitioners: Practitioner[] = [
      { resourceType: 'Practitioner', id: 'p1', name: [{ family: 'Smith', given: ['John'] }] },
    ];

    render(
      <MantineProvider>
        <ServiceSelectionPane
          serviceTypeOptions={[{ key: 'svc1', label: 'Service 1' }]}
          selectedServiceTypeKey={'svc1'}
          onSelectServiceType={vi.fn()}
          practitioners={practitioners as any}
          practitionersLoading={false}
          selectedPractitioner={practitioners[0] as any}
          onSelectPractitioner={vi.fn()}
        />
      </MantineProvider>
    );

    expect(screen.getByText('Click a green slot on the calendar to book an appointment.')).toBeInTheDocument();
  });
});
