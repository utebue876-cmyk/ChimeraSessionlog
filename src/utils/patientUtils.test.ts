import type { HumanName, Patient } from '@medplum/fhirtypes';
import { describe, expect, test } from 'vitest';
import { formatGender, formatSortableName, getSortValue, getTelecomValue } from './patientUtils';

describe('patientUtils', () => {
  describe('formatGender', () => {
    test('capitalizes valid gender values', () => {
      expect(formatGender('female')).toBe('Female');
      expect(formatGender('male')).toBe('Male');
    });

    test('returns empty string when gender is missing', () => {
      expect(formatGender(undefined)).toBe('');
    });
  });

  describe('getTelecomValue', () => {
    const patient: Patient = {
      resourceType: 'Patient',
      telecom: [
        { system: 'phone', value: '555-111-2222' },
        { system: 'email', value: 'patient@example.com' },
      ],
    };

    test('returns value for matching telecom system', () => {
      expect(getTelecomValue(patient, 'phone')).toBe('555-111-2222');
      expect(getTelecomValue(patient, 'email')).toBe('patient@example.com');
    });

    test('returns empty string when telecom system is missing', () => {
      expect(getTelecomValue({ resourceType: 'Patient' }, 'phone')).toBe('');
    });
  });

  describe('formatSortableName', () => {
    test('formats family and given names', () => {
      const name: HumanName = { family: 'Doe', given: ['Jane', 'A.'] };
      expect(formatSortableName(name)).toBe('Doe, Jane A.');
    });

    test('handles partial or missing names', () => {
      expect(formatSortableName({ family: 'Doe' })).toBe('Doe');
      expect(formatSortableName({ given: ['Jane'] })).toBe('Jane');
      expect(formatSortableName(undefined)).toBe('');
    });
  });

  describe('getSortValue', () => {
    const patient: Patient = {
      resourceType: 'Patient',
      name: [{ family: 'Doe', given: ['Jane'] }],
      gender: 'female',
      telecom: [
        { system: 'phone', value: '555-111-2222' },
        { system: 'email', value: 'patient@example.com' },
      ],
      address: [{ line: ['123 Main St'], city: 'Boston', state: 'MA', postalCode: '02110' }],
      identifier: [{ value: 'ABC123' }],
    };

    test('returns expected values for each supported column', () => {
      expect(getSortValue(patient, 'name')).toBe('Doe, Jane');
      expect(getSortValue(patient, 'gender')).toBe('Female');
      expect(getSortValue(patient, 'phone')).toBe('555-111-2222');
      expect(getSortValue(patient, 'email')).toBe('patient@example.com');
      expect(getSortValue(patient, 'address')).toContain('123 Main St');
      expect(getSortValue(patient, 'id')).toBe('ABC123');
    });
  });
});
