import {
  Button,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { type ChangeEvent, type JSX } from 'react';
import { getTodayIsoDate } from '../../utils/dateUtils';
import type { ConfirmedTreatmentPathway } from './useTreatmentPathway';
import { useTreatmentPathway } from './useTreatmentPathway';

interface TreatmentPathwayProps {
  onConfirm: (confirmed: ConfirmedTreatmentPathway) => void;
}

export function TreatmentPathway({ onConfirm }: TreatmentPathwayProps): JSX.Element {
  const {
    values,
    errors,
    set,
    confirmPathway,
    submitting,
    loading,
    diagnosisOptions,
    diagnosisOptionsLoading,
    pathwayOptions,
    pathwayOptionsLoading,
    caseLabel,
    funderLabel,
    policyLabel,
    assessingClinicianLabel,
    phq9Score,
    phq9InterpretationLabel,
    gad7Score,
    gad7InterpretationLabel,
  } = useTreatmentPathway();

  if (loading) {
    return (
      <Paper shadow="xs" m="xs" p="md" maw={800}>
        <Group justify="center" align="center" py={80}>
          <Loader />
        </Group>
      </Paper>
    );
  }

  return (
    <Paper shadow="xs" withBorder m="xs" p="md" maw={800}>
      <Stack gap="xs">
        <Text size="lg" fw={600}>
          Select Treatment Pathway
        </Text>
        <Text size="sm" c="dark">
          Choose the pathway and record the authorisation.
        </Text>

        <Paper
          p="md"
          radius="sm"
          shadow="none"
          style={{ backgroundColor: 'var(--mantine-color-blue-0)', border: '1px solid var(--mantine-color-blue-2)' }}
        >
          <Group gap="xl">
            <Text size="sm">
              Case ID:{' '}
              <Text component="span" fw={600}>
                {caseLabel}
              </Text>
            </Text>
            <Text size="sm">
              Funder:{' '}
              <Text component="span" fw={600}>
                {funderLabel}
              </Text>
            </Text>
            <Text size="sm">
              Policy:{' '}
              <Text component="span" fw={600}>
                {policyLabel}
              </Text>
            </Text>
            <Text size="sm">
              Assessing clinician:{' '}
              <Text component="span" fw={600}>
                {assessingClinicianLabel}
              </Text>
            </Text>
          </Group>
        </Paper>

        <Text size="xs" fw={700} c="gray.7" mt="sm" style={{ letterSpacing: '0.075em' }}>
          FROM THE INITIAL ASSESSMENT
        </Text>
        <SimpleGrid cols={5} spacing="md">
          <Paper withBorder p="sm" radius="sm" shadow="none">
            <Text size="sm" c="dimmed">
              PHQ-9
            </Text>
            <Text size="sm" fw={600}>
              {phq9Score ?? 'None'}
            </Text>
            <Text size="xs" c="dimmed">
              {phq9InterpretationLabel}
            </Text>
          </Paper>
          <Paper withBorder p="sm" radius="sm" shadow="none">
            <Text size="sm" c="dimmed">
              GAD-7
            </Text>
            <Text size="sm" fw={600}>
              {gad7Score ?? 'None'}
            </Text>
            <Text size="xs" c="dimmed">
              {gad7InterpretationLabel}
            </Text>
          </Paper>
          <Paper withBorder p="sm" radius="sm" shadow="none">
            <Text size="sm" c="dimmed">
              WSAS
            </Text>
            <Text size="sm" fw={600}>
              N/A
            </Text>
            <Text size="xs" c="dimmed">
              No Indicators
            </Text>
          </Paper>
          <Paper withBorder p="sm" radius="sm" shadow="none">
            <Text size="sm" c="dimmed">
              RISK
            </Text>
            <Text size="sm" fw={600}>
              TBC
            </Text>
            <Text size="xs" c="dimmed">
              No Indicators
            </Text>
          </Paper>
        </SimpleGrid>

        <Text size="xs" fw={700} c="gray.7" mt="sm" style={{ letterSpacing: '0.075em' }}>
          DIAGNOSIS
        </Text>
        <Group grow align="flex-start">
          <Select
            label="Primary diagnosis"
            withAsterisk
            placeholder="— Select —"
            data={diagnosisOptions}
            value={values.primaryDiagnosis}
            onChange={(v) => set('primaryDiagnosis', v)}
            disabled={diagnosisOptionsLoading}
            error={!!errors.primaryDiagnosis}
          />
          <Stack gap={4}>
            <Select
              label="Secondary diagnosis"
              placeholder="— None —"
              data={diagnosisOptions}
              value={values.secondaryDiagnosis}
              onChange={(v) => set('secondaryDiagnosis', v)}
              disabled={diagnosisOptionsLoading}
              clearable
            />
            <Text size="xs" c="dimmed">
              Optional. Carried on 45% of cases in the live extract.
            </Text>
          </Stack>
        </Group>

        <Stack gap={4}>
          <Select
            label="Treatment pathway"
            withAsterisk
            placeholder="— Select —"
            data={pathwayOptions}
            value={values.pathway}
            onChange={(v) => set('pathway', v)}
            disabled={pathwayOptionsLoading}
            error={!!errors.pathway}
          />
          <Text size="xs" c="dimmed">
            Showing {pathwayOptions.length} pathways commissioned by {funderLabel}.
          </Text>
        </Stack>

        <Group grow align="flex-start" mt="sm">
          <Stack gap={4}>
            <NumberInput
              label="Sessions authorised"
              withAsterisk
              min={1}
              max={8}
              value={values.sessionsAuthorised}
              onChange={(v) => set('sessionsAuthorised', typeof v === 'number' ? v : '')}
              error={!!errors.sessionsAuthorised}
            />
            <Text size="xs" c="dimmed">
              Standard {funderLabel} block is 6. Ceiling 8.
            </Text>
          </Stack>
          <Stack gap={4}>
            <TextInput
              label={`${funderLabel} authorisation reference`}
              placeholder="AV-2026-0000000"
              value={values.authorisationReference}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('authorisationReference', e.currentTarget.value)}
            />
            <Text size="xs" c="dimmed">
              Optional.
            </Text>
          </Stack>
        </Group>

        <Textarea
          label="Clinical rationale for pathway selection"
          withAsterisk
          placeholder="Presentation, indication for this pathway, and reason for the delivery mode."
          autosize
          minRows={3}
          value={values.clinicalRationale}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => set('clinicalRationale', e.currentTarget.value)}
          error={!!errors.clinicalRationale}
          mt="sm"
        />

        <Group justify="flex-start" mt="md">
          <Button
            color="blue"
            loading={submitting}
            onClick={async () => {
              const saved = await confirmPathway();
              if (!saved) return;
              const pathwayLabel =
                pathwayOptions.find((o) => o.value === values.pathway)?.label ?? values.pathway ?? '';
              onConfirm({
                pathwayLabel,
                sessionsAuthorised: typeof values.sessionsAuthorised === 'number' ? values.sessionsAuthorised : 0,
                authorisationReference: values.authorisationReference,
                startedDate: getTodayIsoDate(),
                caseLabel,
                funderLabel,
              });
            }}
          >
            Confirm pathway
          </Button>
          <Button variant="default">Cancel</Button>
        </Group>
      </Stack>
    </Paper>
  );
}
