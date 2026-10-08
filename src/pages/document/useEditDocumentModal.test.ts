import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import * as reactRouter from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { useEditDocumentModal } from './useEditDocumentModal';

const readResource = vi.hoisted(() => vi.fn());
const createAttachment = vi.hoisted(() => vi.fn());
const updateResource = vi.hoisted(() => vi.fn());
const deleteResource = vi.hoisted(() => vi.fn());
const medplumState = vi.hoisted(() => ({ readResource, createAttachment, updateResource, deleteResource }));
const showNotification = vi.hoisted(() => vi.fn());
const recordPatientActivity = vi.hoisted(() => vi.fn());

vi.mock('@medplum/react', () => ({ useMedplum: () => medplumState }));
vi.mock('@mantine/notifications', () => ({ showNotification }));
vi.mock('../../utils/patientActivity', () => ({ recordPatientActivity }));

describe('useEditDocumentModal', () => {
  test('loads initial document by id', async () => {
    vi.spyOn(reactRouter, 'useParams').mockReturnValue({ patientId: 'p1' } as any);
    readResource.mockResolvedValue({
      resourceType: 'DocumentReference',
      id: 'd1',
      status: 'current',
      docStatus: 'final',
      description: 'Existing',
      type: { text: 'Clinical' },
      content: [{ attachment: { url: 'x', title: 'f.pdf' } }],
    });

    const { result } = renderHook(() => useEditDocumentModal({ documentId: 'd1', onClose: vi.fn() }));
    await waitFor(() => expect(result.current.loadingDocument).toBe(false));

    expect(result.current.initialDocument?.id).toBe('d1');
    expect(result.current.description).toBe('Existing');
  });

  test('updates document when fields are valid', async () => {
    const onClose = vi.fn();
    vi.spyOn(reactRouter, 'useParams').mockReturnValue({ patientId: 'p1' } as any);
    readResource.mockResolvedValue({
      resourceType: 'DocumentReference',
      id: 'd1',
      status: 'current',
      docStatus: 'final',
      description: 'Existing',
      type: { text: 'Clinical' },
      content: [{ attachment: { url: 'x', title: 'f.pdf' } }],
    });
    createAttachment.mockResolvedValue({ url: 'new', title: 'new.pdf' });
    updateResource.mockResolvedValue({ id: 'd1' });

    const { result } = renderHook(() => useEditDocumentModal({ documentId: 'd1', onClose }));
    await waitFor(() => expect(result.current.loadingDocument).toBe(false));

    act(() => {
      result.current.setDescription('Updated');
      result.current.setDocumentType({ text: 'Updated type' });
      result.current.setStatus('current');
      result.current.setDocStatus('final');
      result.current.setFile(new File(['x'], 'new.pdf', { type: 'application/pdf' }));
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(updateResource).toHaveBeenCalled();
    expect(recordPatientActivity).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  test('deletes document by id', async () => {
    const onClose = vi.fn();
    vi.spyOn(reactRouter, 'useParams').mockReturnValue({ patientId: 'p1' } as any);
    readResource.mockResolvedValue({
      resourceType: 'DocumentReference',
      id: 'd1',
      status: 'current',
      docStatus: 'final',
      content: [{ attachment: { url: 'x' } }],
    });

    const { result } = renderHook(() => useEditDocumentModal({ documentId: 'd1', onClose }));
    await waitFor(() => expect(result.current.loadingDocument).toBe(false));

    await act(async () => {
      await result.current.handleDelete();
    });

    expect(deleteResource).toHaveBeenCalledWith('DocumentReference', 'd1');
    expect(onClose).toHaveBeenCalled();
  });
});
