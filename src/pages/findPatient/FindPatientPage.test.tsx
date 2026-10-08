import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { Patient } from '@medplum/fhirtypes';
import { HomerSimpson, MockClient } from '@medplum/mock';
import { MedplumProvider } from '@medplum/react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { FindPatientPage } from './FindPatientPage';

type PatientWithId = Patient & { id: string };

async function setup(medplum = new MockClient()): Promise<MockClient> {
  await act(async () => {
    render(
      <MedplumProvider medplum={medplum}>
        <MemoryRouter initialEntries={['/findPatient']}>
          <MantineProvider>
            <Notifications />
            <Routes>
              <Route path="/findPatient" element={<FindPatientPage />} />
              <Route path="/Patient/:patientId/case" element={<div>Patient Case</div>} />
              <Route path="/Patient" element={<div>Patient List</div>} />
            </Routes>
          </MantineProvider>
        </MemoryRouter>
      </MedplumProvider>
    );
  });

  return medplum;
}

describe('FindPatientPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('renders the find patient page and auto-opens the search modal', async () => {
    await setup();

    expect(screen.getByRole('heading', { name: 'Patient Search', level: 3 })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Search for patients by Case ID or MRN, or a mixture of Name, Date of Birth and Gender. The more information you provide, the more accurate your search results will be.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Case ID')).toBeInTheDocument();
    expect(screen.getByLabelText('MRN')).toBeInTheDocument();
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    expect(screen.getByLabelText('DOB')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Gender').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Find' })).toBeInTheDocument();
  });

  test('shows matching patients when more than one patient is found', async () => {
    const medplum = await setup();
    const homerPatient: PatientWithId = HomerSimpson as PatientWithId;
    const secondPatient: PatientWithId = {
      ...homerPatient,
      id: 'patient-456',
      name: [{ family: 'Simpson', given: ['Marge'] }],
    };

    vi.spyOn(medplum, 'searchResources').mockResolvedValue([homerPatient, secondPatient] as never);

    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Simpson' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find' }));

    await waitFor(() => {
      expect(screen.getByText('2 matching patients found')).toBeInTheDocument();
    });

    expect(screen.getByText('Simpson, Homer')).toBeInTheDocument();
    expect(screen.getByText('Simpson, Marge')).toBeInTheDocument();
  });

  test('navigates to the patient case when exactly one patient is found', async () => {
    const medplum = await setup();
    const homerPatient: PatientWithId = HomerSimpson as PatientWithId;
    vi.spyOn(medplum, 'searchResources').mockResolvedValue([homerPatient] as never);

    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Simpson' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find' }));

    await waitFor(() => {
      expect(screen.getByText('Patient Case')).toBeInTheDocument();
    });
  });

  test('searches MRN using identifier token formats', async () => {
    const medplum = await setup();
    const searchSpy = vi.spyOn(medplum, 'searchResources').mockResolvedValue([] as never);

    fireEvent.change(screen.getByLabelText('MRN'), { target: { value: '12345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find' }));

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalled();
    });

    const [, params] = searchSpy.mock.calls[0];
    expect(params).toEqual(
      expect.arrayContaining([['identifier', '12345,|12345,http://hl7.org/fhir/sid/us-ssn|12345']])
    );
  });
});
