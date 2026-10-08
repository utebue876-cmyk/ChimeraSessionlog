import { Button, Loader, ScrollArea, Select, Stack, Text, Title } from '@mantine/core';
import type { WithId } from '@medplum/core';
import { formatHumanName } from '@medplum/core';
import type { Practitioner } from '@medplum/fhirtypes';
import { ResourceAvatar } from '@medplum/react';
import { IconUsers } from '@tabler/icons-react';
import type { JSX } from 'react';

interface ServiceTypeOption {
  key: string;
  label: string;
}

interface PractitionerPaneProps {
  serviceTypeOptions: ServiceTypeOption[];
  selectedServiceTypeKey: string | null;
  onSelectServiceType: (value: string | null) => void;
  practitioners: WithId<Practitioner>[];
  practitionersLoading?: boolean;
  selectedPractitioner: WithId<Practitioner> | undefined;
  onSelectPractitioner: (practitioner: WithId<Practitioner>) => void;
  allPractitionersSelected?: boolean;
  onSelectAllPractitioners?: () => void;
  className?: string;
}

export function ServiceSelectionPane(props: PractitionerPaneProps): JSX.Element {
  const {
    serviceTypeOptions,
    selectedServiceTypeKey,
    onSelectServiceType,
    practitioners,
    practitionersLoading,
    selectedPractitioner,
    onSelectPractitioner,
    allPractitionersSelected,
    onSelectAllPractitioners,
    className,
  } = props;

  return (
    <Stack mr={10} gap="sm" justify="flex-start" style={{ height: '100%', maxWidth: '280px' }} className={className}>
      <Title order={4}>Service Type</Title>
      <Select
        placeholder="Select a service type..."
        data={serviceTypeOptions.map((o) => ({ value: o.key, label: o.label }))}
        value={selectedServiceTypeKey}
        onChange={onSelectServiceType}
        clearable
      />
      <Title order={4}>Practitioners</Title>
      {(selectedPractitioner || allPractitionersSelected) && (
        <Text size="sm" c="dark">
          Click a green slot on the calendar to book an appointment.
        </Text>
      )}
      <ScrollArea style={{ flex: 1 }}>
        <Stack gap="xs">
          {practitionersLoading && <Loader size="sm" mx="auto" />}
          {!practitionersLoading && practitioners.length === 0 && (
            <Text size="sm" c="dark">
              Select a service type to see available practitioners.
            </Text>
          )}
          {!practitionersLoading && practitioners.length > 1 && (
            <Button
              fullWidth
              variant={allPractitionersSelected ? 'light' : 'outline'}
              color={allPractitionersSelected ? 'green' : 'gray'}
              justify="flex-start"
              leftSection={<IconUsers size={20} />}
              onClick={() => onSelectAllPractitioners?.()}
              styles={(theme) => ({
                root: allPractitionersSelected
                  ? { border: `1px solid ${theme.colors.green[6]}` }
                  : { backgroundColor: 'white' },
                label: {
                  fontWeight: allPractitionersSelected ? 'bold' : 'normal',
                  color: allPractitionersSelected ? theme.colors.green[8] : theme.colors.gray[9],
                },
              })}
            >
              All Practitioners
            </Button>
          )}
          {practitioners.map((practitioner) => {
            const isSelected = practitioner.id === selectedPractitioner?.id;
            return (
              <Button
                key={practitioner.id}
                fullWidth
                variant={isSelected ? 'light' : 'outline'}
                color={isSelected ? 'green' : 'gray'}
                justify="space-between"
                leftSection={<ResourceAvatar value={practitioner} size="sm" />}
                onClick={() => onSelectPractitioner(practitioner)}
                styles={(theme) => ({
                  root: isSelected ? { border: `1px solid ${theme.colors.green[6]}` } : { backgroundColor: 'white' },
                  inner: { width: '100%' },
                  label: {
                    fontWeight: isSelected ? 'bold' : 'normal',
                    color: isSelected ? theme.colors.green[8] : theme.colors.gray[9],
                    flex: 1,
                    textAlign: 'left',
                  },
                })}
              >
                {formatHumanName(practitioner.name?.[0] ?? {}) || 'Unknown Practitioner'}
              </Button>
            );
          })}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
