import type { MedplumClient } from '@medplum/core';
import { DrAliceSmith, MockClient } from '@medplum/mock';
import { MedplumProvider } from '@medplum/react';
import crypto from 'crypto';
import { MemoryRouter } from 'react-router';
import { TextEncoder } from 'util';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { App } from '../../App';
import { useProjectOrganizationStore } from '../../store/projectOrganizationStore';
import { act, fireEvent, render, screen } from '../../testUtils/render';

vi.mock('../../config/projectOrganization', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../config/projectOrganization')>()),
  fetchProjectOrganizationSettings: vi.fn().mockResolvedValue(undefined),
}));

describe('SignInPage', () => {
  function setup(url = '/signin', medplumClient?: MedplumClient): MedplumClient {
    const client = medplumClient ?? new MockClient({ profile: null, clientId: 'my-client-id' });
    render(
      <MemoryRouter initialEntries={[url]} initialIndex={0}>
        <MedplumProvider medplum={client}>
          <App />
        </MedplumProvider>
      </MemoryRouter>
    );
    return client;
  }

  beforeEach(() => {
    useProjectOrganizationStore.getState().setOrganization('iprs-health', 'IPRS Health');
  });

  beforeAll(() => {
    Object.defineProperty(global, 'TextEncoder', {
      value: TextEncoder,
    });

    Object.defineProperty(global.self, 'crypto', {
      value: crypto.webcrypto,
    });
  });

  function expectSigninPageRendered(): void {
    expect(screen.getByText('Sign in to Provider')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  }

  test('Renders', async () => {
    setup();

    expectSigninPageRendered();
  });

  test('Success', async () => {
    const client = setup();

    vi.spyOn(client, 'processCode').mockImplementation(async () => {
      (client as MockClient).setProfile(DrAliceSmith);
      return DrAliceSmith;
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'admin@example.com' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    });

    // Wait for password field to appear
    await screen.findByLabelText('Password *');

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Password *'), { target: { value: 'password' } });
    });

    const submitButton = screen.getByRole('button', { name: /Continue|Sign In/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // After successful sign-in, user is redirected into the authenticated app shell.
    expect(await screen.findByRole('button', { name: 'Search' })).toBeInTheDocument();
  });
});
