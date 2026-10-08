import { act, renderHook, waitFor } from '@testing-library/react';
import * as reactRouter from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useEditPatientPage } from './useEditPatientPage';

const medplumState = vi.hoisted(() => ({
  readResource: vi.fn(),
  updateResource: vi.fn(),
  createAttachment: vi.fn(),
}));
const notificationsState = vi.hoisted(() => ({ showNotification: vi.fn() }));
const navigate = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
}));

vi.mock('@mantine/notifications', () => ({
  showNotification: (...args: unknown[]) => notificationsState.showNotification(...args),
}));

const basePatient = {
  resourceType: 'Patient',
  id: 'patient-1',
  name: [{ given: ['Jane'], family: 'Doe' }],
  birthDate: '1990-01-01',
  gender: 'female',
  address: [{ use: 'home', line: ['1 Main St'], city: 'Nottingham', postalCode: 'NG1 1AA' }],
  telecom: [{ system: 'phone', use: 'home', value: '07700900000' }],
};

describe('useEditPatientPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(reactRouter, 'useNavigate').mockReturnValue(navigate as any);
    vi.spyOn(reactRouter, 'useParams').mockReturnValue({ patientId: 'patient-1' });
    medplumState.readResource.mockResolvedValue(basePatient);
    medplumState.updateResource.mockImplementation(async (resource: any) => resource);
    medplumState.createAttachment.mockResolvedValue(undefined);
  });

  test('loads the patient and populates form values', async () => {
    const { result } = renderHook(() => useEditPatientPage());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.patient).toEqual(basePatient);
    expect(result.current.values.firstName).toBe('Jane');
    expect(result.current.values.homePostcode).toBe('NG1 1AA');
  });

  test('set() updates a field and clears its error', async () => {
    const { result } = renderHook(() => useEditPatientPage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.set('firstName', 'Janet');
    });

    expect(result.current.values.firstName).toBe('Janet');
  });

  test('handleSubmit shows a validation error and does not update the patient when required fields are missing', async () => {
    const { result } = renderHook(() => useEditPatientPage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.set('firstName', '');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(notificationsState.showNotification).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'red', message: 'Please fill in all required fields.' })
    );
    expect(medplumState.updateResource).not.toHaveBeenCalled();
  });

  test('handleSubmit updates the patient and navigates back on success', async () => {
    const { result } = renderHook(() => useEditPatientPage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(medplumState.updateResource).toHaveBeenCalledWith(expect.objectContaining({ resourceType: 'Patient' }));
    expect(navigate).toHaveBeenCalledWith('/Patient/patient-1');
  });

  test('handleSubmit shows an error notification when the update fails', async () => {
    medplumState.updateResource.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useEditPatientPage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(notificationsState.showNotification).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'red', autoClose: false })
    );
  });

  test('handleCancel navigates back to the patient page', async () => {
    const { result } = renderHook(() => useEditPatientPage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleCancel();
    });

    expect(navigate).toHaveBeenCalledWith('/Patient/patient-1');
  });

  test('previewPatient matches the loaded patient when no photo has been selected', async () => {
    const { result } = renderHook(() => useEditPatientPage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.previewPatient).toEqual(basePatient);
  });

  test('onPhotoChange uploads the file as a Binary attachment and includes it in previewPatient and the saved patient', async () => {
    const { result } = renderHook(() => useEditPatientPage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const file = new File(['abc'], 'photo.png', { type: 'image/png' });
    const uploadedAttachment = { contentType: 'image/png', title: 'photo.png', url: 'Binary/photo-1' };
    medplumState.createAttachment.mockResolvedValue(uploadedAttachment);

    await act(async () => {
      await result.current.onPhotoChange(file);
    });

    expect(medplumState.createAttachment).toHaveBeenCalledWith({
      data: file,
      filename: 'photo.png',
      contentType: 'image/png',
    });
    expect(result.current.previewPatient?.photo?.[0]).toEqual(uploadedAttachment);

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(medplumState.updateResource).toHaveBeenCalledWith(expect.objectContaining({ photo: [uploadedAttachment] }));
  });

  test('onPhotoChange shows an error notification when the upload fails', async () => {
    const { result } = renderHook(() => useEditPatientPage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    medplumState.createAttachment.mockRejectedValue(new Error('upload failed'));
    const file = new File(['abc'], 'photo.png', { type: 'image/png' });

    await act(async () => {
      await result.current.onPhotoChange(file);
    });

    expect(notificationsState.showNotification).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'red', autoClose: false })
    );
    expect(result.current.previewPatient?.photo).toBeUndefined();
  });

  test('onDeletePhoto clears the photo from previewPatient and removes it from the saved patient', async () => {
    const existingPhoto = { contentType: 'image/png', title: 'old.png', url: 'Binary/old-photo' };
    medplumState.readResource.mockResolvedValue({ ...basePatient, photo: [existingPhoto] });
    const { result } = renderHook(() => useEditPatientPage());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.previewPatient?.photo).toEqual([existingPhoto]);

    act(() => {
      result.current.onDeletePhoto();
    });

    expect(result.current.previewPatient?.photo).toBeUndefined();

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(medplumState.updateResource).toHaveBeenCalledWith(expect.objectContaining({ photo: undefined }));
  });
});
