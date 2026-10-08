import { useDisclosure } from '@mantine/hooks';
import { formatCodeableConcept, formatHumanName } from '@medplum/core';
import type { Appointment, Encounter, EpisodeOfCare, Practitioner, Reference } from '@medplum/fhirtypes';
import { useMedplum, useResource } from '@medplum/react';
import { useEffect, useState } from 'react';
import { ChartNoteStatus } from '../../types/encounter';
import { getPlanDefinitionNameFromEncounter, getServiceTypeForAppointment } from '../../utils/appointmentUtils';

export const STATUS_TRANSITIONS: Partial<Record<Encounter['status'], Encounter['status'][]>> = {
  planned: ['arrived', 'in-progress', 'finished', 'cancelled'],
  arrived: ['in-progress', 'finished', 'cancelled'],
  'in-progress': ['finished', 'cancelled'],
};

interface UseEncounterHeaderOptions {
  encounter: Encounter;
  chartNoteStatus: ChartNoteStatus;
  onStatusChange?: (status: Encounter['status']) => void;
  onTabChange?: (tab: string) => void;
  onSign?: (practitioner: Reference<Practitioner>, lock: boolean) => void;
}

export interface UseEncounterHeaderReturn {
  appointment: Appointment | undefined;
  appointmentStartDate: string | undefined;
  appointmentEndDate: string | undefined;
  appointmentPractitionerName: string;
  caseIdentifier: string;
  planDefinitionName: string | undefined;
  serviceType: string | undefined;
  status: Encounter['status'];
  activeTab: string;
  confirmOpened: boolean;
  openConfirm: () => void;
  closeConfirm: () => void;
  signOpened: boolean;
  openSign: () => void;
  closeSign: () => void;
  changePractitionerOpened: boolean;
  openChangePractitioner: () => void;
  closeChangePractitioner: () => void;
  handleStatusChange: (newStatus: Encounter['status']) => void;
  confirmStatusChange: () => void;
  onConfirmSign: (practitioner: Reference<Practitioner>, lock: boolean) => void;
  handleTabChange: (tab: string) => void;
  handleSign: () => void;
  handlePractitionerChanged: (p: Practitioner) => void;
}

export function useEncounterHeader({
  encounter,
  chartNoteStatus,
  onStatusChange,
  onTabChange,
  onSign,
}: UseEncounterHeaderOptions): UseEncounterHeaderReturn {
  const medplum = useMedplum();

  const [status, setStatus] = useState<Encounter['status']>(encounter.status);
  const [activeTab, setActiveTab] = useState<string>('notes');
  const [practitionerNameOverride, setPractitionerNameOverride] = useState<string | undefined>();
  const [planDefinitionName, setPlanDefinitionName] = useState<string | undefined>();
  const [serviceType, setServiceType] = useState<string | undefined>();

  const [confirmOpened, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
  const [signOpened, { open: openSign, close: closeSign }] = useDisclosure(false);
  const [changePractitionerOpened, { open: openChangePractitioner, close: closeChangePractitioner }] =
    useDisclosure(false);

  const episodeOfCareResource = useResource<EpisodeOfCare>(encounter.episodeOfCare?.[0]);
  const appointment = useResource(encounter.appointment?.[0]);

  const appointmentStartDate = appointment?.start;
  const appointmentEndDate = appointment?.end;

  const appointmentPractitionerName =
    practitionerNameOverride ??
    appointment?.participant?.find((p) => p.actor?.reference?.startsWith('Practitioner/'))?.actor?.display ??
    'Unknown Provider';

  const caseIdentifier =
    episodeOfCareResource?.identifier?.[0]?.value || encounter.episodeOfCare?.[0]?.display || 'No case associated';

  useEffect(() => {
    let cancelled = false;
    getPlanDefinitionNameFromEncounter(medplum, encounter).then((name) => {
      if (!cancelled) setPlanDefinitionName(name);
    });
    if (appointment) {
      getServiceTypeForAppointment(medplum, appointment, encounter.serviceType).then((type) => {
        if (!cancelled) setServiceType(formatCodeableConcept(type) ?? '—');
      });
    } else {
      setServiceType('—');
    }
    return () => {
      cancelled = true;
    };
  }, [medplum, encounter, appointment]);

  const handleStatusChange = (newStatus: Encounter['status']): void => {
    if (newStatus === 'cancelled') {
      openConfirm();
      return;
    }
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  };

  const confirmStatusChange = (): void => {
    setStatus('cancelled');
    onStatusChange?.('cancelled');
    closeConfirm();
  };

  const onConfirmSign = (practitioner: Reference<Practitioner>, lock: boolean): void => {
    onSign?.(practitioner, lock);
    closeSign();
  };

  const handleTabChange = (tab: string): void => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const handleSign = (): void => {
    if (chartNoteStatus === ChartNoteStatus.SignedAndLocked) return;
    openSign();
  };

  const handlePractitionerChanged = (p: Practitioner): void => {
    const name = formatHumanName(p.name?.[0]);
    if (name) setPractitionerNameOverride(name);
  };

  return {
    appointment,
    appointmentStartDate,
    appointmentEndDate,
    appointmentPractitionerName,
    caseIdentifier,
    planDefinitionName,
    serviceType,
    status,
    activeTab,
    confirmOpened,
    openConfirm,
    closeConfirm,
    signOpened,
    openSign,
    closeSign,
    changePractitionerOpened,
    openChangePractitioner,
    closeChangePractitioner,
    handleStatusChange,
    confirmStatusChange,
    onConfirmSign,
    handleTabChange,
    handleSign,
    handlePractitionerChanged,
  };
}
