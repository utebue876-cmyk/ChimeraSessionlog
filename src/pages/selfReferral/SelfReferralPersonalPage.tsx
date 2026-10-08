import { Button, Checkbox, Divider, Group, Paper, Select, Stack, Text, TextInput, Title } from '@mantine/core';
import { Document } from '@medplum/react';
import type { ChangeEvent, JSX } from 'react';
import { FIELD_MAX_LENGTH } from '../../config/constants';
import { formatPostcode } from '../../utils/cardDetails';
import { SelfReferralStepper } from './SelfReferralStepper';
import { useSelfReferralPersonal } from './useSelfReferralPersonal';

export function SelfReferralPersonalPage(): JSX.Element {
  const { values, errors, set, handleNext, goBack } = useSelfReferralPersonal();

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
            Personal Details
          </Title>
          <Text size="sm" c="var(--mantine-color-white)">
            Please provide your personal details below. This information is required to process your self-referral.
          </Text>
        </Stack>
      </Paper>

      <SelfReferralStepper currentStep={1} />

      <Stack pl="lg" pr="lg" pb="lg">
        <Stack gap="md">
          <Group align="flex-start" gap="md">
            <Stack style={{ flex: 1 }}>
              <TextInput
                label="First Name"
                withAsterisk
                value={values.firstName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => set('firstName', e.currentTarget.value)}
                error={!!errors.firstName}
                maxLength={FIELD_MAX_LENGTH.firstName}
              />
              <TextInput
                label="Last Name"
                withAsterisk
                value={values.lastName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => set('lastName', e.currentTarget.value)}
                maxLength={FIELD_MAX_LENGTH.lastName}
                error={!!errors.lastName}
              />
              <TextInput
                label="Date of Birth"
                withAsterisk
                type="date"
                value={values.dob}
                onChange={(e: ChangeEvent<HTMLInputElement>) => set('dob', e.currentTarget.value)}
                error={!!errors.dob}
              />
              <Select
                label="Gender"
                placeholder="Select gender"
                withAsterisk
                data={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ]}
                value={values.gender}
                onChange={(value) => set('gender', value ?? '')}
                error={!!errors.gender}
              />
              <TextInput
                label="Contact No."
                withAsterisk
                value={values.phone}
                onChange={(e: ChangeEvent<HTMLInputElement>) => set('phone', e.currentTarget.value)}
                maxLength={FIELD_MAX_LENGTH.phone}
                error={!!errors.phone}
              />
              <TextInput
                label="Email Address"
                withAsterisk
                value={values.email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => set('email', e.currentTarget.value)}
                maxLength={FIELD_MAX_LENGTH.email}
                error={!!errors.email}
              />
            </Stack>
            <Stack style={{ flex: 1 }}>
              <TextInput
                label="Address Line 1"
                withAsterisk
                value={values.addressLine1}
                onChange={(e: ChangeEvent<HTMLInputElement>) => set('addressLine1', e.currentTarget.value)}
                maxLength={FIELD_MAX_LENGTH.addressLine1}
                error={!!errors.addressLine1}
              />
              <TextInput
                label="Address Line 2"
                value={values.addressLine2}
                onChange={(e: ChangeEvent<HTMLInputElement>) => set('addressLine2', e.currentTarget.value)}
                maxLength={FIELD_MAX_LENGTH.addressLine2}
              />
              <TextInput
                label="Town"
                withAsterisk
                value={values.town}
                onChange={(e: ChangeEvent<HTMLInputElement>) => set('town', e.currentTarget.value)}
                maxLength={FIELD_MAX_LENGTH.city}
                error={!!errors.town}
              />
              <TextInput
                label="County"
                withAsterisk
                value={values.county}
                onChange={(e: ChangeEvent<HTMLInputElement>) => set('county', e.currentTarget.value)}
                maxLength={FIELD_MAX_LENGTH.county}
                error={!!errors.county}
              />
              <TextInput
                label="Postcode"
                withAsterisk
                value={values.postcode}
                onChange={(e: ChangeEvent<HTMLInputElement>) => set('postcode', formatPostcode(e.currentTarget.value))}
                maxLength={FIELD_MAX_LENGTH.postcode}
                error={!!errors.postcode}
              />
            </Stack>
          </Group>
        </Stack>

        <Divider />

        <Stack gap="sm">
          <Text size="sm">
            To be able to manage your referral, IPRS Health needs to process and store your data.{' '}
            <Text component="span" fw={700} size="sm">
              Do you agree that IPRS Health can process and store your personal data in order to manage your referral?
            </Text>
          </Text>
          <Checkbox
            label="Yes, I agree"
            checked={values.consentDataProcessing}
            onChange={(e) => set('consentDataProcessing', e.currentTarget.checked)}
            error={!!errors.consentDataProcessing}
          />

          <Text size="sm" mt="sm">
            To be able to progress your referral, IPRS Health needs to share information with relevant people and
            organisations.{' '}
            <Text component="span" fw={700} size="sm">
              Do you agree that IPRS Health can share personal and, where appropriate, medical information with our
              selected clinical supply chain providers and:
            </Text>
          </Text>
          <Checkbox
            label="Alliance Health Group"
            checked={values.consentShareAlliance}
            onChange={(e) => set('consentShareAlliance', e.currentTarget.checked)}
            error={!!errors.consentShareAlliance}
          />
          <Checkbox
            label="Anglian Water"
            checked={values.consentShareAnglianWater}
            onChange={(e) => set('consentShareAnglianWater', e.currentTarget.checked)}
            error={!!errors.consentShareAnglianWater}
          />
          <Text size="xs" c="dimmed" mt="xs">
            Please be aware that, under Data Protection legislation, you are able to withdraw this consent at any time
            by contacting IPRS Health.
          </Text>
        </Stack>

        <Group justify="right" mt="md">
          <Button variant="outline" onClick={goBack}>
            Previous
          </Button>
          <Button onClick={handleNext}>Next</Button>
        </Group>
      </Stack>
    </Document>
  );
}
