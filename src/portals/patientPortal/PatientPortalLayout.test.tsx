import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '../../testUtils/render';
import { PatientPortalLayout } from './PatientPortalLayout';

const mockSignOut = vi.fn();
const mockClear = vi.fn();

vi.mock('@medplum/react', () => ({
  useMedplum: () => ({ signOut: mockSignOut, clear: mockClear }),
}));

describe('PatientPortalLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', { value: { href: '' }, writable: true });
  });

  test('renders children', () => {
    render(
      <PatientPortalLayout>
        <p>Child content</p>
      </PatientPortalLayout>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  test('shows Chimera Patient Portal title', () => {
    render(
      <PatientPortalLayout>
        <div />
      </PatientPortalLayout>
    );
    expect(screen.getByText('Chimera Patient Portal')).toBeInTheDocument();
  });

  test('shows IPRS Health logo', () => {
    render(
      <PatientPortalLayout>
        <div />
      </PatientPortalLayout>
    );
    expect(screen.getByAltText('IPRS Health')).toBeInTheDocument();
  });

  test('shows Sign out button', () => {
    render(
      <PatientPortalLayout>
        <div />
      </PatientPortalLayout>
    );
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  test('calls medplum.signOut() when Sign out is clicked', async () => {
    mockSignOut.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <PatientPortalLayout>
        <div />
      </PatientPortalLayout>
    );
    await user.click(screen.getByRole('button', { name: /sign out/i }));

    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  test('navigates to /signin after successful sign out', async () => {
    mockSignOut.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <PatientPortalLayout>
        <div />
      </PatientPortalLayout>
    );
    await user.click(screen.getByRole('button', { name: /sign out/i }));

    expect(window.location.href).toBe('/signin');
  });

  test('calls medplum.clear() and still navigates when signOut throws', async () => {
    mockSignOut.mockRejectedValue(new Error('Unauthorized'));
    const user = userEvent.setup();

    render(
      <PatientPortalLayout>
        <div />
      </PatientPortalLayout>
    );
    await user.click(screen.getByRole('button', { name: /sign out/i }));

    expect(mockClear).toHaveBeenCalledOnce();
    expect(window.location.href).toBe('/signin');
  });
});
