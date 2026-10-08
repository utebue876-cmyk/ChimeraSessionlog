import { Button, Checkbox, Group, LoadingOverlay, Paper, Select, Stack, Text, TextInput, Title } from '@mantine/core';
import type { InsurancePlan, Organization } from '@medplum/fhirtypes';
import { Document, ResourceInput, useMedplum } from '@medplum/react';
import { type ChangeEvent, type JSX } from 'react';
import { DateField } from '../../components/common/DateField';
import { AVIVA_HEALTH_NAME, FIELD_MAX_LENGTH, OPTIMA_HEALTH_NAME, VITALITY_HEALTH_NAME } from '../../config/constants';
import { getCurrentOrganisationName } from '../../config/projectOrganization';
import { DuplicatePatientModal } from '../patient/DuplicatePatientModal';
import { usePatientIntakeForm } from './usePatientIntakeForm';

export function PatientIntakeFormPage(): JSX.Element {
  const medplum = useMedplum();
  const currentOrganizationName = getCurrentOrganisationName(medplum);
  const {
    values,
    errors,
    set,
    serviceTypeOptions,
    serviceTypeLoading: _serviceTypeLoading,
    submitting,
    matchingPatients,
    handleSubmit,
    handleOpenMatchingPatient,
    handleDismissMatchingPatients,
  } = usePatientIntakeForm();

  const isOptima = values.insuranceProviderRef?.display === OPTIMA_HEALTH_NAME;
  const isAviva = values.insuranceProviderRef?.display === AVIVA_HEALTH_NAME;
  const isVitality = values.insuranceProviderRef?.display === VITALITY_HEALTH_NAME;

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
        <Stack>
          <Title order={3} style={{ color: 'white' }}>
            Patient Intake
          </Title>
          <Text size="sm" c="white" opacity={0.85}>
            Complete all required fields to register the patient. Fields marked with an asterisk (*) are mandatory.
            Please ensure that the information provided is accurate and up-to-date.
          </Text>
        </Stack>
      </Paper>

      <Stack gap="sx" p="md" pos="relative">
        <LoadingOverlay visible={submitting} overlayProps={{ radius: 'sm', blur: 2 }} />
        <Stack
          gap="xs"
          style={{ flex: 1, backgroundColor: 'var(--mantine-color-gray-0)', padding: 16, borderRadius: 8 }}
        >
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
        </Stack>

        <Stack gap="xs">
          <Group align="flex-start">
            <Stack
              gap="xs"
              style={{ flex: 1, backgroundColor: 'var(--mantine-color-gray-0)', padding: 16, borderRadius: 8 }}
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
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  set('homePostcode', e.currentTarget.value.toUpperCase())
                }
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
              style={{ flex: 1, backgroundColor: 'var(--mantine-color-gray-0)', padding: 16, borderRadius: 8 }}
            >
              <Title order={5} c="dark" mb="xs">
                Work Contact Details{' '}
                <Text component="span" size="sm" c="dimmed">
                  (optional)
                </Text>
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
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  set('workPostcode', e.currentTarget.value.toUpperCase())
                }
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

          <Group align="flex-start" mt="xs">
            <Stack
              gap="xs"
              style={{ flex: 1, backgroundColor: 'var(--mantine-color-gray-0)', padding: 16, borderRadius: 8 }}
            >
              <Title order={5} c="dark" mb="xs">
                Coverage Information
              </Title>
              <ResourceInput
                resourceType="Organization"
                name="healthcare-provider"
                label="Service Line"
                required
                searchCriteria={{ 'partof:Organization.name': currentOrganizationName }}
                onChange={(org) =>
                  set(
                    'healthcareProviderRef',
                    org
                      ? { reference: `Organization/${(org as Organization).id}`, display: (org as Organization).name }
                      : null
                  )
                }
                error={!!errors.healthcareProviderRef}
              />
              <ResourceInput
                resourceType="Organization"
                name="insurance-provider"
                label="Client/Funder"
                required
                searchCriteria={{ type: 'http://terminology.hl7.org/CodeSystem/organization-type|pay' }}
                onChange={(org) => {
                  const o = org as Organization | undefined;
                  set('insuranceProviderRef', o ? { reference: `Organization/${o.id}`, display: o.name } : null);
                }}
                error={!!errors.insuranceProviderRef}
              />
              {(isAviva || isVitality) && (
                <ResourceInput
                  resourceType="InsurancePlan"
                  name="insurance-plan"
                  label="Insurance Plan"
                  required
                  searchCriteria={{ 'owned-by': values.insuranceProviderRef?.reference ?? '' }}
                  onChange={(plan) => {
                    const p = plan as InsurancePlan | undefined;
                    set('insurancePlanRef', p ? { reference: `InsurancePlan/${p.id}`, display: p.name } : null);
                  }}
                  error={!!errors.insurancePlanRef}
                />
              )}
              {isOptima && (
                <>
                  <ResourceInput
                    resourceType="Organization"
                    name="optima-employer"
                    label="Employer"
                    required
                    searchCriteria={{ partof: values.insuranceProviderRef?.reference ?? '', type: 'Employer' }}
                    onChange={(org) => {
                      const o = org as Organization | undefined;
                      set('optimaEmployerRef', o ? { reference: `Organization/${o.id}`, display: o.name } : null);
                    }}
                    error={!!errors.optimaEmployerRef}
                  />
                  <TextInput
                    label="Location"
                    withAsterisk
                    value={values.optimaLocation}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => set('optimaLocation', e.currentTarget.value)}
                    error={!!errors.optimaLocation}
                  />
                  <TextInput
                    label="Facility"
                    withAsterisk
                    value={values.optimaFacility}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => set('optimaFacility', e.currentTarget.value)}
                    error={!!errors.optimaFacility}
                  />
                </>
              )}
              <TextInput
                label="Policy/Membership Number"
                value={values.subscriberId}
                onChange={(e: ChangeEvent<HTMLInputElement>) => set('subscriberId', e.currentTarget.value)}
                maxLength={FIELD_MAX_LENGTH.policyNumber}
              />
            </Stack>
            <Stack
              gap="xs"
              style={{ flex: 1, backgroundColor: 'var(--mantine-color-gray-0)', padding: 16, borderRadius: 8 }}
            >
              <Title order={5} c="dark" mb="xs">
                Intake or Referral Information
              </Title>

              <DateField
                label="Referral / Intake Date"
                withAsterisk
                value={values.referralDate}
                onChange={(value) => set('referralDate', value)}
                error={!!errors.referralDate}
                disableFutureDates
              />
              <Select
                label="Referral Type"
                withAsterisk
                placeholder={values.insuranceProviderRef ? 'Select referral type' : 'Select a Client/Funder first'}
                data={serviceTypeOptions}
                value={values.serviceTypeCode || null}
                onChange={(v) => {
                  const label = serviceTypeOptions.find((o) => o.value === v)?.label ?? v ?? '';
                  set('serviceTypeCode', v ?? '');
                  set('serviceTypeDisplay', label);
                }}
                // disabled={!values.insuranceProviderRef || serviceTypeLoading}
                error={!!errors.serviceTypeCode}
                searchable
                clearable
              />
            </Stack>
          </Group>

          <Group
            align="flex-start"
            style={{
              flex: 1,
              backgroundColor: 'var(--mantine-color-gray-0)',
              padding: 16,
              borderRadius: 8,
              marginTop: 10,
            }}
          >
            <Stack gap="xs" style={{ flex: 1 }}>
              <Title order={5} c="dark" mb="md">
                Consent for Treatment
              </Title>
              <Checkbox
                label="Consent to assessment and data processing"
                checked={values.consentForTreatment}
                onChange={(e) => {
                  set('consentForTreatment', e.currentTarget.checked);
                  if (!e.currentTarget.checked) set('consentDate', '');
                }}
              />
            </Stack>
            <Stack gap="xs" style={{ flex: 1, marginTop: 30, marginLeft: 24 }}>
              <DateField
                label="Consent Date"
                withAsterisk={values.consentForTreatment}
                value={values.consentDate}
                onChange={(value) => set('consentDate', value)}
                error={!!errors.consentDate}
                disabled={!values.consentForTreatment}
                disableFutureDates
                maw={240}
              />
            </Stack>
          </Group>
        </Stack>
        <Group justify="flex-end">
          <Button size="md" color="blue" onClick={() => void handleSubmit()} loading={submitting}>
            Submit
          </Button>
        </Group>
      </Stack>

      <DuplicatePatientModal
        patients={matchingPatients}
        onClose={handleDismissMatchingPatients}
        onOpenPatient={handleOpenMatchingPatient}
      />
    </Document>
  );
}
