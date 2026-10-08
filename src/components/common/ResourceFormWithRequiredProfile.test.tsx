import type { Resource } from '@medplum/fhirtypes';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../testUtils/render';
import { ResourceFormWithRequiredProfile } from './ResourceFormWithRequiredProfile';

const mockRequestProfileSchema = vi.hoisted(() => vi.fn());
const mockTryGetProfile = vi.hoisted(() => vi.fn());
const mockAddProfileToResource = vi.hoisted(() => vi.fn());

vi.mock('@medplum/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@medplum/core')>();
  return {
    ...actual,
    tryGetProfile: mockTryGetProfile,
    addProfileToResource: mockAddProfileToResource,
    normalizeErrorString: (err: unknown) => String((err as Error)?.message ?? err),
  };
});

vi.mock('@medplum/react', () => ({
  useMedplum: () => ({ requestProfileSchema: mockRequestProfileSchema }),
  Loading: () => <div>Loading profile...</div>,
  ResourceForm: ({ onSubmit }: { onSubmit: (resource: Resource) => void }) => (
    <button type="button" onClick={() => onSubmit({ resourceType: 'Patient', id: 'patient-1' })}>
      Submit mock form
    </button>
  ),
}));

describe('ResourceFormWithRequiredProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequestProfileSchema.mockResolvedValue(undefined);
    mockTryGetProfile.mockReturnValue({ name: 'PatientProfile' });
  });

  test('renders ResourceForm and adds profile before submit', async () => {
    const onSubmit = vi.fn();
    mockAddProfileToResource.mockImplementation((resource: Resource, profileUrl: string) => {
      resource.meta = { ...(resource.meta ?? {}), profile: [profileUrl] };
    });

    render(
      <ResourceFormWithRequiredProfile
        defaultValue={{ resourceType: 'Patient' }}
        profileUrl="http://example.org/Profile"
        onSubmit={onSubmit}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submit mock form' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit mock form' }));

    expect(mockAddProfileToResource).toHaveBeenCalledWith(
      expect.objectContaining({ resourceType: 'Patient', id: 'patient-1' }),
      'http://example.org/Profile'
    );
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceType: 'Patient',
        id: 'patient-1',
        meta: { profile: ['http://example.org/Profile'] },
      })
    );
  });

  test('renders not found alert when profile cannot be loaded', async () => {
    mockRequestProfileSchema.mockRejectedValue(new Error('profile missing'));
    mockTryGetProfile.mockReturnValue(undefined);

    render(
      <ResourceFormWithRequiredProfile
        defaultValue={{ resourceType: 'Patient' }}
        profileUrl="http://example.org/Profile"
        missingProfileMessage="Profile is required"
        onSubmit={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Not found')).toBeInTheDocument();
    });

    expect(screen.getByText('Profile is required')).toBeInTheDocument();
    expect(screen.getByText('Server error: profile missing')).toBeInTheDocument();
  });
});
