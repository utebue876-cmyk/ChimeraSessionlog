import {
  ActionIcon,
  Box,
  Button,
  Flex,
  Group,
  Loader,
  Menu,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import type { Encounter, Practitioner, Reference } from '@medplum/fhirtypes';
import { IconChevronDown, IconLock, IconLockOpen, IconPencil } from '@tabler/icons-react';
import type { JSX } from 'react';
import { ChartNoteStatus } from '../../types/encounter';
import { getEncounterStatusColor } from '../../utils/statusColors';
import { AppModal } from '../modal/AppModal';
import { ChangePractitionerModal } from '../schedule/ChangePractitionerModal';
import { SignLockDialog } from './SignLockDialog';
import { STATUS_TRANSITIONS, useEncounterHeader } from './useEncounterHeader';

interface EncounterHeaderProps {
  encounter: Encounter;
  practitioner?: Practitioner | undefined;
  chartNoteStatus?: ChartNoteStatus;
  onStatusChange?: (status: Encounter['status']) => void;
  onTabChange?: (tab: string) => void;
  onSign?: (practitioner: Reference<Practitioner>, lock: boolean) => void;
  onSignLock?: (practitioner: Reference<Practitioner>) => void;
}

const TITLE_WIDTH = 180;

const getStatusDisplay = (status: Encounter['status']): string =>
  status
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const EncounterHeader = (props: EncounterHeaderProps): JSX.Element => {
  const { encounter, chartNoteStatus = ChartNoteStatus.Unsigned, onStatusChange, onTabChange, onSign } = props;

  const {
    appointment,
    appointmentStartDate,
    appointmentEndDate,
    appointmentPractitionerName,
    caseIdentifier,
    planDefinitionName,
    serviceType,
    status,
    activeTab,
    confirmOpened,
    closeConfirm,
    signOpened,
    openSign: _openSign,
    closeSign,
    changePractitionerOpened,
    openChangePractitioner,
    closeChangePractitioner,
    handleStatusChange,
    confirmStatusChange,
    onConfirmSign,
    handleTabChange,
    handleSign,
    handlePractitionerChanged,
  } = useEncounterHeader({ encounter, chartNoteStatus, onStatusChange, onTabChange, onSign });

  const renderMenuItems = (): JSX.Element | null => {
    const transitions = STATUS_TRANSITIONS[status];
    if (!transitions) return null;
    return (
      <>
        {transitions.map((s) => (
          <Menu.Item key={s} onClick={() => handleStatusChange(s)}>
            {getStatusDisplay(s)}
          </Menu.Item>
        ))}
      </>
    );
  };

  return (
    <>
      <Paper shadow="sm" p={0} mt="md" ml="md" mr="md" withBorder>
        <Flex justify="space-between" align="flex-start" p="lg">
          <Stack gap={0}>
            <Text fw={600} size="lg">
              {encounter.basedOn?.[0]?.display || 'Appointment'}
            </Text>
            <Group mt={20}>
              <Text fw={600} size="sm" w={TITLE_WIDTH}>
                Case ID:
              </Text>
              <Text ml={5} fw={400}>
                {caseIdentifier}
              </Text>
            </Group>
            <Group mt={10}>
              <Text fw={600} size="sm" w={TITLE_WIDTH}>
                Practitioner:
              </Text>
              <Text ml={5} fw={400}>
                {appointmentPractitionerName}
              </Text>
              <Tooltip label="Change the practitioner for this appointment">
                <ActionIcon
                  variant="subtle"
                  onClick={openChangePractitioner}
                  aria-label="Change Practitioner"
                  color="var(--mantine-color-blue-6)"
                  disabled={chartNoteStatus === ChartNoteStatus.SignedAndLocked || encounter.status === 'finished'}
                >
                  <IconPencil size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <Group mt={10}>
              <Text fw={600} size="sm" w={TITLE_WIDTH}>
                Appointment Date & Time:
              </Text>
              <Text ml={5} fw={400}>
                {appointmentStartDate && new Date(appointmentStartDate).toLocaleDateString('en-GB')}{' '}
                {appointmentStartDate &&
                  new Date(appointmentStartDate).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}{' '}
                -{' '}
                {appointmentEndDate &&
                  new Date(appointmentEndDate).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
              </Text>
            </Group>
            <Group mt={15}>
              <Text fw={600} size="sm" w={TITLE_WIDTH}>
                Service Type:
              </Text>
              {!serviceType && <Loader size="sm" />}
              <Text ml={5} fw={400}>
                {serviceType}
              </Text>
            </Group>
            <Group mt={15}>
              <Text fw={600} size="sm" w={TITLE_WIDTH}>
                Plan Definition:
              </Text>
              {!planDefinitionName && <Loader size="sm" />}
              <Text ml={5} fw={400}>
                {planDefinitionName}
              </Text>
            </Group>
          </Stack>
          <Group align="flex-start">
            {status === 'cancelled' || status === 'finished' ? (
              <>
                {status === 'finished' && chartNoteStatus === ChartNoteStatus.Unsigned && (
                  <ActionIcon
                    radius="xl"
                    variant="transparent"
                    size={32}
                    className="outline-icon-button"
                    onClick={handleSign}
                  >
                    <IconLock size={16} />
                  </ActionIcon>
                )}

                {status === 'finished' && chartNoteStatus === ChartNoteStatus.Signed && (
                  <ActionIcon
                    radius="xl"
                    variant="transparent"
                    size={32}
                    className="outline-icon-button"
                    onClick={handleSign}
                  >
                    <IconLockOpen size={16} />
                  </ActionIcon>
                )}

                {status === 'finished' && chartNoteStatus === ChartNoteStatus.SignedAndLocked && (
                  <ActionIcon radius="xl" variant="filled" color="blue" onClick={handleSign}>
                    <IconLock size={16} />
                  </ActionIcon>
                )}

                <Button variant="light" color={getEncounterStatusColor(status)} radius="xl" size="sm">
                  {getStatusDisplay(status)}
                </Button>
              </>
            ) : (
              <Menu position="bottom-end" shadow="md">
                <Menu.Target>
                  <Button
                    variant="light"
                    color={getEncounterStatusColor(status)}
                    rightSection={<IconChevronDown size={16} />}
                    radius="xl"
                    size="sm"
                  >
                    {getStatusDisplay(status)}
                  </Button>
                </Menu.Target>

                <Menu.Dropdown>{renderMenuItems()}</Menu.Dropdown>
              </Menu>
            )}
          </Group>
        </Flex>

        <Box px="md" pb="md">
          <SegmentedControl
            value={activeTab}
            onChange={handleTabChange}
            data={[
              { label: 'Note & Tasks', value: 'notes' },
              { label: 'Details & Billing', value: 'details' },
            ]}
            fullWidth
            radius="md"
            size="md"
            color="var(--mantine-color-blue-3)"
            variant="filled"
          />
        </Box>
      </Paper>

      <AppModal
        opened={confirmOpened}
        onClose={closeConfirm}
        title={
          <Group>
            <Title order={4} c="white">
              Cancel Appointment
            </Title>
          </Group>
        }
      >
        <Text size="md" fw={400} mt="sm">
          Are you sure you want to cancel this appointment?
        </Text>
        <Text size="md" mt="xs">
          This action cannot be undone.
        </Text>
        <Group justify="flex-end" mt="xl" gap="xs">
          <Button onClick={closeConfirm} color="blue" variant="outline">
            No, keep it
          </Button>
          <Button onClick={confirmStatusChange} color="red">
            Yes, cancel it
          </Button>
        </Group>
      </AppModal>

      <AppModal
        opened={signOpened}
        onClose={closeSign}
        title={
          <Group>
            <Title order={4} c="white">
              Signing As
            </Title>
          </Group>
        }
      >
        <SignLockDialog onSign={onConfirmSign} />
      </AppModal>

      <ChangePractitionerModal
        appointment={appointment}
        encounter={encounter}
        opened={changePractitionerOpened}
        onClose={closeChangePractitioner}
        onSuccess={handlePractitionerChanged}
      />
    </>
  );
};
