import type { Appointment, CodeableConcept, Encounter, Task } from '@medplum/fhirtypes';
import { describe, expect, test, vi } from 'vitest';
import { getPlanDefinitionNameFromEncounter, getServiceTypeForAppointment } from './appointmentUtils';
import * as schedulingModule from './scheduling';

describe('appointment-utils', () => {
  describe('getPlanDefinitionNameFromEncounter', () => {
    test('returns basedOn display from first task when present', async () => {
      const medplum = {
        searchResources: vi.fn().mockResolvedValue([
          {
            resourceType: 'Task',
            basedOn: [{ display: 'Initial Assessment' }],
          } as Task,
        ]),
      } as any;

      const result = await getPlanDefinitionNameFromEncounter(medplum, {
        resourceType: 'Encounter',
        id: 'enc-1',
        status: 'planned',
        class: { code: 'AMB' },
      } as Encounter);

      expect(result).toBe('Initial Assessment');
    });

    test('returns fallback label when task list is empty or request fails', async () => {
      const medplumEmpty = { searchResources: vi.fn().mockResolvedValue([]) } as any;
      const medplumError = { searchResources: vi.fn().mockRejectedValue(new Error('boom')) } as any;

      const encounter = {
        resourceType: 'Encounter',
        id: 'enc-2',
        status: 'planned',
        class: { code: 'AMB' },
      } as Encounter;

      await expect(getPlanDefinitionNameFromEncounter(medplumEmpty, encounter)).resolves.toBe(
        'Unknown Plan Definition'
      );
      await expect(getPlanDefinitionNameFromEncounter(medplumError, encounter)).resolves.toBe(
        'Unknown Plan Definition'
      );
    });
  });

  describe('getServiceTypeForAppointment', () => {
    test('prefers appointment serviceType over encounter serviceType', async () => {
      const appointmentType: CodeableConcept = { text: 'Appointment Type' };
      const encounterType: CodeableConcept = { text: 'Encounter Type' };

      const appointment: Appointment = {
        resourceType: 'Appointment',
        status: 'booked',
        serviceType: [appointmentType],
        participant: [],
      };

      const result = await getServiceTypeForAppointment({} as any, appointment, encounterType);
      expect(result).toBe(appointmentType);
    });

    test('uses encounter serviceType when appointment serviceType is missing', async () => {
      const encounterType: CodeableConcept = { text: 'Encounter Type' };
      const appointment: Appointment = {
        resourceType: 'Appointment',
        status: 'booked',
        participant: [],
      };

      const result = await getServiceTypeForAppointment({} as any, appointment, encounterType);
      expect(result).toBe(encounterType);
    });

    test('returns undefined when no service type sources exist and no practitioner participant', async () => {
      const appointment: Appointment = {
        resourceType: 'Appointment',
        status: 'booked',
        participant: [],
      };

      const result = await getServiceTypeForAppointment({} as any, appointment, undefined);
      expect(result).toBeUndefined();
    });

    test('falls back to practitioner schedule service type', async () => {
      const medplum = {
        searchOne: vi.fn().mockResolvedValue({ resourceType: 'Schedule', id: 'sched-1' }),
      } as any;
      const serviceType: CodeableConcept = { text: 'Schedule Type' };

      vi.spyOn(schedulingModule, 'serviceTypesFromSchedulingParameters').mockReturnValue([serviceType]);

      const appointment: Appointment = {
        resourceType: 'Appointment',
        status: 'booked',
        participant: [{ actor: { reference: 'Practitioner/123' }, status: 'accepted' }],
      };

      const result = await getServiceTypeForAppointment(medplum, appointment, undefined);

      expect(medplum.searchOne).toHaveBeenCalledWith('Schedule', { actor: 'Practitioner/123' });
      expect(result).toBe(serviceType);
    });

    test('returns undefined when schedule lookup fails', async () => {
      const medplum = {
        searchOne: vi.fn().mockRejectedValue(new Error('no schedule')),
      } as any;

      const appointment: Appointment = {
        resourceType: 'Appointment',
        status: 'booked',
        participant: [{ actor: { reference: 'Practitioner/123' }, status: 'accepted' }],
      };

      const result = await getServiceTypeForAppointment(medplum, appointment, undefined);
      expect(result).toBeUndefined();
    });
  });
});
