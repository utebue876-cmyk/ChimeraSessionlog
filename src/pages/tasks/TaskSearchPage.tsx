import {
  ActionIcon,
  Badge,
  Box,
  Center,
  Group,
  LoadingOverlay,
  Pagination,
  Paper,
  Stack,
  Table,
  Tabs,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { formatCodeableConcept, getReferenceString } from '@medplum/core';
import { useMedplumProfile } from '@medplum/react';
import { IconAlertCircle, IconPlus } from '@tabler/icons-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { SortIcon } from '../../components/common/SortIcon';
import { NewTaskModal } from '../../components/tasks/NewTaskModal';
import { useEpisodeTasksPage } from '../../hooks/useEpisodeTasksPage';
import { useSortResults } from '../../hooks/useSortResults';
import { hasRequestedScheduleAssessmentTask } from '../../utils/scheduleAssessmentTask';
import { getTaskPriorityColor } from '../../utils/statusColors';
import type { TaskListItem, UseTaskSearchPageResult } from './useTaskSearchPage';
import { useTaskSearchPage } from './useTaskSearchPage';

const PAGE_SIZE = 20;

type TaskSearchMode = 'episode' | 'mine' | 'all' | 'team';
type SortColumn = 'code' | 'owner' | 'for' | 'priority' | 'dueDate' | 'lastUpdated' | 'performerType';

function getSortValue(item: TaskListItem, col: SortColumn): string {
  switch (col) {
    case 'code':
      return formatCodeableConcept(item.task.code) ?? '';
    case 'owner':
      return item.ownerDisplay;
    case 'for':
      return item.forDisplay;
    case 'priority':
      return item.task.priority ?? '';
    case 'dueDate':
      return item.task.restriction?.period?.end ?? '';
    case 'lastUpdated':
      return item.task.meta?.lastUpdated ?? '';
    case 'performerType':
      return formatCodeableConcept(item.task.performerType?.[0]) ?? '';
  }
}

function TaskTable({
  loading,
  tasks,
  currentPage,
  setCurrentPage,
  totalPages,
  handleOpenTask,
  refresh,
  episodeIdentifier,
  title,
}: UseTaskSearchPageResult & { title: string | undefined }): JSX.Element {
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);

  const filteredByTab = tasks.filter((item) =>
    tab === 'completed' ? item.task.status === 'completed' : item.task.status !== 'completed'
  );

  const hasOpenScheduleAssessmentTask = hasRequestedScheduleAssessmentTask(tasks.map((item) => item.task));

  const {
    sorted: allSorted,
    sortCol,
    sortDir,
    handleSort,
  } = useSortResults<TaskListItem, SortColumn>(filteredByTab, getSortValue, () => setCurrentPage(1));

  const sortedTasks = allSorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
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
        <LoadingOverlay visible={loading} />
        {hasOpenScheduleAssessmentTask && (
          <Box
            variant="light"
            style={{
              border: '2px solid var(--mantine-color-orange-3)',
              borderRadius: '8px',
              padding: '18px',
              justifyContent: 'left',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--mantine-color-orange-0)',
            }}
          >
            <IconAlertCircle size={28} color="var(--mantine-color-orange-6)" style={{ marginRight: '8px' }} />
            An active &quot;Schedule assessment&quot; task is waiting below — click it to book the patient&apos;s
            assessment appointment.
          </Box>
        )}
        {episodeIdentifier ? (
          <div>
            <Text size="sm" mt={10}>
              Case ID:
              <span style={{ marginLeft: 5, fontWeight: 700 }}>{episodeIdentifier}</span>
            </Text>
          </div>
        ) : (
          <div>
            <Text size="sm" fw={700}>
              {title}:
            </Text>
          </div>
        )}
        <Group>
          <Text size="sm" c="var(--mantine-color-blue-4)">
            {filteredByTab.length} task{filteredByTab.length !== 1 ? 's' : ''}
          </Text>
        </Group>
        <Group justify="space-between" align="flex-end" mt={-10}>
          <Tabs
            value={tab}
            onChange={(v) => {
              setTab((v ?? 'active') as 'active' | 'completed');
              setCurrentPage(1);
            }}
          >
            <Tabs.List>
              <Tabs.Tab value="active">Active</Tabs.Tab>
              <Tabs.Tab value="completed">Completed</Tabs.Tab>
            </Tabs.List>
          </Tabs>
          <Tooltip label="New task">
            <ActionIcon
              variant="subtle"
              onClick={() => setIsNewTaskOpen(true)}
              aria-label="New task"
              color="var(--mantine-color-blue-6)"
              disabled={hasOpenScheduleAssessmentTask}
            >
              <IconPlus size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <NewTaskModal
          opened={isNewTaskOpen}
          onClose={() => setIsNewTaskOpen(false)}
          onTaskCreated={() => {
            setIsNewTaskOpen(false);
            refresh();
          }}
        />
        <Stack gap="xs">
          <Table highlightOnHover withRowBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>
                  <ColHeader col="code" label="Code" />
                </Table.Th>
                <Table.Th>
                  <ColHeader col="owner" label="Owner" />
                </Table.Th>
                <Table.Th>
                  <ColHeader col="for" label="For" />
                </Table.Th>
                <Table.Th>
                  <ColHeader col="priority" label="Priority" />
                </Table.Th>
                <Table.Th>
                  <ColHeader col="dueDate" label="Due Date" />
                </Table.Th>
                <Table.Th>
                  <ColHeader col="lastUpdated" label="Last Updated" />
                </Table.Th>
                <Table.Th>
                  <ColHeader col="performerType" label="Performer Type" />
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sortedTasks.map((item) => (
                <Table.Tr key={item.task.id} style={{ cursor: 'pointer' }} onClick={() => handleOpenTask(item)}>
                  <Table.Td>{formatCodeableConcept(item.task.code) || '—'}</Table.Td>
                  <Table.Td>{item.ownerDisplay || '—'}</Table.Td>
                  <Table.Td>{item.forDisplay || '—'}</Table.Td>
                  <Table.Td>
                    {item.task.priority ? (
                      <Badge size="sm" color={getTaskPriorityColor(item.task.priority)} variant="light">
                        {item.task.priority}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </Table.Td>
                  <Table.Td>
                    {item.task.restriction?.period?.end
                      ? new Date(item.task.restriction.period.end).toLocaleDateString('en-GB')
                      : '—'}
                  </Table.Td>
                  <Table.Td>
                    {item.task.meta?.lastUpdated
                      ? new Date(item.task.meta.lastUpdated).toLocaleDateString('en-GB')
                      : '—'}
                  </Table.Td>
                  <Table.Td>{formatCodeableConcept(item.task.performerType?.[0]) || '—'}</Table.Td>
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
      </Stack>
    </Paper>
  );
}

function EpisodeTasksView(): JSX.Element {
  const result = useEpisodeTasksPage(PAGE_SIZE);
  return <TaskTable {...result} title={undefined} />;
}

/** All tasks owned by the current practitioner... */
function MineTasksView(): JSX.Element {
  const profile = useMedplumProfile();
  const ownerRef = profile ? getReferenceString(profile) : undefined;
  const filters: [string, string][] | null = ownerRef ? [['owner', ownerRef]] : null;
  const result = useTaskSearchPage(PAGE_SIZE, filters);
  return <TaskTable {...result} title="My Tasks" />;
}

/** All tasks regardless of owner... */
function AllTasksView(): JSX.Element {
  const result = useTaskSearchPage(PAGE_SIZE, []);
  return <TaskTable {...result} title="All Tasks" />;
}

/** All tasks owned by the Chimera MH Team Care Team... */
function TeamTasksView(): JSX.Element {
  const teamId = import.meta.env.VITE_CHIMERA_MH_TEAM_ID as string | undefined;
  const filters: [string, string][] | null = teamId ? [['owner', `CareTeam/${teamId}`]] : null;
  const result = useTaskSearchPage(PAGE_SIZE, filters);
  return <TaskTable {...result} title="Chimera MH Team Tasks" />;
}

export interface TaskSearchPageProps {
  mode?: TaskSearchMode;
}

export function TaskSearchPage({ mode = 'all' }: TaskSearchPageProps): JSX.Element {
  if (mode === 'episode') return <EpisodeTasksView />;
  if (mode === 'mine') return <MineTasksView />;
  if (mode === 'team') return <TeamTasksView />;
  return <AllTasksView />;
}
