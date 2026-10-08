import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../../testUtils/render';
import { PauseResumeTask } from './PauseResumeTask';

const mockPatchResource = vi.hoisted(() => vi.fn());

vi.mock('@medplum/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@medplum/react')>();
  return {
    ...actual,
    useMedplum: () => ({ patchResource: mockPatchResource }),
  };
});

describe('PauseResumeTask', () => {
  test('shows pause button for active task and submits patch', async () => {
    const onChange = vi.fn();
    mockPatchResource.mockResolvedValue({ resourceType: 'Task', id: 't1', status: 'on-hold' });

    render(
      <PauseResumeTask
        task={{ resourceType: 'Task', id: 't1', status: 'ready', intent: 'order', meta: { versionId: '1' } }}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pause Task' }));

    await waitFor(() => {
      expect(mockPatchResource).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalled();
    });
  });

  test('shows resume button for paused task', () => {
    render(
      <PauseResumeTask
        task={{ resourceType: 'Task', id: 't1', status: 'on-hold', intent: 'order' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Resume Task' })).toBeInTheDocument();
  });
});
