import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ProjectNotConfiguredError } from '../../config/projectOrganization';
import { render, screen } from '../../testUtils/render';
import { ProjectError } from './ProjectError';

const mockSignOut = vi.fn();
const mockClear = vi.fn();

vi.mock('@medplum/react', () => ({
  useMedplum: () => ({ signOut: mockSignOut, clear: mockClear }),
}));

describe('ProjectError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  function makeError(projectName?: string): ProjectNotConfiguredError {
    return new ProjectNotConfiguredError('proj-123', projectName);
  }

  test('shows heading, project name, and sign-in button', () => {
    render(<ProjectError error={makeError('Handl Pilot')} />);

    expect(screen.getByRole('heading', { name: /project settings are not configured/i })).toBeInTheDocument();
    expect(screen.getByText(/handl pilot/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in with a different account/i })).toBeInTheDocument();
  });

  test('falls back to project id when no project name provided', () => {
    render(<ProjectError error={makeError()} />);

    expect(screen.getByRole('heading', { name: /project settings are not configured/i })).toBeInTheDocument();
  });

  test('signs out and navigates to /signin on button click', async () => {
    mockSignOut.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<ProjectError error={makeError('Handl Pilot')} />);
    await user.click(screen.getByRole('button', { name: /sign in with a different account/i }));

    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(window.location.href).toBe('/signin');
  });

  test('clears session and still navigates when signOut throws', async () => {
    mockSignOut.mockRejectedValue(new Error('Unauthorized'));
    const user = userEvent.setup();

    render(<ProjectError error={makeError('Handl Pilot')} />);
    await user.click(screen.getByRole('button', { name: /sign in with a different account/i }));

    expect(mockClear).toHaveBeenCalledOnce();
    expect(window.location.href).toBe('/signin');
  });
});
