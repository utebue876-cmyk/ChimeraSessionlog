import {
  Center,
  Group,
  LoadingOverlay,
  Pagination,
  Paper,
  Stack,
  Table,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { formatAddress } from '@medplum/core';
import type { HumanName, Patient } from '@medplum/fhirtypes';
import { type JSX } from 'react';
import { SortIcon } from '../../components/common/SortIcon';
import { useSortResults } from '../../hooks/useSortResults';
import { formatGender, formatSortableName, getSortValue, getTelecomValue, SortColumn } from '../../utils/patientUtils';
import { usePatientsPage } from './usePatientsPage';

const PAGE_SIZE = 20;

export function PatientsPage(): JSX.Element {
  const { loading, currentPage, setCurrentPage, handleOpenPatient, patients } = usePatientsPage(PAGE_SIZE);

  const {
    sorted: allSorted,
    sortCol,
    sortDir,
    handleSort,
  } = useSortResults<Patient, SortColumn>(patients, getSortValue, () => setCurrentPage(1));
  const totalPages = Math.ceil(allSorted.length / PAGE_SIZE);
  const sortedMatches = allSorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
    <Paper shadow="xs" m="xs" p="md">
      <Stack gap="lg" pos="relative">
        <div>
          <Title order={3} mb={-10}>
            All Patients
          </Title>
        </div>
        <LoadingOverlay visible={loading} />
        {allSorted.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" c="var(--mantine-color-blue-6)">
              {allSorted.length} patient{allSorted.length !== 1 ? 's' : ''}
            </Text>
            <Table highlightOnHover withRowBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    <ColHeader col="name" label="Name" />
                  </Table.Th>
                  <Table.Th>
                    <ColHeader col="gender" label="Gender" />
                  </Table.Th>
                  <Table.Th>
                    <ColHeader col="phone" label="Phone" />
                  </Table.Th>
                  <Table.Th>
                    <ColHeader col="email" label="Email" />
                  </Table.Th>
                  <Table.Th>
                    <ColHeader col="address" label="Address" />
                  </Table.Th>
                  <Table.Th>
                    <ColHeader col="id" label="ID" />
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sortedMatches.map((patient, index) => (
                  <Table.Tr
                    key={patient.id || index}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleOpenPatient(patient.id)}
                  >
                    <Table.Td>{formatSortableName(patient.name?.[0] as HumanName) || 'Unnamed patient'}</Table.Td>
                    <Table.Td>{formatGender(patient.gender)}</Table.Td>
                    <Table.Td>{getTelecomValue(patient, 'phone')}</Table.Td>
                    <Table.Td>{getTelecomValue(patient, 'email')}</Table.Td>
                    <Table.Td>{formatAddress(patient.address?.[0])}</Table.Td>
                    <Table.Td>{patient.identifier?.[0]?.value ?? ''}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            <Center mt="sm">
              <Pagination value={currentPage} onChange={setCurrentPage} total={totalPages} />
            </Center>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
