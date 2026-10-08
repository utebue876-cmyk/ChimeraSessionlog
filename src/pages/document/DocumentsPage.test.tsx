import { MantineProvider } from '@mantine/core';
import type { DocumentReference, EpisodeOfCare, Practitioner } from '@medplum/fhirtypes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { EOC_CASE_STATE_URL } from '../../config/chimera-urls';
import { DocumentsPage } from './DocumentsPage';

type Item = { document: DocumentReference; author?: Practitioner };

const pageState = vi.hoisted(() => ({
  loading: false,
  documents: [] as Item[],
  currentPage: 1,
  setCurrentPage: vi.fn(),
  totalPages: 1,
  activeEpisode: undefined as EpisodeOfCare | undefined,
  reload: vi.fn(),
}));

const sortState = vi.hoisted(() => ({
  sorted: [] as Item[],
  sortCol: undefined,
  sortDir: undefined,
  handleSort: vi.fn(),
}));

const createModalSpy = vi.hoisted(() => vi.fn());
const editModalSpy = vi.hoisted(() => vi.fn());

vi.mock('./useDocumentsPage', () => ({
  useDocumentsPage: () => pageState,
}));

vi.mock('../../hooks/useSortResults', () => ({
  useSortResults: () => sortState,
  SortIcon: () => <span data-testid="sort-icon" />,
}));

vi.mock('./CreateDocumentModal', () => ({
  CreateDocumentModal: (props: any) => {
    createModalSpy(props);
    return props.opened ? <button onClick={props.onClose}>Close Create Modal</button> : null;
  },
}));

vi.mock('./EditDocumentModal', () => ({
  EditDocumentModal: (props: any) => {
    editModalSpy(props);
    return props.opened ? <div>Edit Modal Open</div> : null;
  },
}));

describe('DocumentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pageState.loading = false;
    pageState.documents = [];
    pageState.currentPage = 1;
    pageState.totalPages = 1;
    pageState.activeEpisode = undefined;
    sortState.sorted = [];
  });

  test('disables new document button when there is no active case', () => {
    render(
      <MantineProvider>
        <DocumentsPage />
      </MantineProvider>
    );

    expect(screen.getByRole('button', { name: 'New document' })).toBeDisabled();
    expect(screen.getByText('0 documents')).toBeInTheDocument();
  });

  test('renders documents and opens edit modal when row clicked', async () => {
    const user = userEvent.setup();
    const activeEpisode: EpisodeOfCare = {
      resourceType: 'EpisodeOfCare',
      id: 'ep-1',
      status: 'active',
      patient: { reference: 'Patient/p1' },
      identifier: [{ value: 'MH-123' }],
      extension: [{ url: EOC_CASE_STATE_URL, valueCoding: { code: 'intake', display: 'Intake' } }],
    };
    const items: Item[] = [
      {
        document: {
          resourceType: 'DocumentReference',
          id: 'doc-1',
          status: 'current',
          docStatus: 'final',
          date: '2026-01-01T10:00:00.000Z',
          subject: { reference: 'Patient/p1', display: 'Jane Doe' },
          type: { text: 'Clinical Note' },
          description: 'Session summary',
          content: [{ attachment: { title: 'summary.pdf', url: 'https://example.com/summary.pdf' } }],
        },
        author: {
          resourceType: 'Practitioner',
          id: 'pr-1',
          name: [{ family: 'House', given: ['Gregory'] }],
        },
      },
    ];

    pageState.activeEpisode = activeEpisode;
    pageState.documents = items;
    sortState.sorted = items;

    render(
      <MantineProvider>
        <DocumentsPage />
      </MantineProvider>
    );

    expect(screen.getByText('Case ID:')).toBeInTheDocument();
    expect(screen.getByText('MH-123')).toBeInTheDocument();
    expect(screen.getByText('1 document')).toBeInTheDocument();
    expect(screen.getByText('Session summary')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'summary.pdf' })).toBeInTheDocument();

    await user.click(screen.getByText('Session summary'));

    expect(screen.getByText('Edit Modal Open')).toBeInTheDocument();
  });

  test('does not open edit modal when content link is clicked', async () => {
    const user = userEvent.setup();
    const activeEpisode: EpisodeOfCare = {
      resourceType: 'EpisodeOfCare',
      id: 'ep-1',
      status: 'active',
      patient: { reference: 'Patient/p1' },
      identifier: [{ value: 'MH-123' }],
      extension: [{ url: EOC_CASE_STATE_URL, valueCoding: { code: 'intake', display: 'Intake' } }],
    };
    const items: Item[] = [
      {
        document: {
          resourceType: 'DocumentReference',
          id: 'doc-1',
          status: 'current',
          docStatus: 'final',
          date: '2026-01-01T10:00:00.000Z',
          subject: { reference: 'Patient/p1', display: 'Jane Doe' },
          type: { text: 'Clinical Note' },
          description: 'Session summary',
          content: [{ attachment: { title: 'summary.pdf', url: 'https://example.com/summary.pdf' } }],
        },
      },
    ];

    pageState.activeEpisode = activeEpisode;
    pageState.documents = items;
    sortState.sorted = items;

    render(
      <MantineProvider>
        <DocumentsPage />
      </MantineProvider>
    );

    await user.click(screen.getByRole('link', { name: 'summary.pdf' }));

    expect(screen.queryByText('Edit Modal Open')).not.toBeInTheDocument();
  });

  test('opens create modal and reloads on close', async () => {
    const user = userEvent.setup();
    pageState.activeEpisode = {
      resourceType: 'EpisodeOfCare',
      id: 'ep-2',
      status: 'active',
      patient: { reference: 'Patient/p1' },
      extension: [{ url: EOC_CASE_STATE_URL, valueCoding: { code: 'intake', display: 'Intake' } }],
    };

    render(
      <MantineProvider>
        <DocumentsPage />
      </MantineProvider>
    );

    const newButton = screen.getByRole('button', { name: 'New document' });
    expect(newButton).toBeEnabled();
    await user.click(newButton);

    expect(screen.getByRole('button', { name: 'Close Create Modal' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close Create Modal' }));

    expect(pageState.reload).toHaveBeenCalled();
  });
});
