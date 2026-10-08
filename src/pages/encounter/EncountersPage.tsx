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
import type { HumanName } from '@medplum/fhirtypes';
import { IconPlus } from '@tabler/icons-react';
import type { JSX } from 'react';
import { SortIcon } from '../../components/common/SortIcon';
import { getCaseStatus } from '../../utils/episodeOfCareUtils';
import { getEncounterStatusColor } from '../../utils/statusColors';
import { formatDateTimeHhMm } from '../../utils/timeUtils';
import { type SortColumn, useEncountersPage } from './useEncountersPage';

const PAGE_SIZE = 20;

function PlanDefinitionCell({ name }: { name: string | undefined }): JSX.Element {
  return <>{name}</>;
}

export function EncountersPage(): JSX.Element {
  const {
    loading,
    currentPage,
    totalPages,
    setCurrentPage,
    sortedEncounters,
    planDefinitionNames,
    encounters: { length: encounterCount },
    activeEpisode,
    handleOpenEncounter,
    handleCreateAppointment,
    sortCol,
    sortDir,
    handleSort,
  } = useEncountersPage(PAGE_SIZE);
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
            <Text size="sm" mt={10}>
              Case ID:
              <span style={{ marginLeft: 5, fontWeight: 700 }}>{activeEpisode?.identifier?.[0]?.value}</span>
            </Text>
          </div>
          <Tooltip label="New appointment">
            <ActionIcon
              variant="subtle"
              onClick={handleCreateAppointment}
              aria-label="New appointment"
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
            {encounterCount} appointment{encounterCount !== 1 ? 's' : ''}
          </Text>
          <Table highlightOnHover withRowBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>
                  <ColHeader col="start" label="Start" />
                </Table.Th>
                <Table.Th>
                  <ColHeader col="end" label="End" />
                </Table.Th>
                <Table.Th>
                  <ColHeader col="practitioner" label="Practitioner" />
                </Table.Th>
                <Table.Th>
                  <ColHeader col="serviceType" label="Service Type" />
                </Table.Th>
                <Table.Th>
                  <ColHeader col="planDefinitionName" label="Plan Definition" />
                </Table.Th>
                <Table.Th>
                  <ColHeader col="status" label="Status" />
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sortedEncounters.map((encounterItem, index) => (
                <Table.Tr
                  key={encounterItem.encounter.id || index}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleOpenEncounter(encounterItem.encounter.id!)}
                >
                  <Table.Td>
                    {formatDateTimeHhMm(
                      encounterItem.appointment?.start ?? encounterItem.encounter.period?.start ?? ''
                    )}
                  </Table.Td>
                  <Table.Td>
                    {formatDateTimeHhMm(encounterItem.appointment?.end ?? encounterItem.encounter.period?.end ?? '')}
                  </Table.Td>
                  <Table.Td>
                    {encounterItem.appointment?.participant?.find((p) =>
                      p.actor?.reference?.startsWith('Practitioner/')
                    )?.actor?.display ??
                      formatHumanName(encounterItem.practitioner?.name?.[0] as HumanName) ??
                      encounterItem.encounter?.participant?.[0]?.individual?.display}
                  </Table.Td>
                  <Table.Td>{formatCodeableConcept(encounterItem.serviceType)}</Table.Td>
                  <Table.Td>
                    <PlanDefinitionCell name={planDefinitionNames[encounterItem.encounter.id ?? '']} />
                  </Table.Td>
                  <Table.Td>
                    <Badge size="md" color={getEncounterStatusColor(encounterItem.encounter.status)} variant="light">
                      {encounterItem.encounter.status}
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
      </Stack>
    </Paper>
  );
}
