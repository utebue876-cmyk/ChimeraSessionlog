import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { HomerSimpson, MockClient } from '@medplum/mock';
import * as medplumReact from '@medplum/react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ExportTab } from './ExportTab';

const patientExportFormMock = vi.hoisted(() => vi.fn());

vi.mock('@medplum/react', async () => {
  const actual = await vi.importActual<typeof import('@medplum/react')>('@medplum/react');
  return {
    ...actual,
    PatientExportForm: (props: any) => {
      patientExportFormMock(props);
      return <div>Mock Patient Export Form</div>;
    },
  };
});

describe('ExportTab', () => {
  let medplum: MockClient;

  beforeEach(async () => {
    medplum = new MockClient();
    vi.clearAllMocks();
  });

  const setup = (url: string): ReturnType<typeof render> => {
    return render(
      <MemoryRouter initialEntries={[url]}>
        <medplumReact.MedplumProvider medplum={medplum}>
          <MantineProvider>
            <Notifications />
            <Routes>
              <Route path="/Patient/:patientId/export" element={<ExportTab />} />
            </Routes>
          </MantineProvider>
        </medplumReact.MedplumProvider>
      </MemoryRouter>
    );
  };

  test('Renders PatientExportForm', async () => {
    setup(`/Patient/${HomerSimpson.id}/export`);

    await waitFor(() => {
      expect(screen.getByText('Mock Patient Export Form')).toBeInTheDocument();
      expect(patientExportFormMock).toHaveBeenCalled();
    });
  });

  test('Passes correct patient reference to PatientExportForm', async () => {
    setup(`/Patient/${HomerSimpson.id}/export`);

    await waitFor(() => {
      expect(patientExportFormMock).toHaveBeenCalledWith(
        expect.objectContaining({
          patient: { reference: `Patient/${HomerSimpson.id}` },
        })
      );
    });
  });
});
