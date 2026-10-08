//
// patientEditSchema.ts
//
// Typed form values, validation, and Patient <-> form-value mappers for the
// Edit Patient page. Extraction/application only ever touch the fields this
// form owns (demographics + home/work contact details) — everything else on
// the Patient resource (identifiers, managingOrganization, other addresses or
// telecoms, etc.) is preserved untouched.
//
// To add a new editable field: add it to `PatientEditFormValues` (and the
// initial values), read it in `extractPatientEditValues`, write it in
// `applyPatientEditValues`, and add any validation rule to `validatePatientEditForm`.
// The patient photo is handled separately (see `applyPatientEditValues`'s `photo` param)
// since it is a file/Attachment rather than a plain form text value.
//
import type { Address, Attachment, ContactPoint, HumanName, Patient } from '@medplum/fhirtypes';
import { isValidEmail, isValidUkPostcode } from '../../utils/emailUtils';

export interface PatientEditFormValues {
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  homeAddressLine1: string;
  homeAddressLine2: string;
  homeCity: string;
  homeCounty: string;
  homePostcode: string;
  homePhone: string;
  homeEmail: string;
  workAddressLine1: string;
  workAddressLine2: string;
  workCity: string;
  workCounty: string;
  workPostcode: string;
  workPhone: string;
  workEmail: string;
}

export type PatientEditFormErrors = Partial<Record<keyof PatientEditFormValues, string>>;

export const PATIENT_EDIT_INITIAL_VALUES: PatientEditFormValues = {
  firstName: '',
  lastName: '',
  dob: '',
  gender: '',
  homeAddressLine1: '',
  homeAddressLine2: '',
  homeCity: '',
  homeCounty: '',
  homePostcode: '',
  homePhone: '',
  homeEmail: '',
  workAddressLine1: '',
  workAddressLine2: '',
  workCity: '',
  workCounty: '',
  workPostcode: '',
  workPhone: '',
  workEmail: '',
};

// ---------------------------------------------------------------------------
// Patient -> form values
// ---------------------------------------------------------------------------
export function extractPatientEditValues(patient: Patient): PatientEditFormValues {
  const name = patient.name?.[0];
  const homeAddress = patient.address?.find((a) => a.use === 'home');
  const workAddress = patient.address?.find((a) => a.use === 'work');
  const homePhone = patient.telecom?.find((t) => t.system === 'phone' && t.use === 'home')?.value;
  const homeEmail = patient.telecom?.find((t) => t.system === 'email' && t.use === 'home')?.value;
  const workPhone = patient.telecom?.find((t) => t.system === 'phone' && t.use === 'work')?.value;
  const workEmail = patient.telecom?.find((t) => t.system === 'email' && t.use === 'work')?.value;

  return {
    firstName: name?.given?.[0] ?? '',
    lastName: name?.family ?? '',
    dob: patient.birthDate ?? '',
    gender: patient.gender ?? '',
    homeAddressLine1: homeAddress?.line?.[0] ?? '',
    homeAddressLine2: homeAddress?.line?.[1] ?? '',
    homeCity: homeAddress?.city ?? '',
    homeCounty: homeAddress?.state ?? '',
    homePostcode: homeAddress?.postalCode ?? '',
    homePhone: homePhone ?? '',
    homeEmail: homeEmail ?? '',
    workAddressLine1: workAddress?.line?.[0] ?? '',
    workAddressLine2: workAddress?.line?.[1] ?? '',
    workCity: workAddress?.city ?? '',
    workCounty: workAddress?.state ?? '',
    workPostcode: workAddress?.postalCode ?? '',
    workPhone: workPhone ?? '',
    workEmail: workEmail ?? '',
  };
}

// ---------------------------------------------------------------------------
// Form values -> Patient (merged onto a clone of the existing resource)
// ---------------------------------------------------------------------------
function buildName(patient: Patient, values: PatientEditFormValues): HumanName[] | undefined {
  if (!values.firstName.trim() && !values.lastName.trim()) {
    return patient.name;
  }
  const [primary, ...rest] = patient.name ?? [];
  const nextPrimary: HumanName = {
    ...primary,
    ...(values.firstName.trim() ? { given: [values.firstName.trim()] } : {}),
    ...(values.lastName.trim() ? { family: values.lastName.trim() } : {}),
  };
  return [nextPrimary, ...rest];
}

function buildAddress(
  line1: string,
  line2: string,
  city: string,
  county: string,
  postcode: string,
  use: 'home' | 'work'
): Address | undefined {
  if (!line1.trim() && !city.trim() && !postcode.trim()) {
    return undefined;
  }
  return {
    use,
    type: 'physical',
    ...(line1.trim() || line2.trim() ? { line: [line1, line2].map((l) => l.trim()).filter(Boolean) } : {}),
    ...(city.trim() ? { city: city.trim() } : {}),
    ...(county.trim() ? { state: county.trim() } : {}),
    ...(postcode.trim() ? { postalCode: postcode.trim() } : {}),
    country: 'GB',
  };
}

function buildAddresses(patient: Patient, values: PatientEditFormValues): Address[] {
  const otherAddresses = (patient.address ?? []).filter((a) => a.use !== 'home' && a.use !== 'work');
  const homeAddress = buildAddress(
    values.homeAddressLine1,
    values.homeAddressLine2,
    values.homeCity,
    values.homeCounty,
    values.homePostcode,
    'home'
  );
  const workAddress = buildAddress(
    values.workAddressLine1,
    values.workAddressLine2,
    values.workCity,
    values.workCounty,
    values.workPostcode,
    'work'
  );
  return [...(homeAddress ? [homeAddress] : []), ...(workAddress ? [workAddress] : []), ...otherAddresses];
}

function buildTelecom(patient: Patient, values: PatientEditFormValues): ContactPoint[] {
  const preserved = (patient.telecom ?? []).filter(
    (t) => !((t.system === 'phone' || t.system === 'email') && (t.use === 'home' || t.use === 'work'))
  );
  const next: ContactPoint[] = [];
  if (values.homePhone.trim()) next.push({ use: 'home', system: 'phone', value: values.homePhone.trim() });
  if (values.homeEmail.trim()) next.push({ use: 'home', system: 'email', value: values.homeEmail.trim() });
  if (values.workPhone.trim()) next.push({ use: 'work', system: 'phone', value: values.workPhone.trim() });
  if (values.workEmail.trim()) next.push({ use: 'work', system: 'email', value: values.workEmail.trim() });
  return [...next, ...preserved];
}

// `photo` is tri-state: undefined = leave the existing photo untouched, null = remove it, Attachment = replace it.
export function applyPatientEditValues(
  patient: Patient,
  values: PatientEditFormValues,
  photo?: Attachment | null
): Patient {
  return {
    ...patient,
    name: buildName(patient, values),
    birthDate: values.dob || undefined,
    gender: (values.gender || undefined) as Patient['gender'],
    address: buildAddresses(patient, values),
    telecom: buildTelecom(patient, values),
    photo: photo === null ? undefined : photo ? [photo] : patient.photo,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
export function validatePatientEditForm(values: PatientEditFormValues): PatientEditFormErrors {
  const errors: PatientEditFormErrors = {};

  if (!values.firstName.trim()) errors.firstName = 'Required';
  if (!values.lastName.trim()) errors.lastName = 'Required';
  if (!values.dob) {
    errors.dob = 'Required';
  } else {
    const today = new Date().toISOString().split('T')[0];
    if (values.dob < '1900-01-01' || values.dob > today) {
      errors.dob = 'Date of birth must be between 01/01/1900 and today';
    }
  }
  if (!values.gender) errors.gender = 'Required';

  if (!values.homeAddressLine1.trim()) errors.homeAddressLine1 = 'Required';
  if (!values.homeCity.trim()) errors.homeCity = 'Required';
  if (!values.homePostcode.trim()) {
    errors.homePostcode = 'Required';
  } else if (!isValidUkPostcode(values.homePostcode)) {
    errors.homePostcode = 'Please enter a valid UK postcode';
  }
  if (!values.homePhone.trim()) errors.homePhone = 'Required';
  if (values.homeEmail.trim() && !isValidEmail(values.homeEmail)) {
    errors.homeEmail = 'Please enter a valid email address';
  }

  if (values.workPostcode.trim() && !isValidUkPostcode(values.workPostcode)) {
    errors.workPostcode = 'Please enter a valid UK postcode';
  }
  if (values.workEmail.trim() && !isValidEmail(values.workEmail)) {
    errors.workEmail = 'Please enter a valid email address';
  }

  return errors;
}
