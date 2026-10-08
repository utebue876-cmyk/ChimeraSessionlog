import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '../../testUtils/render';
import { DocumentForm } from './DocumentForm';

vi.mock('@medplum/react', () => ({
  CodeableConceptInput: () => <div>Type input</div>,
  CodeInput: () => <div>Code input</div>,
}));

vi.mock('../modal/AppModal', () => ({
  AppModal: ({ opened, title, children }: { opened: boolean; title: ReactNode; children: ReactNode }) =>
    opened ? (
      <div>
        <div>{title}</div>
        {children}
      </div>
    ) : null,
}));

const baseProps = {
  mode: 'create' as const,
  file: null,
  setFile: vi.fn(),
  description: '',
  setDescription: vi.fn(),
  documentTypeDefaultValue: undefined,
  setDocumentType: vi.fn(),
  status: 'current' as const,
  setStatus: vi.fn(),
  docStatus: 'final' as const,
  setDocStatus: vi.fn(),
  isLoading: false,
  resetRef: { current: null },
  fieldErrors: {},
  handleSubmit: vi.fn(() => Promise.resolve()),
  handleCancel: vi.fn(),
};

describe('DocumentForm', () => {
  test('renders upload action in create mode and triggers submit', () => {
    const handleSubmit = vi.fn(() => Promise.resolve());
    render(<DocumentForm {...baseProps} handleSubmit={handleSubmit} />);

    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    expect(handleSubmit).toHaveBeenCalled();
  });

  test('renders delete confirmation modal and calls delete handler', async () => {
    const handleDelete = vi.fn(() => Promise.resolve());
    render(<DocumentForm {...baseProps} mode="edit" handleDelete={handleDelete} existingFileName="old.pdf" />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Delete Document')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1]);
    expect(handleDelete).toHaveBeenCalled();
  });
});
