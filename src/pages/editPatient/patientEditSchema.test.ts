import type { Patient } from '@medplum/fhirtypes';
import { describe, expect, test } from 'vitest';
import {
  applyPatientEditValues,
  extractPatientEditValues,
  PATIENT_EDIT_INITIAL_VALUES,
  validatePatientEditForm,
  type PatientEditFormValues,
} from './patientEditSchema';

function validValues(overrides: Partial<PatientEditFormValues> = {}): PatientEditFormValues {
  return {
    ...PATIENT_EDIT_INITIAL_VALUES,
    firstName: 'Jane',
    lastName: 'Doe',
    dob: '1990-01-01',
    gender: 'female',
    homeAddressLine1: '1 Main St',
    homeCity: 'Nottingham',
    homePostcode: 'NG1 1AA',
    homePhone: '07700900000',
    ...overrides,
  };
}

describe('extractPatientEditValues', () => {
  test('reads demographics, home and work contact details from an existing patient', () => {
    const patient: Patient = {
      resourceType: 'Patient',
      id: 'patient-1',
      name: [{ given: ['Jane'], family: 'Doe' }],
      birthDate: '1990-01-01',
      gender: 'female',
      address: [
        {
          use: 'home',
          line: ['1 Main St', 'Flat 2'],
          city: 'Nottingham',
          state: 'Nottinghamshire',
          postalCode: 'NG1 1AA',
        },
        { use: 'work', line: ['2 Work Ave'], city: 'Derby', state: 'Derbyshire', postalCode: 'DE1 1AA' },
      ],
      telecom: [
        { system: 'phone', use: 'home', value: '07700900000' },
        { system: 'email', use: 'home', value: 'jane@example.com' },
        { system: 'phone', use: 'work', value: '07700900001' },
        { system: 'email', use: 'work', value: 'jane.doe@work.com' },
      ],
    };

    const values = extractPatientEditValues(patient);

    expect(values).toEqual({
      firstName: 'Jane',
      lastName: 'Doe',
      dob: '1990-01-01',
      gender: 'female',
      homeAddressLine1: '1 Main St',
      homeAddressLine2: 'Flat 2',
      homeCity: 'Nottingham',
      homeCounty: 'Nottinghamshire',
      homePostcode: 'NG1 1AA',
      homePhone: '07700900000',
      homeEmail: 'jane@example.com',
      workAddressLine1: '2 Work Ave',
      workAddressLine2: '',
      workCity: 'Derby',
      workCounty: 'Derbyshire',
      workPostcode: 'DE1 1AA',
      workPhone: '07700900001',
      workEmail: 'jane.doe@work.com',
    });
  });

  test('returns blank values when the patient has no name, address or telecom', () => {
    const values = extractPatientEditValues({ resourceType: 'Patient', id: 'patient-1' });

    expect(values).toEqual(PATIENT_EDIT_INITIAL_VALUES);
  });
});

describe('applyPatientEditValues', () => {
  test('merges edited fields while preserving identifiers and other resource fields', () => {
    const patient: Patient = {
      resourceType: 'Patient',
      id: 'patient-1',
      identifier: [{ system: 'http://example.com/mrn', value: 'MRN123' }],
      managingOrganization: { reference: 'Organization/org-1' },
      name: [{ given: ['Old'], family: 'Name' }],
    };

    const updated = applyPatientEditValues(patient, validValues());

    expect(updated.identifier).toEqual(patient.identifier);
    expect(updated.managingOrganization).toEqual(patient.managingOrganization);
    expect(updated.name).toEqual([{ given: ['Jane'], family: 'Doe' }]);
    expect(updated.birthDate).toBe('1990-01-01');
    expect(updated.gender).toBe('female');
    expect(updated.address).toEqual([
      { use: 'home', type: 'physical', line: ['1 Main St'], city: 'Nottingham', postalCode: 'NG1 1AA', country: 'GB' },
    ]);
    expect(updated.telecom).toEqual([{ use: 'home', system: 'phone', value: '07700900000' }]);
  });

  test('preserves non-home/work addresses and telecoms untouched', () => {
    const patient: Patient = {
      resourceType: 'Patient',
      id: 'patient-1',
      address: [{ use: 'billing', line: ['3 Billing Rd'] }],
      telecom: [{ system: 'fax', value: '01234' }],
    };

    const updated = applyPatientEditValues(patient, validValues());

    expect(updated.address).toContainEqual({ use: 'billing', line: ['3 Billing Rd'] });
    expect(updated.telecom).toContainEqual({ system: 'fax', value: '01234' });
  });

  test('includes a work address only when work fields are populated', () => {
    const patient: Patient = { resourceType: 'Patient', id: 'patient-1' };

    const updated = applyPatientEditValues(
      patient,
      validValues({ workAddressLine1: '2 Work Ave', workCity: 'Derby', workPostcode: 'DE1 1AA' })
    );

    expect(updated.address).toContainEqual(
      expect.objectContaining({ use: 'work', city: 'Derby', postalCode: 'DE1 1AA' })
    );
  });

  test('sets the photo when one is provided', () => {
    const patient: Patient = { resourceType: 'Patient', id: 'patient-1' };
    const photo = { contentType: 'image/png', data: 'base64data', title: 'photo.png' };

    const updated = applyPatientEditValues(patient, validValues(), photo);

    expect(updated.photo).toEqual([photo]);
  });

  test('preserves the existing photo when none is provided', () => {
    const existingPhoto = { contentType: 'image/png', data: 'existing', title: 'old.png' };
    const patient: Patient = { resourceType: 'Patient', id: 'patient-1', photo: [existingPhoto] };

    const updated = applyPatientEditValues(patient, validValues());

    expect(updated.photo).toEqual([existingPhoto]);
  });

  test('removes the photo when explicitly passed null', () => {
    const existingPhoto = { contentType: 'image/png', data: 'existing', title: 'old.png' };
    const patient: Patient = { resourceType: 'Patient', id: 'patient-1', photo: [existingPhoto] };

    const updated = applyPatientEditValues(patient, validValues(), null);

    expect(updated.photo).toBeUndefined();
  });
});

describe('validatePatientEditForm', () => {
  test('returns no errors for a fully valid submission', () => {
    expect(validatePatientEditForm(validValues())).toEqual({});
  });

  test('flags required demographic and address fields when missing', () => {
    const errors = validatePatientEditForm(PATIENT_EDIT_INITIAL_VALUES);

    expect(errors.firstName).toBe('Required');
    expect(errors.lastName).toBe('Required');
    expect(errors.dob).toBe('Required');
    expect(errors.gender).toBe('Required');
    expect(errors.homeAddressLine1).toBe('Required');
    expect(errors.homeCity).toBe('Required');
    expect(errors.homePostcode).toBe('Required');
    expect(errors.homePhone).toBe('Required');
  });

  test('rejects a date of birth outside the valid range', () => {
    expect(validatePatientEditForm(validValues({ dob: '1899-12-31' })).dob).toBe(
      'Date of birth must be between 01/01/1900 and today'
    );
  });

  test('validates UK postcode and email format for home and work', () => {
    expect(validatePatientEditForm(validValues({ homePostcode: 'not-a-postcode' })).homePostcode).toBe(
      'Please enter a valid UK postcode'
    );
    expect(validatePatientEditForm(validValues({ workPostcode: 'not-a-postcode' })).workPostcode).toBe(
      'Please enter a valid UK postcode'
    );
    expect(validatePatientEditForm(validValues({ homeEmail: 'not-an-email' })).homeEmail).toBe(
      'Please enter a valid email address'
    );
    expect(validatePatientEditForm(validValues({ workEmail: 'not-an-email' })).workEmail).toBe(
      'Please enter a valid email address'
    );
  });
});
