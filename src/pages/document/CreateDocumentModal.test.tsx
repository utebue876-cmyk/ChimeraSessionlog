import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { CreateDocumentModal } from './CreateDocumentModal';

const hookState = vi.hoisted(() => ({
  file: null,
  setFile: vi.fn(),
  description: 'Initial description',
  setDescription: vi.fn(),
  documentType: undefined,
  setDocumentType: vi.fn(),
  status: 'current',
  setStatus: vi.fn(),
  docStatus: 'final',
  setDocStatus: vi.fn(),
  isLoading: false,
  resetRef: { current: null },
  activeEpisodeLabel: 'MH-1001',
  fieldErrors: {},
  handleSubmit: vi.fn(),
  handleCancel: vi.fn(),
}));

const documentFormSpy = vi.hoisted(() => vi.fn());

vi.mock('./useCreateDocumentModal', () => ({
  useCreateDocumentModal: () => hookState,
}));

vi.mock('../../components/modal/AppModal', () => ({
  AppModal: ({ opened, title, children }: any) =>
    opened ? (
      <div role="dialog">
        <div>{title}</div>
        {children}
      </div>
    ) : null,
}));

vi.mock('../../components/document/DocumentForm', () => ({
  DocumentForm: (props: any) => {
    documentFormSpy(props);
    return <div>Document Form Mock</div>;
  },
}));

describe('CreateDocumentModal', () => {
  test('renders title and passes create mode props to DocumentForm', () => {
    render(
      <MantineProvider>
        <CreateDocumentModal opened={true} onClose={vi.fn()} />
      </MantineProvider>
    );

    expect(screen.getByText('New Document')).toBeInTheDocument();
    expect(screen.getByText('Document Form Mock')).toBeInTheDocument();

    const formProps = documentFormSpy.mock.calls.at(-1)?.[0];
    expect(formProps?.mode).toBe('create');
    expect(formProps?.description).toBe('Initial description');
    expect(formProps?.activeEpisodeLabel).toBe('MH-1001');
    expect(formProps?.handleSubmit).toBe(hookState.handleSubmit);
    expect(formProps?.handleCancel).toBe(hookState.handleCancel);
  });
});
