import { useMedplum } from '@medplum/react';
import { useEffect, useState } from 'react';
import { MH_SERVICE_VALUESET_AVIVA_URL, MH_SERVICE_VALUESET_VITALITY_URL } from '../config/chimera-urls';

export interface ServiceTypeOption {
  value: string;
  label: string;
  system?: string;
}

function toOptions(contains?: Array<{ code?: string; display?: string; system?: string }>): ServiceTypeOption[] {
  return (contains ?? [])
    .filter((item): item is { code: string; display?: string; system?: string } => Boolean(item?.code))
    .map((item) => ({
      value: item.code,
      label: item.display || item.code,
      system: item.system,
    }));
}

function isVitalityOrganization(organizationName?: string): boolean {
  return (organizationName?.trim().toLowerCase() ?? '').includes('vitality');
}

export function useServiceTypeOptions(organizationName?: string): {
  allServiceTypeOptions: ServiceTypeOption[];
  serviceTypeOptions: ServiceTypeOption[];
  loading: boolean;
  isVitalityOrganizationSelected: boolean;
} {
  const medplum = useMedplum();
  const [serviceTypeOptions, setServiceTypeOptions] = useState<ServiceTypeOption[]>([]);
  const [loading, setLoading] = useState(true);

  const isVitalityOrganizationSelected = isVitalityOrganization(organizationName);
  const valueSetUrl = isVitalityOrganizationSelected ? MH_SERVICE_VALUESET_VITALITY_URL : MH_SERVICE_VALUESET_AVIVA_URL;

  useEffect(() => {
    let active = true;
    setLoading(true);

    medplum
      .valueSetExpand({ url: valueSetUrl })
      .then((expanded) => {
        if (!active) {
          return;
        }
        setServiceTypeOptions(toOptions(expanded.expansion?.contains));
      })
      .catch(() => {
        if (active) {
          setServiceTypeOptions([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [medplum, valueSetUrl]);

  return {
    allServiceTypeOptions: serviceTypeOptions,
    serviceTypeOptions,
    loading,
    isVitalityOrganizationSelected,
  };
}
