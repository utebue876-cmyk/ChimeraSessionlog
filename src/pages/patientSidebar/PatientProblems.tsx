import { Box, Flex, Group, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { formatDate, getDisplayString } from '@medplum/core';
import type { Condition, Encounter, Patient } from '@medplum/fhirtypes';
import { StatusBadge } from '@medplum/react';
import { useMedplum } from '@medplum/react-hooks';
import type { JSX } from 'react';
import { useCallback, useState } from 'react';
import { AppModal } from '../../components/modal/AppModal';
import { PatientConditionDialog } from './PatientConditionDialog';
import { SidebarCollapsibleSection } from './SidebarCollapsibleSection';
import SidebarItem from './SidebarItem';
import styles from './SidebarItem.module.css';

export interface PatientProblemsProps {
  readonly patient: Patient;
  readonly encounter?: Encounter;
  readonly problems: Condition[];
  readonly onClickResource?: (resource: Condition) => void;
}

export function PatientProblems(props: PatientProblemsProps): JSX.Element {
  const medplum = useMedplum();
  const { patient, encounter } = props;
  const [problems, setProblems] = useState(
    props.problems.filter((c) => c.verificationStatus?.coding?.[0]?.code !== 'entered-in-error')
  );
  const [editCondition, setEditCondition] = useState<Condition>();
  const [opened, { open, close }] = useDisclosure(false);

  const handleSubmit = useCallback(
    async (condition: Condition) => {
      if (condition.id) {
        const updatedCondition = await medplum.updateResource(condition);
        setProblems(problems.map((p) => (p.id === updatedCondition.id ? updatedCondition : p)));
      } else {
        const newCondition = await medplum.createResource(condition);
        setProblems([newCondition, ...problems]);
      }
      setEditCondition(undefined);
      close();
    },
    [medplum, problems, close]
  );

  return (
    <>
      <SidebarCollapsibleSection
        title="Conditions"
        onAdd={() => {
          setEditCondition(undefined);
          open();
        }}
        tooltip="New condition"
      >
        {problems.length > 0 ? (
          <Flex direction="column" gap={8} pb={16}>
            {problems.map((problem) => (
              <SidebarItem
                key={problem.id}
                onClick={() => {
                  setEditCondition(problem);
                  open();
                }}
              >
                <Box>
                  <Text fw={400} className={styles.itemText}>
                    {getDisplayString(problem)}
                  </Text>
                  <Group mt={2} gap={4}>
                    {problem.clinicalStatus?.coding?.[0]?.code && (
                      <StatusBadge
                        data-testid="status-badge"
                        color={getStatusColor(problem.clinicalStatus?.coding?.[0]?.code)}
                        variant="light"
                        status={problem.clinicalStatus?.coding?.[0]?.code}
                      />
                    )}
                    <Text size="xs" fw={500} c="dimmed">
                      {formatDate(problem.onsetDateTime)}
                    </Text>
                  </Group>
                </Box>
              </SidebarItem>
            ))}
          </Flex>
        ) : (
          <Text pb={16}>(none)</Text>
        )}
      </SidebarCollapsibleSection>
      <AppModal
        opened={opened}
        onClose={close}
        title={
          <Group>
            <Title order={4} c="white">
              {editCondition ? 'Edit Condition' : 'Add Condition'}
            </Title>
          </Group>
        }
      >
        <PatientConditionDialog
          patient={patient}
          encounter={encounter}
          condition={editCondition}
          onSubmit={handleSubmit}
        />
      </AppModal>
    </>
  );
}

const getStatusColor = (status?: string): string => {
  if (!status) {
    return 'gray';
  }

  switch (status) {
    case 'active':
    case 'recurrence':
    case 'relapse':
      return 'green';
    case 'inactive':
      return 'orange';
    case 'remission':
      return 'blue';
    case 'resolved':
      return 'teal';
    default:
      return 'gray';
  }
};
