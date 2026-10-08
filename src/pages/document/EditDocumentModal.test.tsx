import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { EditDocumentModal } from './EditDocumentModal';

const hookState = vi.hoisted(() => ({
  initialDocument: {
    resourceType: 'DocumentReference',
    status: 'current',
    content: [{ attachment: { title: 'existing.pdf', url: 'https://example.com/existing.pdf' } }],
    type: { text: 'Clinical Note' },
  },
  loadingDocument: false,
  file: null,
  setFile: vi.fn(),
  description: 'Existing description',
  setDescription: vi.fn(),
  documentType: undefined,
  setDocumentType: vi.fn(),
  status: 'current',
  setStatus: vi.fn(),
  docStatus: 'final',
  setDocStatus: vi.fn(),
  isLoading: false,
  resetRef: { current: null },
  fieldErrors: {},
  handleSubmit: vi.fn(),
  handleCancel: vi.fn(),
  handleDelete: vi.fn(),
}));

const documentFormSpy = vi.hoisted(() => vi.fn());

vi.mock('./useEditDocumentModal', () => ({
  useEditDocumentModal: () => hookState,
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

describe('EditDocumentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.loadingDocument = false;
  });

  test('shows loader and hides form while loading document', () => {
    hookState.loadingDocument = true;

    render(
      <MantineProvider>
        <EditDocumentModal opened={true} documentId="doc-1" onClose={vi.fn()} />
      </MantineProvider>
    );

    expect(screen.getByText('Edit Document')).toBeInTheDocument();
    expect(document.querySelector('.mantine-LoadingOverlay-root')).toBeInTheDocument();
    expect(screen.queryByText('Document Form Mock')).not.toBeInTheDocument();
  });

  test('renders form in edit mode with existing file name when loaded', () => {
    render(
      <MantineProvider>
        <EditDocumentModal opened={true} documentId="doc-1" onClose={vi.fn()} />
      </MantineProvider>
    );

    expect(screen.getByText('Document Form Mock')).toBeInTheDocument();

    const formProps = documentFormSpy.mock.calls.at(-1)?.[0];
    expect(formProps?.mode).toBe('edit');
    expect(formProps?.description).toBe('Existing description');
    expect(formProps?.existingFileName).toBe('existing.pdf');
    expect(formProps?.handleSubmit).toBe(hookState.handleSubmit);
    expect(formProps?.handleDelete).toBe(hookState.handleDelete);
  });
});
