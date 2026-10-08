import type { WithId } from '@medplum/core';
import { createReference, getReferenceString } from '@medplum/core';
import type { ClinicalImpression, Encounter, Practitioner, Provenance, Reference, Task } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { SAVE_TIMEOUT_MS } from '../../config/constants';
import { useDebouncedUpdateResource } from '../../hooks/useDebouncedUpdateResource';
import { useEncounterChartData } from '../../hooks/useEncounterChartData';
import { ChartNoteStatus } from '../../types/encounter';
import { updateEncounterStatus } from '../../utils/encounter';
import { showErrorNotification } from '../../utils/notifications';
import { recordPatientActivity } from '../../utils/patientActivity';

const FHIR_ACT_REASON_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-ActReason';
const FHIR_PROVENANCE_PARTICIPANT_TYPE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/provenance-participant-type';
const FHIR_DOCUMENT_COMPLETION_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-DocumentCompletion';

const TASK_COMPLETED_STATUSES = new Set<Task['status']>([
  'completed',
  'cancelled',
  'failed',
  'rejected',
  'entered-in-error',
]);

export interface UseEncounterChartResult {
  activeTab: string;
  encounter: WithId<Encounter> | undefined;
  patientResource: ReturnType<typeof useEncounterChartData>['patient'];
  claim: ReturnType<typeof useEncounterChartData>['claim'];
  practitioner: ReturnType<typeof useEncounterChartData>['practitioner'];
  tasks: ReturnType<typeof useEncounterChartData>['tasks'];
  clinicalImpression: ReturnType<typeof useEncounterChartData>['clinicalImpression'];
  chargeItems: ReturnType<typeof useEncounterChartData>['chargeItems'];
  provenances: Provenance[];
  chartNote: string | undefined;
  chartNoteStatus: ChartNoteStatus;
  setEncounter: ReturnType<typeof useEncounterChartData>['setEncounter'];
  setClaim: ReturnType<typeof useEncounterChartData>['setClaim'];
  setPractitioner: ReturnType<typeof useEncounterChartData>['setPractitioner'];
  setChargeItems: ReturnType<typeof useEncounterChartData>['setChargeItems'];
  prependTask: (newTask: WithId<Task>) => void;
  updateTaskList: (updatedTask: WithId<Task>) => void;
  handleEncounterStatusChange: (newStatus: Encounter['status']) => Promise<void>;
  handleTabChange: (tab: string) => void;
  handleChartNoteChange: (e: ChangeEvent<HTMLTextAreaElement>) => Promise<void>;
  handleSign: (practitioner: Reference<Practitioner>, lock: boolean) => Promise<void>;
}

export function useEncounterChart(encounterProp: WithId<Encounter> | Reference<Encounter>): UseEncounterChartResult {
  const medplum = useMedplum();
  const {
    encounter,
    patient: patientResource,
    claim,
    practitioner,
    tasks,
    clinicalImpression,
    chargeItems,
    appointment,
    setEncounter,
    setClaim,
    setPractitioner,
    setTasks,
    setClinicalImpression,
    setChargeItems,
  } = useEncounterChartData(encounterProp);

  const [activeTab, setActiveTab] = useState<string>('notes');
  const [chartNote, setChartNote] = useState<string | undefined>(clinicalImpression?.note?.[0]?.text);
  const debouncedUpdateResource = useDebouncedUpdateResource(medplum, SAVE_TIMEOUT_MS);
  const [provenances, setProvenances] = useState<Provenance[]>([]);
  const [chartNoteStatus, setChartNoteStatus] = useState<ChartNoteStatus>(ChartNoteStatus.Unsigned);

  useEffect(() => {
    setChartNote(clinicalImpression?.note?.[0]?.text);
  }, [clinicalImpression]);

  useEffect(() => {
    if (!encounter) {
      return;
    }

    const fetchProvenance = async (): Promise<void> => {
      const provenance = await medplum.searchResources('Provenance', `target=${getReferenceString(encounter)}`);
      setProvenances(provenance);
      if (provenance.length > 0 && clinicalImpression?.status === 'completed') {
        setChartNoteStatus(ChartNoteStatus.SignedAndLocked);
      } else if (provenance.length > 0) {
        setChartNoteStatus(ChartNoteStatus.Signed);
      } else {
        setChartNoteStatus(ChartNoteStatus.Unsigned);
      }
    };

    fetchProvenance().catch((err) => showErrorNotification(err));
  }, [clinicalImpression, encounter, medplum]);

  const updateTaskList = useCallback(
    (updatedTask: WithId<Task>): void => {
      setTasks((prevTasks) => prevTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
    },
    [setTasks]
  );

  const prependTask = useCallback(
    (newTask: WithId<Task>): void => {
      setTasks((prevTasks) => [newTask, ...prevTasks]);
    },
    [setTasks]
  );

  const handleEncounterStatusChange = useCallback(
    async (newStatus: Encounter['status']): Promise<void> => {
      if (!encounter) {
        return;
      }

      try {
        const updatedEncounter = await updateEncounterStatus(medplum, encounter, appointment, newStatus);
        setEncounter(updatedEncounter);
        recordPatientActivity(medplum, patientResource?.id);
      } catch (err) {
        showErrorNotification(err);
      }
    },
    [encounter, medplum, setEncounter, appointment, patientResource?.id]
  );

  const handleTabChange = (tab: string): void => {
    setActiveTab(tab);
  };

  const handleChartNoteChange = async (e: ChangeEvent<HTMLTextAreaElement>): Promise<void> => {
    setChartNote(e.target.value);

    if (!clinicalImpression) {
      return;
    }

    try {
      if (!e.target.value || e.target.value === '') {
        const { note: _note, ...restOfClinicalImpression } = clinicalImpression;
        const updatedClinicalImpression: ClinicalImpression = restOfClinicalImpression;
        await debouncedUpdateResource(updatedClinicalImpression);
      } else {
        const updatedClinicalImpression: ClinicalImpression = {
          ...clinicalImpression,
          note: [{ text: e.target.value }],
        };
        await debouncedUpdateResource(updatedClinicalImpression);
      }
      recordPatientActivity(medplum, patientResource?.id);
    } catch (err) {
      showErrorNotification(err);
    }
  };

  const handleSign = async (practitionerRef: Reference<Practitioner>, lock: boolean): Promise<void> => {
    if (!encounter) {
      return;
    }

    if (lock) {
      const tasksToUpdate = tasks.filter((task) => !TASK_COMPLETED_STATUSES.has(task.status));
      const updatedTasks = await Promise.all(
        tasksToUpdate.map((task) =>
          medplum.updateResource({
            ...task,
            status: 'completed',
          })
        )
      );

      setTasks(
        tasks.map((task) => {
          const updated = updatedTasks.find((t) => t.id === task.id);
          return updated || task;
        })
      );

      if (clinicalImpression) {
        const updatedImpression = await medplum.updateResource({ ...clinicalImpression, status: 'completed' });
        setClinicalImpression(updatedImpression);
      }
    }

    const newProvenance = await medplum.createResource<Provenance>({
      resourceType: 'Provenance',
      target: [createReference(encounter)],
      recorded: new Date().toISOString(),
      reason: [
        {
          coding: [
            {
              system: FHIR_ACT_REASON_SYSTEM,
              code: 'SIGN',
              display: 'Signed',
            },
          ],
        },
      ],
      agent: [
        {
          type: {
            coding: [
              {
                system: FHIR_PROVENANCE_PARTICIPANT_TYPE_SYSTEM,
                code: 'author',
              },
            ],
          },
          who: practitionerRef,
        },
      ],
      signature: [
        {
          type: [
            {
              system: FHIR_DOCUMENT_COMPLETION_SYSTEM,
              code: 'LA',
              display: 'legally authenticated',
            },
          ],
          when: new Date().toISOString(),
          who: practitionerRef,
        },
      ],
    });

    setProvenances([...provenances, newProvenance]);
    recordPatientActivity(medplum, patientResource?.id);

    if (lock) {
      setChartNoteStatus(ChartNoteStatus.SignedAndLocked);
    } else {
      setChartNoteStatus(ChartNoteStatus.Signed);
    }
  };

  return {
    activeTab,
    encounter,
    patientResource,
    claim,
    practitioner,
    tasks,
    clinicalImpression,
    chargeItems,
    provenances,
    chartNote,
    chartNoteStatus,
    setEncounter,
    setClaim,
    setPractitioner,
    setChargeItems,
    prependTask,
    updateTaskList,
    handleEncounterStatusChange,
    handleTabChange,
    handleChartNoteChange,
    handleSign,
  };
}
