import {
  Button,
  Divider,
  FileInput,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { formatHumanName } from '@medplum/core';
import { ResourceAvatar } from '@medplum/react';
import { IconUserEdit } from '@tabler/icons-react';
import type { ChangeEvent, JSX } from 'react';
import { DateField } from '../../components/common/DateField';
import { FIELD_MAX_LENGTH } from '../../config/constants';
import { useEditPatientPage } from './useEditPatientPage';

export function EditPatientPage(): JSX.Element {
  const {
    patient,
    previewPatient,
    values,
    errors,
    set,
    onPhotoChange,
    onDeletePhoto,
    loading,
    submitting,
    handleSubmit,
    handleCancel,
  } = useEditPatientPage();

  if (loading || !patient) {
    return (
      <Group justify="center" py={80} m="sm">
        <Loader />
      </Group>
    );
  }

  return (
    <Paper shadow="sm" radius="sm" withBorder m="sm" style={{ maxWidth: 800 }}>
      <Paper p="lg" shadow="none">
        <Group gap="sm" justify="space-between">
          <Group gap="sm">
            <ThemeIcon size={48} radius="xl" color="blue" variant="light">
              <IconUserEdit size={24} />
            </ThemeIcon>
            <Stack gap={2}>
              <Title order={4} style={{ color: 'black' }}>
                Edit Patient
              </Title>
              <Text size="sm" c="black" opacity={0.85}>
                {patient.name?.[0] ? formatHumanName(patient.name[0]) : 'Unknown Patient'}
              </Text>
            </Stack>
          </Group>
          <ResourceAvatar
            value={previewPatient}
            size={64}
            radius={64}
            style={{ border: '3px solid var(--mantine-color-blue-2)' }}
          />
        </Group>
      </Paper>
      <Divider color="var(--mantine-color-gray-2)" />
      <Stack gap="xs" p="md">
        <Stack gap="xs">
          <Group grow align="flex-start">
            <TextInput
              label="First Name"
              withAsterisk
              value={values.firstName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('firstName', e.currentTarget.value)}
              maxLength={FIELD_MAX_LENGTH.firstName}
              error={!!errors.firstName}
            />
            <TextInput
              label="Last Name"
              withAsterisk
              value={values.lastName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('lastName', e.currentTarget.value)}
              maxLength={FIELD_MAX_LENGTH.lastName}
              error={!!errors.lastName}
            />
          </Group>
          <Group grow align="flex-start">
            <DateField
              label="Date of Birth"
              withAsterisk
              value={values.dob}
              onChange={(value) => set('dob', value)}
              error={!!errors.dob}
              minDate="1900-01-01"
              disableFutureDates
            />
            <Select
              label="Gender"
              withAsterisk
              placeholder="Select gender"
              data={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
                { value: 'unknown', label: 'Unknown' },
              ]}
              value={values.gender}
              onChange={(v) => set('gender', v ?? '')}
              error={!!errors.gender}
            />
          </Group>
          <Group align="flex-end" gap="sm">
            <FileInput
              label="Patient Photo"
              placeholder="Choose a photo"
              accept="image/*"
              clearable
              onChange={onPhotoChange}
              style={{ flex: 1 }}
            />
            <Button variant="outline" color="red" onClick={onDeletePhoto} disabled={!previewPatient?.photo?.length}>
              Delete Photo
            </Button>
          </Group>
        </Stack>
        <Divider my="sm" ml="-15px" mr="-15px" color="var(--mantine-color-gray-2)" />
        <Group align="flex-start">
          <Stack
            gap="xs"
            style={{
              flex: 1,
              backgroundColor: 'var(--mantine-color-white-0)',
              padding: 16,
              borderRadius: 8,
              borderColor: 'var(--mantine-color-gray-2)',
              borderWidth: 1,
              borderStyle: 'solid',
            }}
          >
            <Title order={5} c="dark" mb="xs">
              Home Contact Details
            </Title>
            <TextInput
              label="Address Line 1"
              withAsterisk
              value={values.homeAddressLine1}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('homeAddressLine1', e.currentTarget.value)}
              maxLength={FIELD_MAX_LENGTH.addressLine1}
              error={!!errors.homeAddressLine1}
            />
            <TextInput
              label="Address Line 2"
              value={values.homeAddressLine2}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('homeAddressLine2', e.currentTarget.value)}
              maxLength={FIELD_MAX_LENGTH.addressLine2}
            />
            <TextInput
              label="Town/City"
              withAsterisk
              value={values.homeCity}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('homeCity', e.currentTarget.value)}
              maxLength={FIELD_MAX_LENGTH.city}
              error={!!errors.homeCity}
            />
            <TextInput
              label="County"
              value={values.homeCounty}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('homeCounty', e.currentTarget.value)}
              maxLength={FIELD_MAX_LENGTH.county}
            />
            <TextInput
              label="Postcode"
              withAsterisk
              value={values.homePostcode}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('homePostcode', e.currentTarget.value.toUpperCase())}
              maxLength={FIELD_MAX_LENGTH.postcode}
              error={!!errors.homePostcode}
            />
            <TextInput
              label="Phone Number"
              withAsterisk
              inputMode="numeric"
              value={values.homePhone}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                set('homePhone', e.currentTarget.value.replace(/\D/g, ''))
              }
              maxLength={FIELD_MAX_LENGTH.phone}
              error={!!errors.homePhone}
            />
            <TextInput
              label="Email"
              value={values.homeEmail}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('homeEmail', e.currentTarget.value)}
              maxLength={FIELD_MAX_LENGTH.email}
              error={!!errors.homeEmail}
            />
          </Stack>
          <Stack
            gap="xs"
            style={{
              flex: 1,
              backgroundColor: 'var(--mantine-color-white-0)',
              padding: 16,
              borderRadius: 8,
              borderColor: 'var(--mantine-color-gray-2)',
              borderWidth: 1,
              borderStyle: 'solid',
            }}
          >
            <Title order={5} c="dark" mb="xs">
              Work Contact Details{' '}
            </Title>
            <TextInput
              label="Address Line 1"
              value={values.workAddressLine1}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('workAddressLine1', e.currentTarget.value)}
              maxLength={FIELD_MAX_LENGTH.addressLine1}
            />
            <TextInput
              label="Address Line 2"
              value={values.workAddressLine2}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('workAddressLine2', e.currentTarget.value)}
              maxLength={FIELD_MAX_LENGTH.addressLine2}
            />
            <TextInput
              label="Town/City"
              value={values.workCity}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('workCity', e.currentTarget.value)}
              maxLength={FIELD_MAX_LENGTH.city}
            />
            <TextInput
              label="County"
              value={values.workCounty}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('workCounty', e.currentTarget.value)}
              maxLength={FIELD_MAX_LENGTH.county}
            />
            <TextInput
              label="Postcode"
              value={values.workPostcode}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('workPostcode', e.currentTarget.value.toUpperCase())}
              maxLength={FIELD_MAX_LENGTH.postcode}
              error={!!errors.workPostcode}
            />
            <TextInput
              label="Phone Number"
              inputMode="numeric"
              value={values.workPhone}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                set('workPhone', e.currentTarget.value.replace(/\D/g, ''))
              }
              maxLength={FIELD_MAX_LENGTH.phone}
            />
            <TextInput
              label="Email"
              value={values.workEmail}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('workEmail', e.currentTarget.value)}
              error={!!errors.workEmail}
              maxLength={FIELD_MAX_LENGTH.email}
            />
          </Stack>
        </Group>
        <Divider my="sm" ml="-15px" mr="-15px" color="var(--mantine-color-gray-2)" />
        <Group justify="flex-start">
          <Button onClick={handleSubmit} loading={submitting} disabled={submitting}>
            Save Changes
          </Button>
          <Button variant="default" onClick={handleCancel} disabled={submitting}>
            Cancel
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
