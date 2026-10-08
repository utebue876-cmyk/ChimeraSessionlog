import { Alert, Box, Button, Divider, Grid, Group, Select, Stack, Switch, Text, TextInput, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { createReference, formatHumanName } from '@medplum/core';
import type { EpisodeOfCare, HumanName, InsurancePlan, Organization, Patient, Practitioner } from '@medplum/fhirtypes';
import { ResourceInput, useMedplum } from '@medplum/react';
import type { JSX } from 'react';
import { useState } from 'react';
import { AppModal } from '../../components/modal/AppModal';
import { getCurrentOrganisationName } from '../../config/projectOrganization';
import { useCaseModal } from './useCaseModal';

interface CaseModalProps {
  patient: Patient;
  opened: boolean;
  onClose: () => void;
  episode?: EpisodeOfCare;
  onCreated?: (episodeOfCare: EpisodeOfCare) => void;
  onSaved?: (episodeOfCare: EpisodeOfCare) => void;
  editMode?: boolean;
}

export function CaseModal({
  patient,
  opened,
  onClose,
  episode,
  onCreated,
  onSaved,
  editMode,
}: CaseModalProps): JSX.Element {
  const {
    status: _status,
    setStatus: _setStatus,
    serviceTypeCode,
    setServiceTypeCode,
    openedDate,
    setOpenedDate,
    mhCaseStateCode,
    setMhCaseStateCode,
    managingOrganization: _managingOrganization,
    setManagingOrganization,
    setManagingOrganizationName,
    managingOrganizationResource,
    insuranceProvider,
    setInsuranceProvider,
    setInsuranceProviderName,
    setInsuranceProviderResource,
    insuranceProviderResource,
    insurancePlan: _insurancePlan,
    setInsurancePlan,
    setInsurancePlanResource,
    insurancePlanResource,
    requiresInsurancePlan,
    policyNumber,
    setPolicyNumber,
    careManager: _careManager,
    setCareManager,
    setCareManagerName,
    careManagerResource,
    isLoading,
    isEditMode,
    statusOptions: _statusOptions,
    mhCaseStateOptions,
    serviceTypeOptions,
    fieldErrors,
    handleSaveCase,
    consentSigned,
    setConsentSigned,
    consentDate,
    setConsentDate,
    optimaEmployer: _optimaEmployer,
    setOptimaEmployer,
    setOptimaEmployerResource,
    optimaEmployerResource,
    optimaLocation,
    setOptimaLocation,
    optimaFacility,
    setOptimaFacility,
    hasOptimaExtension,
  } = useCaseModal({ patient, opened, onClose, episode, onCreated, onSaved, editMode });

  const medplum = useMedplum();
  const [confirmCloseOpened, { open: openConfirmClose, close: closeConfirmClose }] = useDisclosure(false);
  const [pendingStatusCode, setPendingStatusCode] = useState<string | null>(null);
  const currentOrganizationName = getCurrentOrganisationName(medplum);

  function handleMhCaseStateChange(value: string | null): void {
    const label = mhCaseStateOptions.find((o) => o.value === value)?.label ?? '';
    if (label.toLowerCase().includes('closed')) {
      setPendingStatusCode(value);
      openConfirmClose();
    } else {
      setMhCaseStateCode(value);
    }
  }

  function confirmClose(): void {
    setMhCaseStateCode(pendingStatusCode);
    closeConfirmClose();
  }

  function cancelClose(): void {
    setPendingStatusCode(null);
    closeConfirmClose();
  }

  return (
    <>
      <AppModal
        opened={opened}
        onClose={onClose}
        size="lg"
        title={
          <Stack gap={2}>
            <Title order={4} c="white">
              {isEditMode ? 'Edit Case' : 'New Case'}
            </Title>
            <Text size="sm" c="blue.1">
              {patient?.name?.[0] ? formatHumanName(patient.name[0]) : 'Unknown Patient'} (
              {episode?.identifier?.[0]?.value})
            </Text>
          </Stack>
        }
      >
        <Stack h="100%" justify="space-between" gap={0} mt="sm">
          <Box flex={1} miw={0}>
            <Grid h="100%">
              <Grid.Col span={6}>
                <Stack gap="sm">
                  <Select
                    label="Case Status"
                    data={mhCaseStateOptions}
                    value={mhCaseStateCode}
                    onChange={handleMhCaseStateChange}
                    placeholder="Select case status"
                    searchable={true}
                  />
                  {!isEditMode && (
                    <TextInput
                      type="date"
                      label="Opened Date"
                      value={openedDate}
                      onChange={(event) => setOpenedDate(event.currentTarget.value)}
                      required={true}
                      error={!!fieldErrors.openedDate}
                    />
                  )}
                  <ResourceInput
                    key={managingOrganizationResource?.id ?? 'no-managing-org'}
                    resourceType="Organization"
                    name="healthcare-provider"
                    label="Client"
                    defaultValue={managingOrganizationResource}
                    onChange={(value) => {
                      setManagingOrganization(value ? createReference(value as Organization) : undefined);
                      setManagingOrganizationName((value as Organization | undefined)?.name);
                    }}
                    required={true}
                    error={!!fieldErrors.managingOrganization}
                    searchCriteria={{ 'partof:Organization.name': currentOrganizationName }}
                  />
                  <ResourceInput
                    key={insuranceProviderResource?.id ?? 'no-insurance-provider'}
                    resourceType="Organization"
                    name="insurance-provider"
                    label="Insurance Provider"
                    defaultValue={insuranceProviderResource}
                    onChange={(value) => {
                      setInsuranceProvider(value ? createReference(value as Organization) : undefined);
                      setInsuranceProviderName((value as Organization | undefined)?.name);
                      setInsuranceProviderResource((value as Organization | undefined) ?? undefined);
                    }}
                    searchCriteria={{ type: 'http://terminology.hl7.org/CodeSystem/organization-type|pay' }}
                    required={true}
                    error={!!fieldErrors.insuranceProvider}
                  />
                  {requiresInsurancePlan && (
                    <ResourceInput
                      key={insurancePlanResource?.id ?? 'no-insurance-plan'}
                      resourceType="InsurancePlan"
                      name="insurance-plan"
                      label="Insurance Plan"
                      defaultValue={insurancePlanResource}
                      onChange={(value) => {
                        setInsurancePlan(value ? createReference(value as InsurancePlan) : undefined);
                        setInsurancePlanResource((value as InsurancePlan | undefined) ?? undefined);
                      }}
                      searchCriteria={{ 'owned-by': insuranceProvider?.reference ?? '' }}
                      required={true}
                      error={!!fieldErrors.insurancePlan}
                    />
                  )}
                  <TextInput
                    label="Policy Number"
                    value={policyNumber}
                    onChange={(event) => setPolicyNumber(event.currentTarget.value)}
                    required={true}
                    error={!!fieldErrors.policyNumber}
                  />
                  <Select
                    label="Service Type"
                    data={serviceTypeOptions}
                    value={serviceTypeCode}
                    onChange={setServiceTypeCode}
                    placeholder="Select service type"
                    searchable={true}
                    required={true}
                    error={!!fieldErrors.serviceTypeCode}
                  />
                  <ResourceInput
                    key={careManagerResource?.id ?? 'no-care-manager'}
                    resourceType="Practitioner"
                    name="care-manager"
                    label="Care Manager"
                    defaultValue={careManagerResource}
                    onChange={(value) => {
                      setCareManager(value ? createReference(value as Practitioner) : undefined);
                      setCareManagerName((value as Practitioner | undefined)?.name as HumanName | undefined);
                    }}
                    required={true}
                    error={!!fieldErrors.careManager}
                  />
                </Stack>
              </Grid.Col>
              <Grid.Col span={6}>
                <Stack gap="sm">
                  {hasOptimaExtension && (
                    <Alert
                      color="blue"
                      mt="sm"
                      style={{
                        borderRadius: 'var(--mantine-radius-md)',
                        border: '1px solid var(--mantine-color-blue-2)',
                      }}
                    >
                      <Text c="dark">Optima Health Information</Text>
                      <Stack gap="sm" mt="sm">
                        <ResourceInput
                          key={optimaEmployerResource?.id ?? 'no-optima-employer'}
                          resourceType="Organization"
                          name="optima-employer"
                          label="Employer"
                          defaultValue={optimaEmployerResource}
                          onChange={(value) => {
                            setOptimaEmployer(value ? createReference(value as Organization) : undefined);
                            setOptimaEmployerResource((value as Organization | undefined) ?? undefined);
                          }}
                          searchCriteria={{ partof: insuranceProvider?.reference ?? '', type: 'Employer' }}
                          disabled={!hasOptimaExtension}
                          required={hasOptimaExtension}
                        />
                        <TextInput
                          label="Location"
                          value={hasOptimaExtension ? optimaLocation : 'N/A'}
                          onChange={(event) => setOptimaLocation(event.currentTarget.value)}
                          disabled={!hasOptimaExtension}
                          required={hasOptimaExtension}
                          c="dark"
                        />
                        <TextInput
                          label="Facility"
                          value={hasOptimaExtension ? optimaFacility : 'N/A'}
                          onChange={(event) => setOptimaFacility(event.currentTarget.value)}
                          disabled={!hasOptimaExtension}
                          required={hasOptimaExtension}
                          c="dark"
                        />
                      </Stack>
                    </Alert>
                  )}
                  <Switch
                    mt={hasOptimaExtension ? '20px' : '30px'}
                    withThumbIndicator={false}
                    label="Consent for Treatment"
                    checked={consentSigned}
                    onChange={(event) => setConsentSigned(event.currentTarget.checked)}
                  />
                  {consentSigned && (
                    <TextInput
                      mt="8px"
                      type="date"
                      label="Consent Date"
                      value={consentDate}
                      onChange={(event) => setConsentDate(event.currentTarget.value)}
                      required={true}
                      error={!!fieldErrors.consentDate}
                    />
                  )}
                </Stack>
              </Grid.Col>
            </Grid>
          </Box>
        </Stack>
        <Divider my="md" ml="-15px" w="calc(100% + 30px)" />
        <Group mt="auto" justify="flex-end">
          <Button fullWidth={false} onClick={handleSaveCase} loading={isLoading} disabled={isLoading} mt={0}>
            {isEditMode ? 'Save Changes' : 'Create Case'}
          </Button>
        </Group>
      </AppModal>
      <AppModal
        opened={confirmCloseOpened}
        onClose={cancelClose}
        title={
          <Group>
            <Title order={4} c="white">
              Close Case?
            </Title>
          </Group>
        }
        size="sm"
      >
        <Stack gap="md" mt="sm">
          <Text size="sm">
            Are you sure you want to set the Case Status to Closed? No more changes can be made to a Closed Case and
            this action cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={cancelClose}>
              No
            </Button>
            <Button color="red" onClick={confirmClose}>
              Yes
            </Button>
          </Group>
        </Stack>
      </AppModal>
    </>
  );
}
