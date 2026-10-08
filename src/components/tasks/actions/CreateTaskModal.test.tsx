import type { Resource } from '@medplum/fhirtypes';
import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../../testUtils/render';
import { CreateTaskModal } from './CreateTaskModal';

const mockCreateResource = vi.hoisted(() => vi.fn());
const mockNavigate = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/Task' }),
  };
});

vi.mock('@medplum/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@medplum/react')>();
  return {
    ...actual,
    useMedplum: () => ({ createResource: mockCreateResource }),
    ResourceForm: ({ onSubmit, defaultValue }: { onSubmit: (r: Resource) => void; defaultValue: Resource }) => (
      <button type="button" onClick={() => onSubmit({ ...defaultValue, id: 'new-task' })}>
        Submit
      </button>
    ),
  };
});

describe('CreateTaskModal', () => {
  test('renders modal heading from path resource type', () => {
    render(<CreateTaskModal opened={true} onClose={vi.fn()} />);
    expect(screen.getByText('New Task')).toBeInTheDocument();
  });

  test('creates a resource and navigates to it on submit', async () => {
    mockCreateResource.mockResolvedValue({ resourceType: 'Task', id: 'new-task' });
    render(<CreateTaskModal opened={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(mockCreateResource).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/Task/new-task');
    });
  });
});
