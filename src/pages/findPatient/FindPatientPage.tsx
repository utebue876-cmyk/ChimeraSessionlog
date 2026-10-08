import {
  Button,
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
import type { JSX } from 'react';
import { SortIcon } from '../../components/common/SortIcon';
import { useSortResults } from '../../hooks/useSortResults';
import { formatGender, formatSortableName, getSortValue, getTelecomValue, SortColumn } from '../../utils/patientUtils';
import { useFindPatientPage } from '../findPatient/useFindPatientPage';
import { FindPatientModal } from './FindPatientModal';

const PAGE_SIZE = 20;

export function FindPatientPage(): JSX.Element {
  const {
    formValues,
    matches,
    hasSearched,
    loading,
    searchModalOpened,
    currentPage,
    totalPages,
    openSearchModal,
    closeSearchModal,
    setCurrentPage,
    handleChange,
    handleReset,
    handleOpenPatient,
    handleFindPatients,
  } = useFindPatientPage(PAGE_SIZE);

  // Sort the full result set first, then slice for the current page
  const {
    sorted: allSorted,
    sortCol,
    sortDir,
    handleSort,
  } = useSortResults<Patient, SortColumn>(matches, getSortValue, () => setCurrentPage(1));

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
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={3}>Patient Search</Title>
            <Text size="sm" c="dimmed">
              Search for patients by Case ID or MRN, or a mixture of Name, Date of Birth and Gender. The more
              information you provide, the more accurate your search results will be.
            </Text>
          </div>
          <Button onClick={openSearchModal}>New Patient Search</Button>
        </Group>

        {hasSearched && !loading && matches.length === 0 && (
          <Paper withBorder p="xl">
            <Text ta="center">No matching patients found.</Text>
          </Paper>
        )}
        <LoadingOverlay visible={loading} />
        {matches.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" c="var(--mantine-color-blue-6)">
              {matches.length} matching patient{matches.length !== 1 ? 's' : ''} found
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

        <FindPatientModal
          opened={searchModalOpened}
          onClose={closeSearchModal}
          loading={loading}
          formValues={formValues}
          onChange={handleChange}
          onReset={handleReset}
          onFind={() => handleFindPatients().catch(console.error)}
        />
      </Stack>
    </Paper>
  );
}
