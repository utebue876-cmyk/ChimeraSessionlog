import { MantineProvider } from '@mantine/core';
import type { Patient } from '@medplum/fhirtypes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { PatientSidebarInfoItem } from './PatientSidebarInfoItem';

describe('PatientSidebarInfoItem', () => {
  const patient: Patient = { resourceType: 'Patient', id: 'p1' };

  test('shows placeholder when value is undefined', () => {
    render(
      <MantineProvider>
        <PatientSidebarInfoItem
          patient={patient}
          value={undefined}
          icon={<span>i</span>}
          placeholder="No value"
          label="Label"
        />
      </MantineProvider>
    );

    expect(screen.getByText('No value')).toBeInTheDocument();
  });

  test('calls onClickResource with patient when clicked', async () => {
    const user = userEvent.setup();
    const onClickResource = vi.fn();

    render(
      <MantineProvider>
        <PatientSidebarInfoItem
          patient={patient}
          value="Some value"
          icon={<span>i</span>}
          placeholder="No value"
          label="Label"
          onClickResource={onClickResource}
        />
      </MantineProvider>
    );

    await user.click(screen.getByText('Some value'));
    expect(onClickResource).toHaveBeenCalledWith(patient);
  });
});
