export interface FindPatientFormValues {
  mrn: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string | null;
  caseId: string;
}

export const initialFormValues: FindPatientFormValues = {
  mrn: '',
  firstName: '',
  lastName: '',
  birthDate: '',
  gender: null,
  caseId: '',
};
