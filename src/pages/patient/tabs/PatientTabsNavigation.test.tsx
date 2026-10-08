import { MantineProvider } from '@mantine/core';
import { MockClient } from '@medplum/mock';
import { MedplumProvider } from '@medplum/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { PatientTabsNavigation } from './PatientTabsNavigation';

describe('PatientTabsNavigation', () => {
  test('renders tabs and triggers onTabChange', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    const medplum = new MockClient();

    render(
      <MedplumProvider medplum={medplum}>
        <MantineProvider>
          <PatientTabsNavigation
            tabs={[
              { id: 'timeline', label: 'Timeline', url: '/timeline' },
              { id: 'case', label: 'Case', url: '/case' },
            ]}
            currentTab="timeline"
            patientId="patient-1"
            onTabChange={onTabChange}
          />
        </MantineProvider>
      </MedplumProvider>
    );

    expect(screen.getByRole('tab', { name: 'Timeline' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Case' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Case' }));
    expect(onTabChange).toHaveBeenCalledWith('case');
  });
});
