import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../../testUtils/render';
import { AssignTask } from './AssignTask';

const mockPatchResource = vi.hoisted(() => vi.fn());

vi.mock('../../modal/AppModal', () => ({
  AppModal: ({ opened, children, title }: { opened: boolean; children: ReactNode; title?: ReactNode }) =>
    opened ? (
      <div>
        <div>{title}</div>
        {children}
      </div>
    ) : null,
}));

vi.mock('@medplum/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@medplum/core')>();
  return {
    ...actual,
    getQuestionnaireAnswers: () => ({ owner: { valueReference: { reference: 'Practitioner/pr-1' } } }),
  };
});

vi.mock('@medplum/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@medplum/react')>();
  return {
    ...actual,
    useMedplum: () => ({ patchResource: mockPatchResource }),
    QuestionnaireForm: ({ onSubmit }: { onSubmit: (v: unknown) => void }) => (
      <button onClick={() => onSubmit({})}>Submit assignee</button>
    ),
  };
});

describe('AssignTask', () => {
  test('submits owner assignment', async () => {
    const onChange = vi.fn();
    mockPatchResource.mockResolvedValue({ resourceType: 'Task', id: 't1' });

    render(
      <AssignTask
        task={{ resourceType: 'Task', id: 't1', status: 'ready', intent: 'order', meta: { versionId: '1' } }}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Assign Task' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit assignee' }));

    await waitFor(() => {
      expect(mockPatchResource).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalled();
    });
  });
});
