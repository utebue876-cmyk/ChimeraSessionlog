import { Grid, Group, Paper, Tabs, Title } from '@mantine/core';
import { resolveId } from '@medplum/core';
import type { EpisodeOfCare, Patient, Task } from '@medplum/fhirtypes';
import { Document, useMedplum, useMedplumNavigate } from '@medplum/react';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { TaskActions } from '../../components/tasks/actions/TaskActions';
import { NotesPage } from './NotesPage';
import { TaskDetails } from './TaskDetails';

export function TaskPage(): JSX.Element {
  const medplum = useMedplum();
  const navigate = useMedplumNavigate();
  const { id, patientId } = useParams() as { id: string; patientId?: string };
  const [task, setTask] = useState<Task | undefined>(undefined);
  const tabs = ['Details', 'Notes'];
  const [_patient, setPatient] = useState<Patient | undefined>();
  const [focusIdentifier, setFocusIdentifier] = useState<string | undefined>();

  const patientReference = task?.for;
  const focusReference = task?.focus;

  // Set the current tab to what is in the URL, otherwise default to 'Details'
  const tab = window.location.pathname.split('/').pop();
  const currentTab = tab && tabs.map((t) => t.toLowerCase()).includes(tab) ? tab : tabs[0].toLowerCase();

  useEffect(() => {
    // Fetch the task that is specified in the URL
    const fetchTask = async (): Promise<void> => {
      try {
        const taskData = await medplum.readResource('Task', id);
        setTask(taskData);
      } catch (error) {
        console.error(error);
      }
    };

    fetchTask().catch((error) => console.error(error));
  }, [medplum, id]);

  useEffect(() => {
    const fetchFocusIdentifier = async (): Promise<void> => {
      if (!focusReference) return;
      const focusId = resolveId(focusReference);
      if (!focusId || focusId === 'undefined') return;
      try {
        const resource = (await medplum.readReference(focusReference)) as EpisodeOfCare;
        setFocusIdentifier(resource.identifier?.[0]?.value);
      } catch (error) {
        console.error(error);
      }
    };
    fetchFocusIdentifier().catch(console.error);
  }, [medplum, focusReference]);

  useEffect(() => {
    const fetchLinkedPatient = async (): Promise<void> => {
      if (patientReference) {
        const patientId = resolveId(patientReference);
        try {
          const patientData = patientId ? await medplum.readResource('Patient', patientId) : undefined;
          setPatient(patientData);
        } catch (error) {
          console.error(error);
        }
      }
    };

    fetchLinkedPatient().catch((err) => console.error(err));
  }, [medplum, patientReference]);

  // Update the current tab and navigate to its URL
  const handleTabChange = (newTab: string | null): void => {
    const base = patientId ? `/Patient/${patientId}/task/${id}` : `/Task/${id}`;
    navigate(`${base}/${newTab ?? ''}`);
  };

  const onTaskChange = (updatedTask: Task): void => {
    setTask(updatedTask);
  };

  if (!task) {
    return <Document>No Task found</Document>;
  }

  return (
    <Paper p="md" key={task.id} style={{ alignSelf: 'center', width: '100%' }}>
      <Grid gutter="xs">
        <Grid.Col span={8}>
          <TaskDetailsLayout
            task={task}
            focusIdentifier={focusIdentifier}
            tabs={tabs}
            currentTab={currentTab}
            handleTabChange={handleTabChange}
          />
        </Grid.Col>
        <Grid.Col span={3}>
          <Actions task={task} onTaskChange={onTaskChange} />
        </Grid.Col>
      </Grid>
    </Paper>
  );
}

interface TaskDetailsLayoutProps {
  readonly task: Task;
  readonly focusIdentifier: string | undefined;
  readonly tabs: string[];
  readonly currentTab: string;
  readonly handleTabChange: (newTab: string | null) => void;
}

function TaskDetailsLayout({
  task,
  focusIdentifier,
  tabs,
  currentTab,
  handleTabChange,
}: TaskDetailsLayoutProps): JSX.Element {
  return (
    <Paper p="md" key={task ? task.id : 'loading'}>
      <Group mb={10} ml={10}>
        <Title size="h5" fw={500}>
          {task.description ? task.description : 'Task Description not found'}
        </Title>
      </Group>
      <Tabs value={currentTab.toLowerCase()} onChange={handleTabChange}>
        <Tabs.List style={{ whiteSpace: 'nowrap', flexWrap: 'nowrap' }}>
          {tabs.map((tab) => (
            <Tabs.Tab key={tab} value={tab.toLowerCase()}>
              {tab}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <Tabs.Panel value="details">
          <TaskDetails task={task} focusIdentifier={focusIdentifier} />
        </Tabs.Panel>
        {/* <Tabs.Panel value="timeline">
          <DefaultResourceTimeline resource={task} />
        </Tabs.Panel> */}
        <Tabs.Panel value="notes">
          <NotesPage task={task} />
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );
}

interface ActionsProps {
  readonly task: Task;
  readonly onTaskChange: (updatedTask: Task) => void;
}

function Actions({ task, onTaskChange }: ActionsProps): JSX.Element {
  return (
    <Paper p="md">
      <TaskActions task={task} onChange={onTaskChange} />
    </Paper>
  );
}
