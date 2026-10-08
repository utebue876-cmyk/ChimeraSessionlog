import { Divider, Group, Stack, Tabs } from '@mantine/core';
import { formatAddress } from '@medplum/core';
import type { Condition, EpisodeOfCare } from '@medplum/fhirtypes';
import { StatusBadge } from '@medplum/react';
import { IconCake, IconEmpathize, IconId, IconMailOpened, IconMapPin, IconPhoneCall } from '@tabler/icons-react';
import type { JSX } from 'react';
import { useState } from 'react';
import { calculateAge, calculateAgeString } from '../../utils/patientSidebarUtils';
import { PatientCases } from './PatientCases';
import { PatientProblems } from './PatientProblems';
import { PatientSidebarInfoItem } from './PatientSidebarInfoItem';
import type { SectionRenderContext } from './PatientSidebarTypes';
import { formatPatientGenderDisplay } from './PatientSidebarUtils';

export function DemographicsSectionComponent({ patient }: SectionRenderContext): JSX.Element {
  const [tab, setTab] = useState<'home' | 'work'>('home');
  return (
    <Stack gap="xs" py={8} mb={20} mt={-16}>
      <PatientSidebarInfoItem
        patient={patient}
        value={patient.identifier?.[0]?.value ?? undefined}
        icon={<IconId size={16} stroke={2} color="var(--mantine-color-blue-6)" />}
        placeholder="No MRN"
        label="Medical Record Number"
        showChevron={false}
      />
      <Group>
        <PatientSidebarInfoItem
          patient={patient}
          value={
            patient.birthDate
              ? `${patient.birthDate.split('-').reverse().join('/')} - (${calculateAgeString(patient.birthDate)})`
              : undefined
          }
          icon={<IconCake size={16} stroke={2} color="var(--mantine-color-blue-6)" />}
          placeholder="No birthdate"
          label="Birthdate & Age"
          showChevron={false}
        />
        {patient.deceasedBoolean && <StatusBadge color="red" variant="light" status="Deceased" ml={-7} />}
        {!patient.deceasedBoolean && patient.birthDate && Number(calculateAge(patient.birthDate)) < 18 && (
          <StatusBadge color="red" variant="light" status="Minor" ml={-7} />
        )}
      </Group>
      <PatientSidebarInfoItem
        patient={patient}
        value={patient.gender ? formatPatientGenderDisplay(patient) : undefined}
        icon={<IconEmpathize size={16} stroke={2} color="var(--mantine-color-blue-6)" />}
        placeholder="No gender"
        label="Gender & Identity"
        showChevron={false}
      />
      <Divider color="var(--mantine-color-blue-2)" mx={-16} />
      <Group justify="space-between" align="flex-end" mb={5}>
        <Tabs
          color="var(--mantine-color-blue-6)"
          value={tab}
          onChange={(tab) => {
            setTab((tab ?? 'home') as 'home' | 'work');
          }}
          styles={{
            tab: {
              fontWeight: 400,
              fontSize: '13px',
            },
          }}
        >
          <Tabs.List>
            <Tabs.Tab value="home" fw={tab === 'home' ? 700 : 400}>
              Home
            </Tabs.Tab>
            <Tabs.Tab value="work" fw={tab === 'work' ? 700 : 400}>
              Work
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>
      </Group>
      {tab === 'home' ? (
        <>
          <PatientSidebarInfoItem
            patient={patient}
            value={patient.address?.[0] ? formatAddress(patient.address[0]) : undefined}
            icon={<IconMapPin size={16} stroke={2} color="var(--mantine-color-blue-6)" />}
            placeholder="No location"
            label="Location"
            showChevron={false}
          />
          <PatientSidebarInfoItem
            patient={patient}
            value={patient.telecom?.find((t) => t.system === 'phone' && t.use === 'home')?.value ?? undefined}
            icon={<IconPhoneCall size={16} stroke={2} color="var(--mantine-color-blue-6)" />}
            placeholder="No phone number"
            label="Phone Number"
            showChevron={false}
          />
          <div style={{ marginBottom: -10 }}>
            <PatientSidebarInfoItem
              patient={patient}
              value={patient.telecom?.find((t) => t.system === 'email' && t.use === 'home')?.value ?? undefined}
              icon={<IconMailOpened size={16} stroke={2} color="var(--mantine-color-blue-6)" />}
              placeholder="No email address"
              label="Email"
              showChevron={false}
            />
          </div>
        </>
      ) : (
        <>
          <PatientSidebarInfoItem
            patient={patient}
            value={patient.address?.[1] ? formatAddress(patient.address[1]) : undefined}
            icon={<IconMapPin size={16} stroke={2} color="var(--mantine-color-blue-6)" />}
            placeholder="No location"
            label="Location"
            showChevron={false}
          />
          <PatientSidebarInfoItem
            patient={patient}
            value={patient.telecom?.find((t) => t.system === 'phone' && t.use === 'work')?.value ?? undefined}
            icon={<IconPhoneCall size={16} stroke={2} color="var(--mantine-color-blue-6)" />}
            placeholder="No phone number"
            label="Phone Number"
            showChevron={false}
          />
          <div style={{ marginBottom: -10 }}>
            <PatientSidebarInfoItem
              patient={patient}
              value={patient.telecom?.find((t) => t.system === 'email' && t.use === 'work')?.value ?? undefined}
              icon={<IconMailOpened size={16} stroke={2} color="var(--mantine-color-blue-6)" />}
              placeholder="No email address"
              label="Email"
              showChevron={false}
            />
          </div>
        </>
      )}
    </Stack>
  );
}

export function EpisodesOfCareSectionComponent({ results, patient }: SectionRenderContext): JSX.Element {
  return <PatientCases patient={patient} episodes={(results['episodesOfCare'] as EpisodeOfCare[]) || []} />;
}

export function PatientProblemsSectionComponent({
  results,
  patient,
  onClickResource,
}: SectionRenderContext): JSX.Element {
  return (
    <PatientProblems
      patient={patient}
      problems={(results['conditions'] as Condition[]) || []}
      onClickResource={onClickResource}
    />
  );
}
