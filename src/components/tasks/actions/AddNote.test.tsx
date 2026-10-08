import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../../testUtils/render';
import { AddNote } from './AddNote';

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
    getQuestionnaireAnswers: () => ({ 'new-comment': { valueString: 'test note' } }),
  };
});

vi.mock('@medplum/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@medplum/react')>();
  return {
    ...actual,
    useMedplum: () => ({ patchResource: mockPatchResource }),
    useMedplumProfile: () => ({ resourceType: 'Practitioner', id: 'pr-1' }),
    QuestionnaireForm: ({ onSubmit }: { onSubmit: (v: unknown) => void }) => (
      <button onClick={() => onSubmit({})}>Submit note</button>
    ),
  };
});

describe('AddNote', () => {
  test('opens modal and submits note update', async () => {
    const onChange = vi.fn();
    mockPatchResource.mockResolvedValue({ resourceType: 'Task', id: 't1' });

    render(
      <AddNote
        task={{ resourceType: 'Task', id: 't1', status: 'ready', intent: 'order', meta: { versionId: '1' } }}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add a Note' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit note' }));

    await waitFor(() => {
      expect(mockPatchResource).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalled();
    });
  });
});
