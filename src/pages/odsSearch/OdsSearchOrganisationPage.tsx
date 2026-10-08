import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Center,
  Group,
  LoadingOverlay,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { IconSearch, IconStethoscope } from '@tabler/icons-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { SortIcon } from '../../components/common/SortIcon';
import { useSortResults } from '../../hooks/useSortResults';
import type { OdsOrganisationMain } from '../../services/types/odsTypes';
import { OrgPractitionersModal } from './OrgPractitionersModal';
import type { OrganisationStatusFilter } from './useOdsSearchOrganisation';
import { useOdsSearchOrganisation } from './useOdsSearchOrganisation';

type OrgSortCol = 'id' | 'name' | 'roleName' | 'status' | 'address1' | 'address2' | 'town' | 'postcode';

const PAGE_SIZE = 20;

const headerStyle: React.CSSProperties = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };

const STATUS_OPTIONS = [
  { value: '', label: 'All (Status)' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

function getOrgValue(org: OdsOrganisationMain, col: OrgSortCol): string {
  switch (col) {
    case 'id':
      return org.id;
    case 'name':
      return org.name;
    case 'roleName':
      return org.roleName?.[0] ?? '';
    case 'status':
      return org.status;
    case 'address1':
      return org.address1;
    case 'address2':
      return org.address2;
    case 'town':
      return org.town;
    case 'postcode':
      return org.postcode;
  }
}

export function OdsSearchOrganisationPage(): JSX.Element {
  const {
    name,
    setName,
    address,
    setAddress,
    town,
    setTown,
    postcode,
    setPostcode,
    status,
    setStatus,
    handleSearch,
    handleReset,
    validationError,
    organisations,
    loading,
    error,
    submitted,
    currentPage,
    setCurrentPage,
  } = useOdsSearchOrganisation();

  const {
    sorted: allSorted,
    sortCol,
    sortDir,
    handleSort,
  } = useSortResults<OdsOrganisationMain, OrgSortCol>(organisations, getOrgValue, () => setCurrentPage(1));

  const [selectedOrg, setSelectedOrg] = useState<OdsOrganisationMain | null>(null);

  const totalPages = Math.ceil(allSorted.length / PAGE_SIZE);
  const pageRows = allSorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') handleSearch();
  };

  const ColHeader = ({ col, label }: { col: OrgSortCol; label: string }): JSX.Element => (
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
          <Group justify="space-between" align="center">
            <Group align="center" gap="sm">
              <img src="/ODS-Logo.png" alt="ODS Logo" style={{ height: 48, marginLeft: 16, marginRight: 56 }} />
              <div>
                <Title order={3} mb={2}>
                  NHS General Practices & Practitioners Lookup
                </Title>
                <Text size="sm" c="dark">
                  Search the NHS ODS organisation register for all GP practices and their practitioners.
                </Text>
              </div>
            </Group>
            <img src="/NHS-England.svg" alt="NHS England" style={{ height: 48, marginRight: 16 }} />
          </Group>

          <Stack style={{ borderRadius: 4, backgroundColor: 'var(--mantine-color-blue-0)', padding: 16 }} gap="sm">
            <Title order={4}>Search for NHS General Practitioners</Title>
            <Text size="sm" c="dark">
              Find the NHS organisation then click the Stethoscope button in the list to view the practitioners for that
              organisation.
            </Text>

            <Stack gap="sm" pt="xs" onKeyDown={handleKeyDown}>
              <Group align="flex-end" style={{ flexWrap: 'wrap', gap: 8 }}>
                <TextInput
                  label="Name"
                  placeholder="e.g. HEREWARD MEDICAL"
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value.toUpperCase())}
                  style={{ flex: 1, minWidth: 160, maxWidth: 300 }}
                />
                <TextInput
                  label="Address"
                  placeholder="e.g. EXETER STREET"
                  value={address}
                  onChange={(e) => setAddress(e.currentTarget.value.toUpperCase())}
                  style={{ flex: 1, minWidth: 160, maxWidth: 300 }}
                />
                <TextInput
                  label="Town"
                  placeholder="e.g. BOURNE"
                  value={town}
                  onChange={(e) => setTown(e.currentTarget.value.toUpperCase())}
                  style={{ flex: 1, minWidth: 160, maxWidth: 300 }}
                />
                <TextInput
                  label="Postcode"
                  placeholder="e.g. PE10"
                  value={postcode}
                  onChange={(e) => setPostcode(e.currentTarget.value.toUpperCase())}
                  style={{ flex: 1, maxWidth: 100 }}
                />
                <Select
                  label="Status"
                  data={STATUS_OPTIONS}
                  value={status}
                  onChange={(v) => setStatus((v ?? '') as OrganisationStatusFilter)}
                  style={{ minWidth: 140 }}
                />
                <ActionIcon size="lg" onClick={handleSearch} loading={loading} aria-label="Search">
                  <IconSearch size={18} />
                </ActionIcon>
                <Button variant="outline" onClick={handleReset} disabled={loading}>
                  Reset
                </Button>
              </Group>
            </Stack>
          </Stack>

          <div style={{ position: 'relative', minHeight: 60 }}>
            <LoadingOverlay visible={loading} overlayProps={{ radius: 'sm', blur: 2 }} />

            {validationError && (
              <Alert color="orange" title="Search Error..." mb="sm">
                {validationError}
              </Alert>
            )}

            {error && (
              <Alert color="red" title="Search failed">
                {error}
              </Alert>
            )}

            {!loading && !error && submitted && organisations.length === 0 && (
              <Text c="dimmed" size="sm">
                No organisations found matching your search.
              </Text>
            )}

            {allSorted.length > 0 && (
              <Stack gap="xs">
                <Text size="sm" c="var(--mantine-color-blue-6)" ml="md">
                  {allSorted.length} record{allSorted.length !== 1 ? 's' : ''} found
                </Text>
                <Table highlightOnHover withRowBorders>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th />
                      <Table.Th>
                        <ColHeader col="id" label="Code" />
                      </Table.Th>
                      <Table.Th>
                        <ColHeader col="name" label="Name" />
                      </Table.Th>
                      <Table.Th>
                        <ColHeader col="roleName" label="Role" />
                      </Table.Th>
                      <Table.Th>
                        <ColHeader col="status" label="Status" />
                      </Table.Th>
                      <Table.Th>
                        <ColHeader col="address1" label="Address 1" />
                      </Table.Th>
                      <Table.Th>
                        <ColHeader col="address2" label="Address 2" />
                      </Table.Th>
                      <Table.Th>
                        <ColHeader col="town" label="Town" />
                      </Table.Th>
                      <Table.Th>
                        <ColHeader col="postcode" label="Postcode" />
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {pageRows.map((org) => (
                      <Table.Tr key={org.id}>
                        <Table.Td>
                          <Tooltip label={`View practitioners for ${org.name}`}>
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              title="View practitioners"
                              onClick={() => setSelectedOrg(org)}
                            >
                              <IconStethoscope size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" ff="monospace">
                            {org.id}
                          </Text>
                        </Table.Td>
                        <Table.Td>{org.name}</Table.Td>
                        <Table.Td>{org.roleName?.[0] ?? ''}</Table.Td>
                        <Table.Td>
                          <Badge color={org.status === 'Active' ? 'green' : 'gray'} variant="light" size="sm">
                            {org.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{org.address1}</Table.Td>
                        <Table.Td>{org.address2}</Table.Td>
                        <Table.Td>{org.town}</Table.Td>
                        <Table.Td>{org.postcode}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>

                {totalPages > 1 && (
                  <Center>
                    <Pagination total={totalPages} value={currentPage} onChange={setCurrentPage} size="sm" />
                  </Center>
                )}
              </Stack>
            )}
          </div>
        </Stack>
      </Paper>

      {selectedOrg && (
        <OrgPractitionersModal
          orgId={selectedOrg.id}
          orgName={selectedOrg.name}
          opened={selectedOrg !== null}
          onClose={() => setSelectedOrg(null)}
        />
      )}
    </>
  );
}
