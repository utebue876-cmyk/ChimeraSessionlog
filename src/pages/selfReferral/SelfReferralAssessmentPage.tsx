import { Alert, Button, Checkbox, Group, Paper, Radio, SimpleGrid, Stack, Text, Textarea, Title } from '@mantine/core';
import { Document } from '@medplum/react';
import type { ChangeEvent, JSX } from 'react';
import { SelfReferralStepper } from './SelfReferralStepper';
import { TRIGGERING_FACTOR_OPTIONS } from './selfReferralSchema';
import { useSelfReferralAssessment } from './useSelfReferralAssessment';

export function SelfReferralAssessmentPage(): JSX.Element {
  const { values, errors, set, handleNext } = useSelfReferralAssessment();

  return (
    <Document width={800} fill>
      <Paper
        p="lg"
        style={{
          backgroundColor: 'var(--mantine-color-blue-9)',
          borderBottomRightRadius: 0,
          borderBottomLeftRadius: 0,
          borderTopRightRadius: 8,
          borderTopLeftRadius: 8,
        }}
      >
        <Stack gap="sm">
          <Title order={3} style={{ color: 'white' }}>
            IPRS Mental Health Screening Assessment
          </Title>
          <Text size="sm" c="var(--mantine-color-white)">
            This is only for employees on the{' '}
            <Text component="span" fw={700} size="sm">
              Anglian Water Healthcare Scheme with a Gold or Silver membership
            </Text>
            . Dependants under the age of 16 will require a GP referral, and then to access the service the policy
            holder will need to contact Alliance Health Group on the dependant's behalf.
          </Text>
          <Text size="sm" c="var(--mantine-color-white)">
            Prior to completing this form, please ensure that you have checked with Alliance Health Group to verify that
            you have the necessary membership benefit level to access the service.
          </Text>
          <Text size="sm" c="var(--mantine-color-white)">
            Please note to access IPRS Health services we will need to collect and validate a payment card on the next
            page, in case we need to collect your £50 excess payment per scheme year.
          </Text>
          <Alert color="var(--mantine-color-red-5)" p={0}>
            <Text fw={700} c="var(--mantine-color-red-5)" size="sm">
              Please be aware that this is not an instant response crisis service.
            </Text>
          </Alert>
          <Text size="sm" c="var(--mantine-color-white)">
            If you are experiencing a crisis, and you feel unable to keep yourself safe, you should call your GP (or
            your GP out of hours service), visit your local accident and emergency department, call 999 or the
            Samaritans on 116 123.
          </Text>
          <Text size="sm" c="var(--mantine-color-white)">
            If you choose to proceed with this initial screening assessment to determine suitability for the service,
            please complete the form below.
          </Text>
        </Stack>
      </Paper>

      <SelfReferralStepper currentStep={0} />

      <Stack pl="lg" pr="lg" pb="lg">
        <Radio.Group
          label="1. Do you currently feel that your mental health symptoms cause an imminent risk of harm to yourself or to other people?"
          withAsterisk
          value={values.riskOfHarm}
          onChange={(v) => set('riskOfHarm', v)}
          error={errors.riskOfHarm}
        >
          <Group mt="xs">
            <Radio value="true" label="Yes" />
            <Radio value="false" label="No" />
          </Group>
        </Radio.Group>

        {values.riskOfHarm === 'true' && (
          <Alert color="red" title="Crisis support required">
            <Text size="sm">
              This service is not able to support you in a crisis. Please call <strong>999</strong>, visit your nearest
              A&amp;E, or call the Samaritans on <strong>116 123</strong>.
            </Text>
          </Alert>
        )}

        <Textarea
          label="2. What protective factors do you have in your life to help you manage how you feel and keep yourself safe?"
          description="e.g. relationships, family, friends, GP, employment, hobbies/interests, other coping strategies"
          autosize
          minRows={3}
          value={values.protectiveFactors}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => set('protectiveFactors', e.currentTarget.value)}
        />

        <Checkbox.Group
          label="3. Which factor(s) do you feel have triggered the challenges with your Mental Health?"
          value={values.triggeringFactors}
          onChange={(v) => set('triggeringFactors', v)}
        >
          <SimpleGrid cols={3} spacing="xs" mt="xs">
            {TRIGGERING_FACTOR_OPTIONS.map((opt) => (
              <Checkbox key={opt.value} value={opt.value} label={opt.label} />
            ))}
          </SimpleGrid>
        </Checkbox.Group>

        <Radio.Group
          label="4. Do you use alcohol, tobacco, or other substances to cope with your Mental Health?"
          value={values.substanceUse}
          onChange={(v) => set('substanceUse', v)}
        >
          <Group mt="xs">
            <Radio value="true" label="Yes" />
            <Radio value="false" label="No" />
          </Group>
        </Radio.Group>

        <Radio.Group
          label="5. Have you suffered from any other psychological problems in the past?"
          value={values.pastPsychologicalProblems}
          onChange={(v) => set('pastPsychologicalProblems', v)}
        >
          <Group mt="xs">
            <Radio value="true" label="Yes" />
            <Radio value="false" label="No" />
          </Group>
        </Radio.Group>

        <Radio.Group
          label="6. Have you had psychological therapy in the past?"
          value={values.pastTherapy}
          onChange={(v) => set('pastTherapy', v)}
        >
          <Group mt="xs">
            <Radio value="true" label="Yes" />
            <Radio value="false" label="No" />
          </Group>
        </Radio.Group>

        <Radio.Group
          label="7. Are you on medication for a mental health problem?"
          value={values.mentalHealthMedication}
          onChange={(v) => set('mentalHealthMedication', v)}
        >
          <Group mt="xs">
            <Radio value="true" label="Yes" />
            <Radio value="false" label="No" />
          </Group>
        </Radio.Group>

        <Textarea
          label="8. Describe the main problem you want to address through therapy"
          autosize
          minRows={3}
          value={values.mainProblem}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => set('mainProblem', e.currentTarget.value)}
        />

        <Textarea
          label="9. When did this problem start?"
          autosize
          minRows={3}
          value={values.problemStart}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => set('problemStart', e.currentTarget.value)}
        />

        <Textarea
          label="10. What aspects of the problem bother you the most and what are the main symptoms of this?"
          autosize
          minRows={3}
          value={values.problemAspectsSymptoms}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => set('problemAspectsSymptoms', e.currentTarget.value)}
        />

        <Group justify="flex-end" mt="md">
          <Button onClick={handleNext} disabled={values.riskOfHarm === 'true'}>
            Next
          </Button>
        </Group>
      </Stack>
    </Document>
  );
}
