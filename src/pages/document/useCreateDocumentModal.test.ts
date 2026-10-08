import { renderHook } from '@testing-library/react';
import { act } from 'react';
import * as reactRouter from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { useCreateDocumentModal } from './useCreateDocumentModal';

const createAttachment = vi.hoisted(() => vi.fn());
const createResource = vi.hoisted(() => vi.fn());
const getProfile = vi.hoisted(() => vi.fn());
const medplumState = vi.hoisted(() => ({ createAttachment, createResource, getProfile }));
const showNotification = vi.hoisted(() => vi.fn());
const recordPatientActivity = vi.hoisted(() => vi.fn());

vi.mock('@medplum/react', () => ({
  useMedplum: () => medplumState,
}));

vi.mock('../../hooks/usePatient', () => ({
  usePatient: () => ({ resourceType: 'Patient', id: 'p1' }),
}));

vi.mock('../../hooks/useActiveEpisode', () => ({
  useActiveEpisode: () => ({
    activeEpisode: { resourceType: 'EpisodeOfCare', id: 'e1', identifier: [{ value: 'CASE-1' }] },
  }),
}));

vi.mock('@mantine/notifications', () => ({ showNotification }));
vi.mock('../../utils/patientActivity', () => ({ recordPatientActivity }));

describe('useCreateDocumentModal', () => {
  test('validates required fields before submit', async () => {
    vi.spyOn(reactRouter, 'useParams').mockReturnValue({ patientId: 'p1' } as any);
    getProfile.mockReturnValue(undefined);

    const { result } = renderHook(() => useCreateDocumentModal({ onClose: vi.fn() }));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.fieldErrors.description).toBe('Required');
    expect(result.current.fieldErrors.file).toBe('A file is required');
  });

  test('creates attachment + document and closes on success', async () => {
    const onClose = vi.fn();
    vi.spyOn(reactRouter, 'useParams').mockReturnValue({ patientId: 'p1' } as any);
    getProfile.mockReturnValue({
      resourceType: 'Practitioner',
      id: 'pr1',
      name: [{ family: 'Smith', given: ['Alex'] }],
    });
    createAttachment.mockResolvedValue({ url: 'https://example/file.pdf', title: 'file.pdf' });
    createResource.mockResolvedValue({ resourceType: 'DocumentReference', id: 'd1' });

    const { result } = renderHook(() => useCreateDocumentModal({ onClose }));

    const file = new File(['x'], 'file.pdf', { type: 'application/pdf' });
    act(() => {
      result.current.setDescription('Clinical note');
      result.current.setDocumentType({ text: 'Clinical Note' });
      result.current.setStatus('current');
      result.current.setDocStatus('final');
      result.current.setFile(file);
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(createAttachment).toHaveBeenCalled();
    expect(createResource).toHaveBeenCalledWith(expect.objectContaining({ resourceType: 'DocumentReference' }));
    expect(recordPatientActivity).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(showNotification).toHaveBeenCalledWith(expect.objectContaining({ title: 'Success' }));
  });
});
