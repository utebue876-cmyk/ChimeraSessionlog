import type { DocumentReference, EpisodeOfCare, Practitioner } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { useActiveEpisode } from '../../hooks/useActiveEpisode';

export interface DocumentListItem {
  readonly document: DocumentReference;
  readonly author?: Practitioner;
}

export function useDocumentsPage(pageSize: number): {
  loading: boolean;
  error?: string;
  documents: DocumentListItem[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  activeEpisode: EpisodeOfCare | undefined;
  reload: () => void;
} {
  const medplum = useMedplum();
  const { patientId } = useParams();
  const { activeEpisode } = useActiveEpisode();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshCount, setRefreshCount] = useState(0);
  const totalPages = useMemo(() => Math.ceil(documents.length / pageSize), [documents.length, pageSize]);

  const reload = useCallback(() => setRefreshCount((c) => c + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function loadDocuments(): Promise<void> {
      setLoading(true);
      setError(undefined);

      if (!patientId) {
        setDocuments([]);
        setCurrentPage(1);
        setLoading(false);
        return;
      }

      try {
        const results = await medplum.searchResources('DocumentReference', [
          ['_count', '1000'],
          ['_sort', '-date'],
          ['subject', `Patient/${patientId}`],
        ]);

        const filtered = activeEpisode?.id
          ? results.filter((doc) =>
              doc.context?.encounter?.some((ref) => ref.reference === `EpisodeOfCare/${activeEpisode.id}`)
            )
          : results;

        if (!cancelled) {
          const items = await Promise.all(
            filtered.map(async (document) => {
              const authorRef = document.author?.[0];
              let author: Practitioner | undefined;

              if (authorRef?.reference?.startsWith('Practitioner/')) {
                try {
                  const result = await medplum.readReference(authorRef);
                  if (result.resourceType === 'Practitioner') {
                    author = result;
                  }
                } catch {
                  author = undefined;
                }
              }

              return { document, author };
            })
          );
          setDocuments(items);
          setCurrentPage(1);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load documents');
          setDocuments([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDocuments().catch(() => {
      if (!cancelled) {
        setError('Failed to load documents');
        setDocuments([]);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [patientId, activeEpisode?.id, medplum, refreshCount]);

  return {
    loading,
    error,
    documents,
    currentPage,
    setCurrentPage,
    totalPages,
    activeEpisode,
    reload,
  };
}
