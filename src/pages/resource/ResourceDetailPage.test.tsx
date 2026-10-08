import { MantineProvider } from '@mantine/core';
import type { Practitioner } from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import { MedplumProvider } from '@medplum/react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, test } from 'vitest';
import { ResourceDetailPage } from './ResourceDetailPage';

describe('ResourceDetailPage', () => {
  const setup = (url: string): ReturnType<typeof render> => {
    const medplum = new MockClient();
    return render(
      <MemoryRouter initialEntries={[url]}>
        <MedplumProvider medplum={medplum}>
          <MantineProvider>
            <Routes>
              <Route path="/:resourceType/:id" element={<ResourceDetailPage />} />
            </Routes>
          </MantineProvider>
        </MedplumProvider>
      </MemoryRouter>
    );
  };

  test('renders the resource display name and table once loaded', async () => {
    const medplum = new MockClient();
    const practitioner = await medplum.createResource<Practitioner>({
      resourceType: 'Practitioner',
      name: [{ given: ['Jamie'], family: 'Smith' }],
    });

    render(
      <MemoryRouter initialEntries={[`/Practitioner/${practitioner.id}`]}>
        <MedplumProvider medplum={medplum}>
          <MantineProvider>
            <Routes>
              <Route path="/:resourceType/:id" element={<ResourceDetailPage />} />
            </Routes>
          </MantineProvider>
        </MedplumProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Jamie Smith/i })).toBeInTheDocument();
  });

  test('renders nothing while the resource has not resolved', () => {
    setup('/Practitioner/does-not-exist');

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
