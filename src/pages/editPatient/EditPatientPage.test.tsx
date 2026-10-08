import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { EditPatientPage } from './EditPatientPage';
import { PATIENT_EDIT_INITIAL_VALUES, type PatientEditFormValues } from './patientEditSchema';

const hookState = vi.hoisted(() => ({
  patient: undefined as any,
  previewPatient: undefined as any,
  values: { ...({} as PatientEditFormValues) },
  errors: {} as Record<string, string>,
  set: vi.fn(),
  onPhotoChange: vi.fn(),
  onDeletePhoto: vi.fn(),
  loading: true,
  submitting: false,
  handleSubmit: vi.fn(),
  handleCancel: vi.fn(),
}));

vi.mock('./useEditPatientPage', () => ({
  useEditPatientPage: () => hookState,
}));

vi.mock('@medplum/react', () => ({
  ResourceAvatar: () => <span>Avatar</span>,
}));

function renderPage(): void {
  render(
    <MantineProvider>
      <EditPatientPage />
    </MantineProvider>
  );
}

describe('EditPatientPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.patient = undefined;
    hookState.previewPatient = undefined;
    hookState.values = { ...PATIENT_EDIT_INITIAL_VALUES };
    hookState.errors = {};
    hookState.loading = true;
    hookState.submitting = false;
  });

  test('shows a loader while the patient is loading', () => {
    renderPage();

    expect(screen.queryByText('Edit Patient')).not.toBeInTheDocument();
  });

  test('renders the form once the patient has loaded', () => {
    hookState.loading = false;
    hookState.patient = { resourceType: 'Patient', id: 'patient-1', name: [{ given: ['Jane'], family: 'Doe' }] };
    hookState.previewPatient = hookState.patient;
    hookState.values = { ...PATIENT_EDIT_INITIAL_VALUES, firstName: 'Jane', lastName: 'Doe' };

    renderPage();

    expect(screen.getByText('Edit Patient')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toHaveValue('Jane');
  });

  test('typing into First Name calls set with the field and value', async () => {
    hookState.loading = false;
    hookState.patient = { resourceType: 'Patient', id: 'patient-1', name: [{ given: ['Jane'], family: 'Doe' }] };
    hookState.previewPatient = hookState.patient;
    hookState.values = { ...PATIENT_EDIT_INITIAL_VALUES, firstName: 'Jane', lastName: 'Doe' };
    const user = userEvent.setup();

    renderPage();
    await user.type(screen.getByLabelText(/First Name/i), 'x');

    expect(hookState.set).toHaveBeenCalledWith('firstName', 'Janex');
  });

  test('clicking Save Changes and Cancel invoke the corresponding handlers', async () => {
    hookState.loading = false;
    hookState.patient = { resourceType: 'Patient', id: 'patient-1', name: [{ given: ['Jane'], family: 'Doe' }] };
    hookState.previewPatient = hookState.patient;
    hookState.values = { ...PATIENT_EDIT_INITIAL_VALUES, firstName: 'Jane', lastName: 'Doe' };
    const user = userEvent.setup();

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(hookState.handleSubmit).toHaveBeenCalled();
    expect(hookState.handleCancel).toHaveBeenCalled();
  });

  test('selecting a photo file calls onPhotoChange', async () => {
    hookState.loading = false;
    hookState.patient = { resourceType: 'Patient', id: 'patient-1', name: [{ given: ['Jane'], family: 'Doe' }] };
    hookState.previewPatient = hookState.patient;
    hookState.values = { ...PATIENT_EDIT_INITIAL_VALUES, firstName: 'Jane', lastName: 'Doe' };
    const user = userEvent.setup();
    const file = new File(['abc'], 'photo.png', { type: 'image/png' });

    renderPage();
    // Mantine's FileInput renders a hidden native file input rather than exposing one via its visible label element.
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    expect(hookState.onPhotoChange).toHaveBeenCalledWith(file);
  });

  test('Delete Photo button is disabled when there is no photo and enabled once one is set', () => {
    hookState.loading = false;
    hookState.patient = { resourceType: 'Patient', id: 'patient-1', name: [{ given: ['Jane'], family: 'Doe' }] };
    hookState.previewPatient = hookState.patient;
    hookState.values = { ...PATIENT_EDIT_INITIAL_VALUES, firstName: 'Jane', lastName: 'Doe' };

    renderPage();

    expect(screen.getByRole('button', { name: 'Delete Photo' })).toBeDisabled();
  });

  test('clicking Delete Photo calls onDeletePhoto when a photo is present', async () => {
    hookState.loading = false;
    hookState.patient = { resourceType: 'Patient', id: 'patient-1', name: [{ given: ['Jane'], family: 'Doe' }] };
    hookState.previewPatient = { ...hookState.patient, photo: [{ contentType: 'image/png', url: 'Binary/1' }] };
    hookState.values = { ...PATIENT_EDIT_INITIAL_VALUES, firstName: 'Jane', lastName: 'Doe' };
    const user = userEvent.setup();

    renderPage();
    const deleteButton = screen.getByRole('button', { name: 'Delete Photo' });
    expect(deleteButton).toBeEnabled();
    await user.click(deleteButton);

    expect(hookState.onDeletePhoto).toHaveBeenCalled();
  });
});
