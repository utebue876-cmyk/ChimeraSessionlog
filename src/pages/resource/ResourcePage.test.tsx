import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { Practitioner } from '@medplum/fhirtypes';
import { MockClient } from '@medplum/mock';
import { ErrorBoundary, Loading, MedplumProvider } from '@medplum/react';
import { Suspense } from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { App } from '../../App';
import { useProjectOrganizationStore } from '../../store/projectOrganizationStore';
import { act, render, screen } from '../../testUtils/render';

vi.mock('../../config/projectOrganization', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../config/projectOrganization')>()),
  fetchProjectOrganizationSettings: vi.fn().mockResolvedValue(undefined),
}));

describe('ResourcePage', () => {
  let medplum: MockClient;

  beforeEach(() => {
    medplum = new MockClient();
    useProjectOrganizationStore.getState().setOrganization('iprs-health', 'IPRS Health');
  });

  async function setup(url: string): Promise<void> {
    await act(async () => {
      render(
        <MedplumProvider medplum={medplum}>
          <MemoryRouter initialEntries={[url]} initialIndex={0}>
            <MantineProvider>
              <Notifications />
              <ErrorBoundary>
                <Suspense fallback={<Loading />}>
                  <App />
                </Suspense>
              </ErrorBoundary>
            </MantineProvider>
          </MemoryRouter>
        </MedplumProvider>
      );
    });
  }

  test('Details tab renders', async () => {
    const practitioner = await medplum.createResource<Practitioner>({
      resourceType: 'Practitioner',
      name: [{ family: 'Test', given: ['John'] }],
      gender: 'male',
    });

    await setup(`/Practitioner/${practitioner.id}`);
    expect((await screen.findAllByText('Name'))[0]).toBeInTheDocument();
    expect(screen.getByText('Gender')).toBeInTheDocument();
  });
});
