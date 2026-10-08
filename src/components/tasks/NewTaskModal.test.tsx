import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '../../testUtils/render';
import { NewTaskModal } from './NewTaskModal';

vi.mock('@medplum/react', () => ({
  CodeableConceptInput: () => <div>CodeableConceptInput</div>,
  CodeInput: () => <div>CodeInput</div>,
  ReferenceInput: () => <div>ReferenceInput</div>,
  ResourceInput: () => <div>ResourceInput</div>,
}));

const mockHandleSubmit = vi.hoisted(() => vi.fn());
const mockHandleClose = vi.hoisted(() => vi.fn());

vi.mock('./useNewTaskModal', () => ({
  useNewTaskModal: () => ({
    title: 'Task title',
    setTitle: vi.fn(),
    description: '',
    setDescription: vi.fn(),
    status: 'ready',
    setStatus: vi.fn(),
    priority: 'routine',
    setPriority: vi.fn(),
    assignee: undefined,
    setAssignee: vi.fn(),
    dueDate: undefined,
    setDueDate: vi.fn(),
    taskPatient: undefined,
    setTaskPatient: vi.fn(),
    taskCode: undefined,
    setTaskCode: vi.fn(),
    performerType: undefined,
    setPerformerType: vi.fn(),
    isSubmitting: false,
    activeEpisode: undefined,
    episodeOfCareOptions: [],
    selectedEpisodeOfCareId: null,
    setSelectedEpisodeOfCareId: vi.fn(),
    isLoadingEpisodeOfCare: false,
    patient: undefined,
    fieldErrors: {},
    handleSubmit: mockHandleSubmit,
    handleClose: mockHandleClose,
  }),
}));

describe('NewTaskModal', () => {
  test('renders form title and create button', () => {
    render(<NewTaskModal opened={true} onClose={vi.fn()} />);

    expect(screen.getByText('New Task')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Task' })).toBeInTheDocument();
  });

  test('invokes submit handler when clicking create button', () => {
    render(<NewTaskModal opened={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Create Task' }));
    expect(mockHandleSubmit).toHaveBeenCalled();
  });
});
