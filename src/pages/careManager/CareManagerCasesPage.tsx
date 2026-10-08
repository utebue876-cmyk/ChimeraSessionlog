import {
  Badge,
  Center,
  Group,
  LoadingOverlay,
  Pagination,
  Paper,
  Stack,
  Table,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { formatDate } from '@medplum/core';
import type { JSX } from 'react';
import { SortIcon } from '../../components/common/SortIcon';
import { useSortResults } from '../../hooks/useSortResults';
import { getCaseStatusColor } from '../../utils/statusColors';
import { CaseRow, CaseSortColumn, getCaseSortValue, useCareManagerCases } from './useCareManagerCases';

const PAGE_SIZE = 20;

export function CareManagerCasesPage(): JSX.Element {
  const { loading, cases, currentPage, setCurrentPage, handleOpenCase } = useCareManagerCases();

  const {
    sorted: allSorted,
    sortCol,
    sortDir,
    handleSort,
  } = useSortResults<CaseRow, CaseSortColumn>(cases, getCaseSortValue, () => setCurrentPage(1));

  const totalPages = Math.ceil(allSorted.length / PAGE_SIZE);
  const pageRows = allSorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const headerStyle: React.CSSProperties = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };

  const ColHeader = ({ col, label }: { col: CaseSortColumn; label: string }): JSX.Element => (
    <UnstyledButton onClick={() => handleSort(col)} style={headerStyle}>
      <Group gap={4} wrap="nowrap">
        {label}
        <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
      </Group>
    </UnstyledButton>
  );

  return (
    <Paper shadow="xs" m="xs" p="md">
      <Stack gap="lg" pos="relative">
        <div>
          <Text size="sm" fw={700}>
            My Cases:
          </Text>
        </div>
        <LoadingOverlay visible={loading} />
        {allSorted.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" c="var(--mantine-color-blue-6)">
              {allSorted.length} case{allSorted.length !== 1 ? 's' : ''}
            </Text>
            <Table highlightOnHover withRowBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    <ColHeader col="patientName" label="Patient" />
                  </Table.Th>
                  <Table.Th>
                    <ColHeader col="caseId" label="Case ID" />
                  </Table.Th>
                  <Table.Th>
                    <ColHeader col="periodStart" label="Opened" />
                  </Table.Th>
                  <Table.Th>
                    <ColHeader col="serviceType" label="Service Type" />
                  </Table.Th>
                  <Table.Th>
                    <ColHeader col="managingOrg" label="Organisation" />
                  </Table.Th>
                  <Table.Th>
                    <ColHeader col="caseStatus" label="Case Status" />
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pageRows.map((row) => (
                  <Table.Tr key={row.episodeId} style={{ cursor: 'pointer' }} onClick={() => handleOpenCase(row)}>
                    <Table.Td>{row.patientName}</Table.Td>
                    <Table.Td>{row.caseId}</Table.Td>
                    <Table.Td>{row.periodStart ? formatDate(row.periodStart) : '—'}</Table.Td>
                    <Table.Td>{row.serviceType}</Table.Td>
                    <Table.Td>{row.managingOrg}</Table.Td>
                    <Table.Td>
                      <Badge color={getCaseStatusColor(row.caseStatus)} variant="light">
                        {row.caseStatus}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            <Center mt="sm">
              <Pagination value={currentPage} onChange={setCurrentPage} total={totalPages} />
            </Center>
          </Stack>
        )}
        {!loading && allSorted.length === 0 && (
          <Text c="dimmed" size="sm">
            No cases assigned to you as care manager.
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
