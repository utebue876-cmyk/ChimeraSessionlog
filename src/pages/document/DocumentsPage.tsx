import {
  ActionIcon,
  Badge,
  Center,
  Group,
  LoadingOverlay,
  Pagination,
  Paper,
  Stack,
  Table,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { formatCodeableConcept, formatHumanName } from '@medplum/core';
import { IconPlus } from '@tabler/icons-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { SortIcon } from '../../components/common/SortIcon';
import { useSortResults } from '../../hooks/useSortResults';
import { getCaseStatus } from '../../utils/episodeOfCareUtils';
import { getDocRefDocStatusColor, getDocRefStatusColor } from '../../utils/statusColors';
import { formatDateTimeHhMm } from '../../utils/timeUtils';
import { CreateDocumentModal } from './CreateDocumentModal';
import { EditDocumentModal } from './EditDocumentModal';
import type { DocumentListItem } from './useDocumentsPage';
import { useDocumentsPage } from './useDocumentsPage';

const PAGE_SIZE = 20;

type SortColumn = 'date' | 'status' | 'description' | 'author' | 'type' | 'docStatus' | 'subject';

function getSortValue(item: DocumentListItem, col: SortColumn): string {
  const doc = item.document;
  switch (col) {
    case 'date':
      return doc.date ?? '';
    case 'status':
      return doc.status ?? '';
    case 'description':
      return doc.description ?? '';
    case 'author':
      return item.author?.name?.[0] ? formatHumanName(item.author.name[0]) : (doc.author?.[0]?.display ?? '');
    case 'type':
      return formatCodeableConcept(doc.type) ?? '';
    case 'docStatus':
      return doc.docStatus ?? '';
    case 'subject':
      return doc.subject?.display ?? doc.subject?.reference ?? '';
  }
}

export function DocumentsPage(): JSX.Element {
  const { loading, documents, currentPage, setCurrentPage, totalPages, activeEpisode, reload } =
    useDocumentsPage(PAGE_SIZE);
  const [createOpened, setCreateOpened] = useState(false);
  const [editDocumentId, setEditDocumentId] = useState<string | undefined>();

  const {
    sorted: allSorted,
    sortCol,
    sortDir,
    handleSort,
  } = useSortResults<DocumentListItem, SortColumn>(documents, getSortValue, () => setCurrentPage(1));

  const sortedDocuments = allSorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const headerStyle: React.CSSProperties = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };

  const ColHeader = ({ col, label }: { col: SortColumn; label: string }): JSX.Element => (
    <UnstyledButton onClick={() => handleSort(col)} style={headerStyle}>
      <Group gap={4} wrap="nowrap">
        {label}
        <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
      </Group>
    </UnstyledButton>
  );

  return (
    <>
      <Paper shadow="xs" m="xs" p="md">
        <Stack gap="lg" pos="relative">
          <Group justify="space-between" align="flex-end">
            <div>
              <Text size="sm" mt={10}>
                Case ID:
                <span style={{ marginLeft: 5, fontWeight: 700 }}>{activeEpisode?.identifier?.[0]?.value}</span>
              </Text>
            </div>
            <Tooltip label="New document">
              <ActionIcon
                variant="subtle"
                onClick={() => setCreateOpened(true)}
                aria-label="New document"
                color="var(--mantine-color-blue-6)"
                disabled={!activeEpisode || getCaseStatus(activeEpisode).toLowerCase() === 'closed'}
              >
                <IconPlus size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <LoadingOverlay visible={loading} />
          <Stack gap="xs">
            <Text size="sm" c="var(--mantine-color-blue-4)">
              {documents.length} document{documents.length !== 1 ? 's' : ''}
            </Text>
            <Table highlightOnHover withRowBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    <ColHeader col="date" label="Date" />
                  </Table.Th>
                  <Table.Th>
                    <ColHeader col="subject" label="Subject" />
                  </Table.Th>
                  <Table.Th>
                    <ColHeader col="status" label="Status" />
                  </Table.Th>
                  <Table.Th>
                    <ColHeader col="type" label="Type" />
                  </Table.Th>
                  <Table.Th>
                    <ColHeader col="description" label="Description" />
                  </Table.Th>
                  <Table.Th>
                    <ColHeader col="author" label="Author" />
                  </Table.Th>
                  <Table.Th>Content</Table.Th>
                  <Table.Th>
                    <ColHeader col="docStatus" label="Doc Status" />
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sortedDocuments.map((item, index) => {
                  const doc = item.document;
                  const authorDisplay = item.author?.name?.[0]
                    ? formatHumanName(item.author.name[0])
                    : (doc.author?.[0]?.display ?? '—');
                  const contentAttachment = doc.content?.[0]?.attachment;
                  const contentDisplay =
                    contentAttachment?.title ?? contentAttachment?.url ?? contentAttachment?.contentType ?? '—';

                  return (
                    <Table.Tr
                      key={doc.id ?? index}
                      style={{ cursor: 'pointer' }}
                      onClick={() => doc.id && setEditDocumentId(doc.id)}
                    >
                      <Table.Td>{doc.date ? formatDateTimeHhMm(doc.date) : '—'}</Table.Td>
                      <Table.Td>{doc.subject?.display ?? doc.subject?.reference ?? '—'}</Table.Td>
                      <Table.Td>
                        <Badge size="sm" color={getDocRefStatusColor(doc.status)} variant="light">
                          {doc.status ?? '—'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{formatCodeableConcept(doc.type) || '—'}</Table.Td>
                      <Table.Td>{doc.description ?? '—'}</Table.Td>
                      <Table.Td>{authorDisplay}</Table.Td>
                      <Table.Td onClick={(e) => e.stopPropagation()}>
                        {contentAttachment?.url ? (
                          <Text
                            component="a"
                            href={contentAttachment.url}
                            target="_blank"
                            rel="noreferrer"
                            size="sm"
                            c="blue"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {contentDisplay}
                          </Text>
                        ) : (
                          contentDisplay
                        )}
                      </Table.Td>
                      <Table.Td>
                        {doc.docStatus ? (
                          <Badge size="sm" color={getDocRefDocStatusColor(doc.docStatus)} variant="light">
                            {doc.docStatus}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
            <Center mt="sm">
              <Pagination value={currentPage} onChange={setCurrentPage} total={totalPages} />
            </Center>
          </Stack>
        </Stack>
      </Paper>
      <CreateDocumentModal
        opened={createOpened}
        onClose={() => {
          setCreateOpened(false);
          reload();
        }}
      />
      <EditDocumentModal
        opened={!!editDocumentId}
        documentId={editDocumentId}
        onClose={() => setEditDocumentId(undefined)}
      />
    </>
  );
}
