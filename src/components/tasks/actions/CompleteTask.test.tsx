import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../../testUtils/render';
import { CompleteTask } from './CompleteTask';

const mockPatchResource = vi.hoisted(() => vi.fn());

vi.mock('@medplum/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@medplum/react')>();
  return {
    ...actual,
    useMedplum: () => ({ patchResource: mockPatchResource }),
  };
});

describe('CompleteTask', () => {
  test('completes task when button is clicked', async () => {
    const onChange = vi.fn();
    mockPatchResource.mockResolvedValue({ resourceType: 'Task', id: 't1', status: 'completed' });

    render(
      <CompleteTask
        task={{ resourceType: 'Task', id: 't1', status: 'ready', intent: 'order', meta: { versionId: '1' } }}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Complete Task' }));

    await waitFor(() => {
      expect(mockPatchResource).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalled();
    });
  });

  test('does not show button for completed task', () => {
    render(
      <CompleteTask
        task={{ resourceType: 'Task', id: 't1', status: 'completed', intent: 'order' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: 'Complete Task' })).not.toBeInTheDocument();
  });
});
