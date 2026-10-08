import { formatAddress } from '@medplum/core';
import type { HumanName, Patient } from '@medplum/fhirtypes';

export function formatGender(gender: Patient['gender']): string {
  if (!gender) {
    return '';
  }

  return gender.charAt(0).toUpperCase() + gender.slice(1);
}

export function getTelecomValue(patient: Patient, system: 'phone' | 'email'): string {
  return patient.telecom?.find((contactPoint) => contactPoint.system === system)?.value ?? '';
}

export function formatSortableName(name: HumanName | undefined): string {
  if (!name) {
    return '';
  } else if (name.family && name.given) {
    return `${name.family}, ${name.given.join(' ')}`;
  } else if (name.family) {
    return name.family;
  } else if (name.given) {
    return name.given.join(' ');
  } else {
    return '';
  }
}

export type SortColumn = 'name' | 'gender' | 'phone' | 'email' | 'address' | 'id';

export function getSortValue(patient: Patient, col: SortColumn): string {
  switch (col) {
    case 'name':
      return formatSortableName(patient.name?.[0] as HumanName);
    case 'gender':
      return formatGender(patient.gender);
    case 'phone':
      return getTelecomValue(patient, 'phone');
    case 'email':
      return getTelecomValue(patient, 'email');
    case 'address':
      return formatAddress(patient.address?.[0]) ?? '';
    case 'id':
      return patient.identifier?.[0]?.value ?? '';
  }
}
