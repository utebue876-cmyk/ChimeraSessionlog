import { Badge, Box, Button, Divider, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { formatCodeableConcept } from '@medplum/core';
import type { Appointment, EpisodeOfCare } from '@medplum/fhirtypes';
import {
  IconBriefcase,
  IconBuilding,
  IconBuildingSkyscraper,
  IconCalendar,
  IconCircleCheck,
  IconCircleX,
  IconClipboardList,
  IconId,
  IconMapPin,
  IconPencil,
  IconStethoscope,
  IconUmbrella,
  IconUser,
} from '@tabler/icons-react';
import type { JSX } from 'react';
import { getCaseStatusColor } from '../../utils/statusColors';
import { useCaseDetails } from './useCaseDetails';

interface DisplayCaseProps {
  episode: EpisodeOfCare;
  appointmentCount: number;
  nextAppointment?: Appointment;
  onEdit: (episode: EpisodeOfCare) => void;
}

const ICON_COLOR = 'var(--mantine-color-gray-5)';
const ICON_SIZE = 20;

export function CaseDetails({ episode, appointmentCount, nextAppointment, onEdit }: DisplayCaseProps): JSX.Element {
  const {
    caseStatus,
    consentSigned,
    consentDateFormatted,
    optimaEmployerDisplay,
    optimaLocation,
    optimaFacility,
    coverage,
    insuranceProvider,
    nextAppointmentText,
    practitioner,
  } = useCaseDetails(episode, nextAppointment);

  return (
    <Stack gap="md" p="md">
      {consentSigned === true ? (
        <Box
          bg="white"
          p="sm"
          style={{ borderRadius: 'var(--mantine-radius-md)', border: '1px solid var(--mantine-color-green-2)' }}
        >
          <Group justify="space-between">
            <Group gap="sm">
              <IconCircleCheck size={40} color="green" />
              <Stack gap={2}>
                <Text fw={600} size="sm">
                  Consent recorded
                </Text>
                <Text size="xs" c="var(--mantine-color-gray-7)" fw={500}>
                  {consentDateFormatted}
                </Text>
              </Stack>
            </Group>
          </Group>
        </Box>
      ) : (
        <Box
          bg="white"
          p="sm"
          style={{ borderRadius: 'var(--mantine-radius-md)', border: '1px solid var(--mantine-color-red-2)' }}
        >
          <Group justify="space-between">
            <Group gap="sm">
              <IconCircleX size={40} color="var(--mantine-color-red-4)" />
              <Stack gap={2}>
                <Text fw={600} size="sm">
                  No consent recorded
                </Text>
              </Stack>
            </Group>
          </Group>
        </Box>
      )}

      <Group gap="md" align="flex-start">
        <ThemeIcon size={54} radius="xl" color="blue" variant="light">
          <IconClipboardList size={26} />
        </ThemeIcon>
        <Stack gap={4} style={{ flex: 1 }}>
          <Group gap="sm" align="center">
            <Text size="lg" fw={600}>
              {episode?.identifier?.[0]?.value || episode.id}
            </Text>
            <Badge size="md" color={getCaseStatusColor(caseStatus)} variant="filled">
              {caseStatus}
            </Badge>
          </Group>
          <Group gap="xs">
            <Group gap={4}>
              <IconCalendar size={13} color="var(--mantine-color-gray-7)" />
              <Text size="xs" c="var(--mantine-color-gray-7)" fw={500}>
                Opened: {episode?.period?.start ? new Date(episode.period.start).toLocaleDateString('en-GB') : 'N/A'}
              </Text>
            </Group>
            <Text size="sm">·</Text>
            <Group gap={4}>
              <IconUser size={13} color="var(--mantine-color-gray-7)" />
              <Text size="xs" c="var(--mantine-color-gray-7)" fw={500}>
                Care Manager: {episode?.careManager?.display ?? 'N/A'}
              </Text>
            </Group>
          </Group>
        </Stack>
      </Group>

      <Divider style={{ marginInline: 'calc(-1 * var(--mantine-spacing-md))' }} />
      <Stack gap={0}>
        <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <Box
            py="sm"
            pr="md"
            style={{
              borderBottom: '1px solid var(--mantine-color-gray-1)',
              borderRight: '1px solid var(--mantine-color-gray-1)',
            }}
          >
            <Group gap="sm" align="flex-start" ml="sm">
              <IconBuildingSkyscraper size={ICON_SIZE} color={ICON_COLOR} />
              <Stack gap={2}>
                <Text size="xs" fw={700}>
                  Managing Organisation
                </Text>
                <Text size="sm">
                  {episode?.managingOrganization?.display ||
                    episode?.managingOrganization?.reference?.replace('Organization/', '') ||
                    'N/A'}
                </Text>
              </Stack>
            </Group>
          </Box>
          <Box py="sm" pl="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-1)' }}>
            <Group gap="sm" align="flex-start">
              <IconUmbrella size={ICON_SIZE} color={ICON_COLOR} />
              <Stack gap={2}>
                <Text size="xs" fw={700}>
                  Insurance Provider
                </Text>
                <Text size="sm">
                  {insuranceProvider?.display || insuranceProvider?.reference?.replace('Organization/', '') || 'N/A'}
                </Text>
              </Stack>
            </Group>
          </Box>
          <Box
            py="sm"
            pr="md"
            style={{
              borderBottom: '1px solid var(--mantine-color-gray-1)',
              borderRight: '1px solid var(--mantine-color-gray-1)',
            }}
          >
            <Group gap="sm" align="flex-start" ml="xs">
              <IconId size={ICON_SIZE} color={ICON_COLOR} />
              <Stack gap={2}>
                <Text size="xs" fw={700}>
                  Policy Number
                </Text>
                <Text size="sm">{coverage?.subscriberId ?? 'N/A'}</Text>
              </Stack>
            </Group>
          </Box>
          <Box py="sm" pl="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-1)' }}>
            <Group gap="sm" align="flex-start">
              <IconBriefcase size={ICON_SIZE} color={ICON_COLOR} />
              <Stack gap={2}>
                <Text size="xs" fw={700}>
                  Employer
                </Text>
                <Text size="sm" c={optimaEmployerDisplay ? undefined : 'dimmed'}>
                  {optimaEmployerDisplay ?? 'N/A'}
                </Text>
              </Stack>
            </Group>
          </Box>
          <Box
            py="sm"
            pr="md"
            style={{
              borderBottom: '1px solid var(--mantine-color-gray-1)',
              borderRight: '1px solid var(--mantine-color-gray-1)',
            }}
          >
            <Group gap="sm" align="flex-start" ml="sm">
              <IconStethoscope size={ICON_SIZE} color={ICON_COLOR} />
              <Stack gap={2}>
                <Text size="xs" fw={700}>
                  Service Type
                </Text>
                <Text size="sm">{episode?.type?.[0] ? formatCodeableConcept(episode.type[0]) : 'N/A'}</Text>
              </Stack>
            </Group>
          </Box>
          <Box py="sm" pl="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-1)' }}>
            <Group gap="sm" align="flex-start">
              <IconMapPin size={ICON_SIZE} color={ICON_COLOR} />
              <Stack gap={2}>
                <Text size="xs" fw={700}>
                  Location
                </Text>
                <Text size="sm" c={optimaLocation ? undefined : 'dimmed'}>
                  {optimaLocation ?? 'N/A'}
                </Text>
              </Stack>
            </Group>
          </Box>
          <Box py="sm" pr="md" style={{ borderRight: '1px solid var(--mantine-color-gray-1)' }}>
            <Group gap="sm" align="flex-start" ml="sm">
              <IconUser size={ICON_SIZE} color={ICON_COLOR} />
              <Stack gap={2}>
                <Text size="xs" fw={700}>
                  General Practitioner
                </Text>
                <Text size="sm" c="dimmed">
                  No GP recorded
                </Text>
              </Stack>
            </Group>
          </Box>
          <Box py="sm" pl="md">
            <Group gap="sm" align="flex-start">
              <IconBuilding size={ICON_SIZE} color={ICON_COLOR} />
              <Stack gap={2}>
                <Text size="xs" fw={700}>
                  Facility
                </Text>
                <Text size="sm" c={optimaFacility ? undefined : 'dimmed'}>
                  {optimaFacility ?? 'N/A'}
                </Text>
              </Stack>
            </Group>
          </Box>
        </Box>
      </Stack>

      <Group gap="sm" align="stretch">
        <Box p="sm" style={{ flex: 1, border: '1px solid var(--mantine-color-gray-2)', borderRadius: 8 }}>
          <Group gap="xs" mb={4}>
            <IconCalendar size={ICON_SIZE} color={ICON_COLOR} />
            <Text size="xs" fw={700}>
              Number of Appointments
            </Text>
          </Group>
          <Text fw={400}>{appointmentCount}</Text>
        </Box>
        <Box style={{ flex: 2, border: '1px solid var(--mantine-color-gray-2)', borderRadius: 8, display: 'flex' }}>
          <Box p="sm" style={{ flex: 1 }}>
            <Group gap="xs" mb={4}>
              <IconCalendar size={ICON_SIZE} color={ICON_COLOR} />
              <Text size="xs" fw={700}>
                Next Appointment
              </Text>
            </Group>
            <Text fw={400} size="sm" c={nextAppointmentText === 'N/A' ? 'dimmed' : undefined}>
              {nextAppointmentText}
            </Text>
          </Box>
          <Box p="sm" style={{ flex: 1 }}>
            <Group gap="xs" mb={4}>
              <IconUser size={ICON_SIZE} color={ICON_COLOR} />
              <Text size="xs" fw={700}>
                Practitioner
              </Text>
            </Group>
            <Text fw={400} size="sm" c={practitioner === 'N/A' ? 'dimmed' : undefined}>
              {practitioner}
            </Text>
          </Box>
        </Box>
      </Group>

      <Divider style={{ marginInline: 'calc(-1 * var(--mantine-spacing-md))' }} />
      <Group justify="space-between">
        <Button
          size="sm"
          variant="filled"
          leftSection={<IconPencil size={14} />}
          onClick={() => onEdit(episode)}
          disabled={caseStatus.toLowerCase() === 'closed'}
        >
          Edit case
        </Button>
      </Group>
    </Stack>
  );
}
