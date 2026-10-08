import { showNotification } from '@mantine/notifications';
import { deepClone, normalizeErrorString, normalizeOperationOutcome } from '@medplum/core';
import type { OperationOutcome, Resource, ResourceType } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import type { JSX } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ResourceFormWithRequiredProfile } from '../../components/common/ResourceFormWithRequiredProfile';
import { recordPatientActivity } from '../../utils/patientActivity';
import { RESOURCE_PROFILE_URLS } from './utils';

export function ResourceEditPage(): JSX.Element | null {
  const medplum = useMedplum();
  const { resourceType, id } = useParams() as { resourceType: ResourceType | undefined; id: string | undefined };
  const [value, setValue] = useState<Resource | undefined>();
  const navigate = useNavigate();
  const [outcome, setOutcome] = useState<OperationOutcome | undefined>();
  const profileUrl = resourceType && RESOURCE_PROFILE_URLS[resourceType];

  useEffect(() => {
    if (resourceType && id) {
      medplum
        .readResource(resourceType, id)
        .then((resource) => setValue(deepClone(resource)))
        .catch((err) => {
          setOutcome(normalizeOperationOutcome(err));
          showNotification({ color: 'red', message: normalizeErrorString(err), autoClose: false });
        });
    }
  }, [medplum, resourceType, id]);

  const handleSubmit = useCallback(
    (newResource: Resource): void => {
      setOutcome(undefined);
      medplum
        .updateResource(newResource)
        .then(() => {
          const r = newResource as unknown as Record<string, { reference?: string } | undefined>;
          const patientId =
            newResource.resourceType === 'Patient'
              ? newResource.id
              : (r.patient?.reference ?? r.subject?.reference)?.split('/')?.[1];
          recordPatientActivity(medplum, patientId);
          navigate('..')?.catch(console.error);
          showNotification({ color: 'green', message: 'Success' });
        })
        .catch((err) => {
          setOutcome(normalizeOperationOutcome(err));
          showNotification({ color: 'red', message: normalizeErrorString(err), autoClose: false });
        });
    },
    [medplum, navigate]
  );

  const handleDelete = useCallback(() => navigate('..')?.catch(console.error), [navigate]);

  if (!value) {
    return null;
  }

  return (
    <ResourceFormWithRequiredProfile
      defaultValue={value}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
      outcome={outcome}
      profileUrl={profileUrl}
    />
  );
}
