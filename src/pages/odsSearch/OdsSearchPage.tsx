import {
  Alert,
  Badge,
  Button,
  Center,
  Group,
  LoadingOverlay,
  Pagination,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import type { JSX } from 'react';
import { SortIcon } from '../../components/common/SortIcon';
import { useSortResults } from '../../hooks/useSortResults';
import type { OdsPractitioner } from '../../services/types/odsTypes';
import { useOdsSearch } from './useOdsSearch';

type OdsSortCol = 'id' | 'name' | 'role' | 'roleName' | 'lastChangeDate';

const PAGE_SIZE = 20;

const headerStyle: React.CSSProperties = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };

function getOdsValue(p: OdsPractitioner, col: OdsSortCol): string {
  switch (col) {
    case 'id':
      return p.id;
    case 'name':
      return p.name;
    case 'role':
      return p.role;
    case 'roleName':
      return p.roleName;
    case 'lastChangeDate':
      return p.lastChangeDate;
  }
}

export function OdsSearchPage(): JSX.Element {
  const {
    query,
    setQuery,
    handleSearch,
    handleReset,
    practitioners,
    loading,
    error,
    updatedAt,
    submittedQuery,
    currentPage,
    setCurrentPage,
  } = useOdsSearch();

  const {
    sorted: allSorted,
    sortCol,
    sortDir,
    handleSort,
  } = useSortResults<OdsPractitioner, OdsSortCol>(practitioners, getOdsValue, () => setCurrentPage(1));

  const totalPages = Math.ceil(allSorted.length / PAGE_SIZE);
  const pageRows = allSorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') handleSearch();
  };

  const ColHeader = ({ col, label }: { col: OdsSortCol; label: string }): JSX.Element => (
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
            <Title order={3} mb={2}>
              GP Lookup
            </Title>
            <Text size="sm" c="dark">
              Search the NHS ODS practitioner register
            </Text>
          </div>
          {updatedAt && (
            <Text size="xs" c="dark">
              Code system updated: {updatedAt}
            </Text>
          )}
        </Group>

        <Stack style={{ borderRadius: 4, backgroundColor: 'var(--mantine-color-gray-0)', padding: 16 }} gap="sm">
          <Title order={4}>Search</Title>

          <Stack gap="sm" pt="xs">
            <Group
              align="flex-end"
              onKeyDown={handleKeyDown}
              justify="space-between"
              style={{ flexWrap: 'wrap', gap: 8 }}
            >
              <TextInput
                maw={400}
                label="Practitioner Name"
                placeholder="e.g. PARRY, SMITH J"
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value.toUpperCase())}
                style={{ flex: 1 }}
              />
              <Group>
                <Button
                  variant="outline"
                  color="blue"
                  leftSection={<IconX size={14} />}
                  onClick={handleReset}
                  disabled={loading}
                >
                  Reset
                </Button>
                <Button leftSection={<IconSearch size={14} />} onClick={handleSearch} loading={loading}>
                  Search
                </Button>
              </Group>
            </Group>
          </Stack>
        </Stack>

        {/* ── Results ── */}
        <div style={{ position: 'relative', minHeight: 60 }}>
          <LoadingOverlay visible={loading} overlayProps={{ radius: 'sm', blur: 2 }} />

          {error && (
            <Alert color="red" title="Search failed">
              {error}
            </Alert>
          )}

          {!loading && !error && submittedQuery !== null && practitioners.length === 0 && (
            <Text c="dimmed" size="sm">
              No practitioners found matching your search.
            </Text>
          )}

          {allSorted.length > 0 && (
            <Stack gap="xs">
              <Text size="sm" c="var(--mantine-color-blue-6)">
                {allSorted.length} result{allSorted.length !== 1 ? 's' : ''}
              </Text>
              <Table highlightOnHover withRowBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>
                      <ColHeader col="id" label="Code" />
                    </Table.Th>
                    <Table.Th>
                      <ColHeader col="name" label="Name" />
                    </Table.Th>
                    <Table.Th>
                      <ColHeader col="role" label="Role" />
                    </Table.Th>
                    <Table.Th>
                      <ColHeader col="roleName" label="Role Name" />
                    </Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>GMC / ME Code</Table.Th>
                    <Table.Th>
                      <ColHeader col="lastChangeDate" label="Last Changed" />
                    </Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {pageRows.map((p) => (
                    <Table.Tr key={`${p.id}-${p.role}`}>
                      <Table.Td>
                        <Text size="sm" fw={500} c="blue">
                          {p.id}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{p.name}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="blue" size="sm">
                          {p.role}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{p.roleName}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{p.type}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {p.number6 ?? p['6'] ?? p.ME1 ?? '—'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {p.lastChangeDate}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {p.inactiveRole && p.inactiveRole.length > 0 ? (
                          <Badge variant="light" color="orange" size="sm">
                            Inactive roles
                          </Badge>
                        ) : (
                          <Badge variant="light" color="green" size="sm">
                            Active
                          </Badge>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              {totalPages > 1 && (
                <Center mt="sm">
                  <Pagination value={currentPage} onChange={setCurrentPage} total={totalPages} />
                </Center>
              )}
            </Stack>
          )}
        </div>
      </Stack>
    </Paper>
  );
}
