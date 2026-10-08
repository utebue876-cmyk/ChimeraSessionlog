import { Box, Button, Grid, Group, Select, Stack, Text, TextInput, Title } from '@mantine/core';
import { useMedplum } from '@medplum/react';
import { IconUserSearch } from '@tabler/icons-react';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { AppModal } from '../../components/modal/AppModal';
import type { FindPatientFormValues } from './findPatientForm';

const ADMINISTRATIVE_GENDER_VALUESET_URL = 'http://hl7.org/fhir/ValueSet/administrative-gender';

interface FindPatientModalProps {
  opened: boolean;
  loading: boolean;
  formValues: FindPatientFormValues;
  onClose: () => void;
  onReset: () => void;
  onFind: () => void;
  onChange: <K extends keyof FindPatientFormValues>(field: K, value: FindPatientFormValues[K]) => void;
}

export function FindPatientModal(props: FindPatientModalProps): JSX.Element {
  const medplum = useMedplum();
  const { opened, loading, formValues, onClose, onReset, onFind, onChange } = props;
  const [genderOptions, setGenderOptions] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    let active = true;

    medplum
      .valueSetExpand({
        url: ADMINISTRATIVE_GENDER_VALUESET_URL,
      })
      .then((expanded) => {
        if (!active) {
          return;
        }

        const options =
          expanded.expansion?.contains
            ?.map((item) => {
              if (!item.code) {
                return undefined;
              }

              return {
                value: item.code,
                label: item.display ?? item.code,
              };
            })
            .filter((item): item is { value: string; label: string } => !!item) ?? [];

        setGenderOptions(options);
      })
      .catch(() => {
        if (active) {
          setGenderOptions([]);
        }
      });

    return () => {
      active = false;
    };
  }, [medplum]);

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <IconUserSearch stroke={2} color="var(--mantine-color-white)" />
          <Title order={4} c="white">
            Patient Search
          </Title>
        </Group>
      }
      size="25%"
    >
      <Stack h="100%" justify="space-between" gap={0}>
        <Box flex={1} miw={0}>
          <Grid p="md" h="100%">
            <Grid.Col span={12} pr="md">
              <Stack gap="md">
                <Text size="sm">
                  If one patient matches, their chart opens automatically. If multiple patients match, choose the
                  correct patient from the list.
                </Text>

                <Group align="flex-end">
                  <Box flex={1} miw={0}>
                    <TextInput
                      label="Case ID"
                      value={formValues.caseId}
                      onChange={(e) => onChange('caseId', e.currentTarget.value)}
                    />
                  </Box>
                  <Text mb={7}>or</Text>
                  <Box flex={1} miw={0}>
                    <TextInput
                      label="MRN"
                      value={formValues.mrn}
                      onChange={(e) => onChange('mrn', e.currentTarget.value)}
                    />
                  </Box>
                </Group>

                <TextInput
                  label="First Name"
                  value={formValues.firstName}
                  onChange={(e) => onChange('firstName', e.currentTarget.value)}
                />

                <TextInput
                  label="Last Name"
                  value={formValues.lastName}
                  onChange={(e) => onChange('lastName', e.currentTarget.value)}
                />

                <Group grow>
                  <TextInput
                    label="DOB"
                    type="date"
                    value={formValues.birthDate}
                    onChange={(e) => onChange('birthDate', e.currentTarget.value)}
                  />
                  <Select
                    label="Gender"
                    clearable
                    data={genderOptions}
                    value={formValues.gender}
                    onChange={(value) => onChange('gender', value)}
                  />
                </Group>

                <Group justify="flex-end" mt={10}>
                  <Button variant="outline" onClick={onReset}>
                    Reset
                  </Button>
                  <Button onClick={onFind} loading={loading}>
                    Find
                  </Button>
                </Group>
              </Stack>
            </Grid.Col>
          </Grid>
        </Box>
      </Stack>
    </AppModal>
  );
}
