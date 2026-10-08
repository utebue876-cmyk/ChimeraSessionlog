import { MantineProvider } from '@mantine/core';
import type { Patient } from '@medplum/fhirtypes';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as reactRouter from 'react-router';
import { MemoryRouter } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { PatientSidebar } from './PatientSidebar';

const medplumState = vi.hoisted(() => ({
  readHistory: vi.fn(),
}));

vi.mock('@medplum/react-hooks', () => ({
  useMedplum: () => medplumState,
  useResource: (v: any) => v,
}));

vi.mock('@medplum/react', () => ({
  ResourceAvatar: () => <span>Avatar</span>,
}));

vi.mock('../../hooks/usePatientSidebarData', () => ({
  usePatientSidebarData: () => ({
    sectionData: [{}, {}],
    loading: false,
    error: null,
  }),
}));

describe('PatientSidebar', () => {
  test('renders patient name, custom sections, navigates on edit click and calls onClickResource on avatar click', async () => {
    const user = userEvent.setup();
    const onClickResource = vi.fn();
    const navigateSpy = vi.fn();
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigateSpy as any);
    const patient: Patient = {
      resourceType: 'Patient',
      id: 'p1',
      name: [{ family: 'Doe', given: ['Jane'] }],
    };
    medplumState.readHistory.mockResolvedValue({
      entry: [{ resource: { meta: { lastUpdated: '2026-01-01T00:00:00Z' } } }],
    });

    const sections = [
      {
        key: 's1',
        title: 'S1',
        component: () => <div>Section One</div>,
      },
    ] as any;

    render(
      <MemoryRouter>
        <MantineProvider>
          <PatientSidebar patient={patient} onClickResource={onClickResource} sections={sections} />
        </MantineProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Section One')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Patient since/)).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Edit patient'));
    expect(navigateSpy).toHaveBeenCalledWith('/Patient/p1/edit-patient');
    expect(onClickResource).not.toHaveBeenCalled();

    await user.click(screen.getByText('Jane Doe'));
    expect(onClickResource).toHaveBeenCalledWith(patient);
  });
});
