import type { Task } from '@medplum/fhirtypes';
import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '../../../testUtils/render';
import { TaskActions } from './TaskActions';

const mockUseResource = vi.hoisted(() => vi.fn());

vi.mock('@medplum/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@medplum/react')>();
  return {
    ...actual,
    useResource: mockUseResource,
    Loading: () => <div>Loading...</div>,
  };
});

vi.mock('./AddNote', () => ({ AddNote: () => <div>AddNote</div> }));
vi.mock('./AddDueDate', () => ({ AddDueDate: () => <div>AddDueDate</div> }));
vi.mock('./UpdateBusinessStatus', () => ({ UpdateBusinessStatus: () => <div>UpdateBusinessStatus</div> }));
vi.mock('./AssignTask', () => ({ AssignTask: () => <div>AssignTask</div> }));
vi.mock('./AssignRole', () => ({ AssignRole: () => <div>AssignRole</div> }));
vi.mock('./ClaimTask', () => ({ ClaimTask: () => <div>ClaimTask</div> }));
vi.mock('./PauseResumeTask', () => ({ PauseResumeTask: () => <div>PauseResumeTask</div> }));
vi.mock('./CompleteTask', () => ({ CompleteTask: () => <div>CompleteTask</div> }));
vi.mock('./DeleteTask', () => ({ DeleteTask: () => <div>DeleteTask</div> }));

describe('TaskActions', () => {
  test('renders loading state when task resource is not available', () => {
    mockUseResource.mockReturnValue(undefined);
    render(<TaskActions task={{ resourceType: 'Task', status: 'ready', intent: 'order' }} onChange={vi.fn()} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('renders task action components and claim action when owner is missing', () => {
    mockUseResource.mockReturnValue({ resourceType: 'Task', status: 'ready', intent: 'order' } as Task);
    render(<TaskActions task={{ resourceType: 'Task', status: 'ready', intent: 'order' }} onChange={vi.fn()} />);

    expect(screen.getByText('ClaimTask')).toBeInTheDocument();
    expect(screen.getByText('CompleteTask')).toBeInTheDocument();
  });
});
