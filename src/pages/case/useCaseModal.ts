import { showNotification } from '@mantine/notifications';
import { createReference, getQuestionnaireAnswers, normalizeErrorString } from '@medplum/core';
import type {
  Coverage,
  EpisodeOfCare,
  HumanName,
  InsurancePlan,
  Organization,
  Patient,
  Practitioner,
  QuestionnaireResponse,
  Reference,
  ServiceRequest,
} from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CASE_STATE_CODE_SYSTEM_URL,
  CASE_STATE_VALUESET_URL,
  COVERAGE_INSURANCE_PLAN_EXTENSION_URL,
  EOC_CASE_STATE_URL,
  MH_CASE_CONSENT_DATE_URL,
  MH_CASE_CONSENT_SIGNED_URL,
  OPTIMA_EMPLOYER_EXTENSION_URL,
  PATIENT_INTAKE_QUESTIONNAIRE_URL,
} from '../../config/chimera-urls';
import { AVIVA_HEALTH_NAME, VITALITY_HEALTH_NAME } from '../../config/constants';
import type { FieldErrors } from '../../hooks/useFieldErrors';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { useServiceTypeOptions } from '../../hooks/useServiceTypeOptions';
import { generateCaseNumber } from '../../utils/caseNumber';
import { mapCaseStateToEpisodeStatus } from '../../utils/episodeOfCare';
import { recordPatientActivity } from '../../utils/patientActivity';

export type CaseModalField =
  | 'status'
  | 'serviceTypeCode'
  | 'openedDate'
  | 'managingOrganization'
  | 'insuranceProvider'
  | 'insurancePlan'
  | 'policyNumber'
  | 'careManager'
  | 'consentDate';

const EPISODE_STATUS_VALUE_SET = 'http://hl7.org/fhir/ValueSet/episode-of-care-status';

export interface ValueSetOption {
  value: string;
  label: string;
  system?: string;
}

interface UseCaseModalProps {
  patient: Patient;
  opened: boolean;
  onClose: () => void;
  episode?: EpisodeOfCare;
  onCreated?: (episodeOfCare: EpisodeOfCare) => void;
  onSaved?: (episodeOfCare: EpisodeOfCare) => void;
  editMode?: boolean;
}

export interface UseCaseModalResult {
  status: string | null;
  setStatus: (value: string | null) => void;
  serviceTypeCode: string | null;
  setServiceTypeCode: (value: string | null) => void;
  openedDate: string;
  setOpenedDate: (value: string) => void;
  mhCaseStateCode: string | null;
  setMhCaseStateCode: (value: string | null) => void;

  managingOrganization: Reference<Organization> | undefined;
  setManagingOrganization: (value: Reference<Organization> | undefined) => void;
  setManagingOrganizationName: (value: string | undefined) => void;
  managingOrganizationResource: Organization | undefined;

  insuranceProvider: Reference<Organization> | undefined;
  setInsuranceProvider: (value: Reference<Organization> | undefined) => void;
  setInsuranceProviderName: (value: string | undefined) => void;
  setInsuranceProviderResource: (value: Organization | undefined) => void;
  insuranceProviderResource: Organization | undefined;

  insurancePlan: Reference<InsurancePlan> | undefined;
  setInsurancePlan: (value: Reference<InsurancePlan> | undefined) => void;
  setInsurancePlanResource: (value: InsurancePlan | undefined) => void;
  insurancePlanResource: InsurancePlan | undefined;
  requiresInsurancePlan: boolean;

  policyNumber: string;
  setPolicyNumber: (value: string) => void;

  careManager: Reference<Practitioner> | undefined;
  setCareManager: (value: Reference<Practitioner> | undefined) => void;
  setCareManagerName: (value: HumanName | undefined) => void;
  careManagerResource: Practitioner | undefined;

  consentSigned: boolean;
  setConsentSigned: (value: boolean) => void;
  consentDate: string;
  setConsentDate: (value: string) => void;

  optimaEmployer: Reference<Organization> | undefined;
  setOptimaEmployer: (value: Reference<Organization> | undefined) => void;
  setOptimaEmployerResource: (value: Organization | undefined) => void;
  optimaEmployerResource: Organization | undefined;
  optimaLocation: string;
  setOptimaLocation: (value: string) => void;
  optimaFacility: string;
  setOptimaFacility: (value: string) => void;
  hasOptimaExtension: boolean;

  isLoading: boolean;
  isEditMode: boolean;
  statusOptions: ValueSetOption[];
  mhCaseStateOptions: ValueSetOption[];
  serviceTypeOptions: ReturnType<typeof useServiceTypeOptions>['serviceTypeOptions'];
  fieldErrors: FieldErrors<CaseModalField>;
  handleSaveCase: () => Promise<void>;
}

export function useCaseModal({
  patient,
  opened,
  onClose,
  episode,
  onCreated,
  onSaved,
  editMode,
}: UseCaseModalProps): UseCaseModalResult {
  const medplum = useMedplum();
  const { fieldErrors, setFieldErrors, clearFieldError, clearAllFieldErrors } = useFieldErrors<CaseModalField>();
  const [status, setStatusRaw] = useState<string | null>(null);
  const [serviceTypeCode, setServiceTypeCodeRaw] = useState<string | null>(null);
  const [openedDate, setOpenedDateRaw] = useState('');
  const [mhCaseStateCode, setMhCaseStateCode] = useState<string | null>(null);
  // Frozen once per form display (not updated on selection) so the option list doesn't keep shrinking
  // as the user picks forward states.
  const [initialMhCaseStateCode, setInitialMhCaseStateCode] = useState<string | null>(null);
  const [managingOrganization, setManagingOrganizationRaw] = useState<Reference<Organization> | undefined>();
  const [_managingOrganizationName, setManagingOrganizationName] = useState<string | undefined>();
  const [managingOrganizationResource, setManagingOrganizationResource] = useState<Organization | undefined>();
  const [insuranceProvider, setInsuranceProviderRaw] = useState<Reference<Organization> | undefined>();
  const [insuranceProviderName, setInsuranceProviderName] = useState<string | undefined>();
  const [insuranceProviderResource, setInsuranceProviderResource] = useState<Organization | undefined>();
  const [insurancePlan, setInsurancePlanRaw] = useState<Reference<InsurancePlan> | undefined>();
  const [insurancePlanResource, setInsurancePlanResource] = useState<InsurancePlan | undefined>();
  const [policyNumber, setPolicyNumberRaw] = useState('');
  const [careManager, setCareManagerRaw] = useState<Reference<Practitioner> | undefined>();
  const [_careManagerName, setCareManagerName] = useState<HumanName | undefined>();
  const [careManagerResource, setCareManagerResource] = useState<Practitioner | undefined>();
  const [consentSigned, setConsentSignedRaw] = useState(false);
  const [consentDate, setConsentDateRaw] = useState('');
  const [optimaEmployer, setOptimaEmployerRaw] = useState<Reference<Organization> | undefined>();
  const [optimaEmployerResource, setOptimaEmployerResource] = useState<Organization | undefined>();
  const [optimaLocation, setOptimaLocationRaw] = useState('');
  const [optimaFacility, setOptimaFacilityRaw] = useState('');
  const hasOptimaExtension = Boolean(insuranceProviderName?.toLowerCase().includes('optima'));
  const requiresInsurancePlan =
    insuranceProviderName === AVIVA_HEALTH_NAME || insuranceProviderName === VITALITY_HEALTH_NAME;

  const setStatus = useCallback(
    (value: string | null) => {
      clearFieldError('status');
      setStatusRaw(value);
    },
    [clearFieldError]
  );

  const setServiceTypeCode = useCallback(
    (value: string | null) => {
      clearFieldError('serviceTypeCode');
      setServiceTypeCodeRaw(value);
    },
    [clearFieldError]
  );

  const setOpenedDate = useCallback(
    (value: string) => {
      clearFieldError('openedDate');
      setOpenedDateRaw(value);
    },
    [clearFieldError]
  );

  const setManagingOrganization = useCallback(
    (value: Reference<Organization> | undefined) => {
      clearFieldError('managingOrganization');
      setManagingOrganizationRaw(value);
    },
    [clearFieldError]
  );

  const setInsuranceProvider = useCallback(
    (value: Reference<Organization> | undefined) => {
      clearFieldError('insuranceProvider');
      setInsuranceProviderRaw(value);
      clearFieldError('insurancePlan');
      setInsurancePlanRaw(undefined);
      setInsurancePlanResource(undefined);
    },
    [clearFieldError]
  );

  const setInsurancePlan = useCallback(
    (value: Reference<InsurancePlan> | undefined) => {
      clearFieldError('insurancePlan');
      setInsurancePlanRaw(value);
    },
    [clearFieldError]
  );

  const setPolicyNumber = useCallback(
    (value: string) => {
      clearFieldError('policyNumber');
      setPolicyNumberRaw(value);
    },
    [clearFieldError]
  );

  const setCareManager = useCallback(
    (value: Reference<Practitioner> | undefined) => {
      clearFieldError('careManager');
      setCareManagerRaw(value);
    },
    [clearFieldError]
  );

  const setConsentSigned = useCallback(
    (value: boolean) => {
      setConsentSignedRaw(value);
      if (!value) {
        clearFieldError('consentDate');
        setConsentDateRaw('');
      }
    },
    [clearFieldError]
  );

  const setConsentDate = useCallback(
    (value: string) => {
      clearFieldError('consentDate');
      setConsentDateRaw(value);
    },
    [clearFieldError]
  );

  const setOptimaEmployer = useCallback(
    (value: Reference<Organization> | undefined) => setOptimaEmployerRaw(value),
    []
  );
  const setOptimaLocation = useCallback((value: string) => setOptimaLocationRaw(value), []);
  const setOptimaFacility = useCallback((value: string) => setOptimaFacilityRaw(value), []);

  const [isLoading, setIsLoading] = useState(false);
  const [statusOptions, setStatusOptions] = useState<ValueSetOption[]>([]);
  const [rawMhCaseStateOptions, setRawMhCaseStateOptions] = useState<ValueSetOption[]>([]);
  const [mhCaseStateOrdinals, setMhCaseStateOrdinals] = useState<Record<string, number>>({});
  const { allServiceTypeOptions, serviceTypeOptions } = useServiceTypeOptions(insuranceProviderName);
  const isEditMode = Boolean(episode?.id) || Boolean(editMode);

  useEffect(() => {
    if (!opened) {
      return;
    }

    clearAllFieldErrors();

    if (episode) {
      const existingMhCaseState = episode.extension?.find((ext) => ext.url === EOC_CASE_STATE_URL)?.valueCoding?.code;
      setStatusRaw(episode.status ?? null);
      setServiceTypeCodeRaw(episode.type?.[0]?.coding?.[0]?.code ?? null);
      setOpenedDateRaw(episode.period?.start?.slice(0, 10) ?? '');
      setMhCaseStateCode(existingMhCaseState ?? null);
      setInitialMhCaseStateCode(existingMhCaseState ?? null);
      setManagingOrganizationRaw(episode.managingOrganization as Reference<Organization> | undefined);
      setManagingOrganizationName(episode.managingOrganization?.display);
      setCareManagerRaw(episode.careManager as Reference<Practitioner> | undefined);
      setCareManagerName(undefined);

      const existingConsentSigned =
        episode.extension?.find((ext) => ext.url === MH_CASE_CONSENT_SIGNED_URL)?.valueBoolean ?? false;
      const existingConsentDate =
        episode.extension?.find((ext) => ext.url === MH_CASE_CONSENT_DATE_URL)?.valueDate ?? '';
      setConsentSignedRaw(existingConsentSigned);
      setConsentDateRaw(existingConsentDate);

      const optimaExt = episode.extension?.find((ext) => ext.url === OPTIMA_EMPLOYER_EXTENSION_URL);
      const employerEntry = optimaExt?.extension?.find((e) => e.url === 'employer');
      const employerRef = employerEntry?.valueReference as Reference<Organization> | undefined;
      setOptimaEmployerRaw(employerRef);
      if (employerRef) {
        medplum
          .readReference(employerRef)
          .then((org) => setOptimaEmployerResource(org))
          .catch(() => setOptimaEmployerResource(undefined));
      } else {
        setOptimaEmployerResource(undefined);
      }
      setOptimaLocationRaw(optimaExt?.extension?.find((e) => e.url === 'location')?.valueString ?? '');
      setOptimaFacilityRaw(optimaExt?.extension?.find((e) => e.url === 'facility')?.valueString ?? '');

      // Fetch full Organization resources for ResourceInput defaultValue
      const managingOrgRef = episode.managingOrganization as Reference<Organization> | undefined;
      if (managingOrgRef) {
        medplum
          .readReference(managingOrgRef)
          .then((org) => setManagingOrganizationResource(org))
          .catch(() => setManagingOrganizationResource(undefined));
      } else {
        setManagingOrganizationResource(undefined);
      }

      const careManagerRef = episode.careManager as Reference<Practitioner> | undefined;
      if (careManagerRef) {
        medplum
          .readReference(careManagerRef)
          .then((p) => {
            setCareManagerResource(p);
          })
          .catch(() => setCareManagerResource(undefined));
      } else {
        setCareManagerResource(undefined);
      }
      return;
    }

    setStatusRaw(statusOptions[0]?.value ?? null);
    setServiceTypeCodeRaw(null);
    setOpenedDateRaw('');
    setMhCaseStateCode(null);
    setInitialMhCaseStateCode(null);
    setManagingOrganizationRaw(undefined);
    setManagingOrganizationName(undefined);
    setManagingOrganizationResource(undefined);
    setInsuranceProvider(undefined);
    setInsuranceProviderResource(undefined);
    setPolicyNumberRaw('');
    setCareManagerRaw(undefined);
    setCareManagerName(undefined);
    setCareManagerResource(undefined);
    setConsentSignedRaw(false);
    setConsentDateRaw('');
    setOptimaEmployerRaw(undefined);
    setOptimaEmployerResource(undefined);
    setOptimaLocationRaw('');
    setOptimaFacilityRaw('');
  }, [opened, episode, statusOptions, clearAllFieldErrors, medplum, setInsuranceProvider]);

  useEffect(() => {
    let active = true;

    const toOptions = (contains?: Array<{ code?: string; display?: string; system?: string }>): ValueSetOption[] =>
      (contains || [])
        .filter((item): item is { code: string; display?: string; system?: string } => Boolean(item?.code))
        .map((item) => ({
          value: item.code,
          label: item.display || item.code,
          system: item.system,
        }));

    const loadValueSets = async (): Promise<void> => {
      try {
        const [statusExpansion, mhCaseStateExpansion, mhCaseStateCodeSystem] = await Promise.all([
          medplum.valueSetExpand({ url: EPISODE_STATUS_VALUE_SET }),
          medplum.valueSetExpand({ url: CASE_STATE_VALUESET_URL }),
          medplum.searchOne('CodeSystem', `url=${CASE_STATE_CODE_SYSTEM_URL}`),
        ]);

        if (!active) {
          return;
        }

        const newStatusOptions = toOptions(statusExpansion.expansion?.contains);
        const newMhCaseStateOptions = toOptions(mhCaseStateExpansion.expansion?.contains);
        const newMhCaseStateOrdinals = Object.fromEntries(
          (mhCaseStateCodeSystem?.concept ?? [])
            .map((concept) => {
              const ordinal = concept.property?.find((p) => p.code === 'ordinal')?.valueInteger;
              return concept.code && ordinal !== undefined ? [concept.code, ordinal] : undefined;
            })
            .filter((entry): entry is [string, number] => entry !== undefined)
        );

        setStatusOptions(newStatusOptions);
        setRawMhCaseStateOptions(newMhCaseStateOptions);
        setMhCaseStateOrdinals(newMhCaseStateOrdinals);

        setStatusRaw((prev) => prev || newStatusOptions[0]?.value || null);
      } catch (err) {
        if (!active) {
          return;
        }

        showNotification({
          color: 'red',
          title: 'Error loading case options',
          message: normalizeErrorString(err),
        });
      }
    };

    loadValueSets().catch(() => undefined);

    return () => {
      active = false;
    };
  }, [medplum]);

  // Load insurance provider from the episode's referralRequest -> ServiceRequest.requester
  useEffect(() => {
    const referralRef = episode?.referralRequest?.[0];
    if (!opened || !referralRef) {
      setInsuranceProviderRaw(undefined);
      setPolicyNumberRaw('');
      return;
    }

    let active = true;
    medplum
      .readReference(referralRef as Reference<ServiceRequest>)
      .then((sr) => {
        if (active) {
          setInsuranceProviderRaw(sr.requester as Reference<Organization> | undefined);
          const requesterRef = sr.requester as Reference<Organization> | undefined;
          if (requesterRef) {
            medplum
              .readReference(requesterRef)
              .then((org) => {
                if (active) {
                  setInsuranceProviderResource(org);
                  setInsuranceProviderName(org.name);
                }
              })
              .catch(() => {
                if (active) {
                  setInsuranceProviderResource(undefined);
                  setInsuranceProviderName(undefined);
                }
              });
          } else {
            setInsuranceProviderResource(undefined);
          }

          const coverageRef = sr.insurance?.[0] as Reference<Coverage> | undefined;
          if (coverageRef) {
            medplum
              .readReference(coverageRef)
              .then((cov) => {
                if (active) {
                  setPolicyNumberRaw(cov.subscriberId ?? '');
                  const planRef = cov.extension?.find((ext) => ext.url === COVERAGE_INSURANCE_PLAN_EXTENSION_URL)
                    ?.valueReference as Reference<InsurancePlan> | undefined;
                  setInsurancePlanRaw(planRef);
                  if (planRef) {
                    medplum
                      .readReference(planRef)
                      .then((plan) => {
                        if (active) setInsurancePlanResource(plan);
                      })
                      .catch(() => {
                        if (active) setInsurancePlanResource(undefined);
                      });
                  } else {
                    setInsurancePlanResource(undefined);
                  }
                }
              })
              .catch(() => {
                if (active) {
                  setPolicyNumberRaw('');
                }
              });
          } else {
            setPolicyNumberRaw('');
          }
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [opened, episode?.referralRequest, medplum]);

  // Pre-fill policy number from existing Coverage when insurance provider is selected in create mode
  useEffect(() => {
    if (isEditMode || !insuranceProviderResource?.id || !patient.id) {
      return;
    }

    let active = true;
    medplum
      .searchResources('Coverage', {
        beneficiary: `Patient/${patient.id}`,
        payor: `Organization/${insuranceProviderResource.id}`,
        _sort: '-_lastUpdated',
        _count: '1',
      })
      .then((coverages) => {
        if (active) {
          setPolicyNumberRaw(coverages[0]?.subscriberId ?? '');
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [insuranceProviderResource?.id, isEditMode, patient.id, medplum]);

  // Pre-fill consent from the patient's intake QuestionnaireResponse in create mode
  useEffect(() => {
    if (isEditMode || !opened || !patient.id) {
      return;
    }

    let active = true;
    medplum
      .searchResources('QuestionnaireResponse', {
        subject: `Patient/${patient.id}`,
        questionnaire: PATIENT_INTAKE_QUESTIONNAIRE_URL,
        _sort: '-_lastUpdated',
        _count: '1',
      })
      .then((results) => {
        if (!active || results.length === 0) return;
        const answers = getQuestionnaireAnswers(results[0] as QuestionnaireResponse);
        const signed = answers['consent-for-treatment-signature']?.valueBoolean ?? false;
        const date = answers['consent-for-treatment-date']?.valueDate ?? '';
        setConsentSignedRaw(signed);
        setConsentDateRaw(date);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [isEditMode, opened, patient.id, medplum]);

  useEffect(() => {
    if (!serviceTypeCode) {
      return;
    }

    const selectedStillAllowed = serviceTypeOptions.some((option) => option.value === serviceTypeCode);
    if (selectedStillAllowed) {
      return;
    }

    setServiceTypeCodeRaw(null);
  }, [serviceTypeCode, serviceTypeOptions]);

  // Once the saved case state is on the lifecycle spine, only forward (or equal) states can be selected.
  // Filtered against the state the form was opened with, so the list doesn't change as the user selects.
  const mhCaseStateOptions = useMemo(() => {
    const currentOrdinal = initialMhCaseStateCode ? mhCaseStateOrdinals[initialMhCaseStateCode] : undefined;
    if (currentOrdinal === undefined) {
      return rawMhCaseStateOptions;
    }
    return rawMhCaseStateOptions.filter((option) => {
      const optionOrdinal = mhCaseStateOrdinals[option.value];
      return optionOrdinal !== undefined && optionOrdinal >= currentOrdinal;
    });
  }, [rawMhCaseStateOptions, mhCaseStateOrdinals, initialMhCaseStateCode]);

  const mhCaseStateDisplay = useMemo(
    () => mhCaseStateOptions.find((option) => option.value === mhCaseStateCode)?.label,
    [mhCaseStateCode, mhCaseStateOptions]
  );

  const serviceTypeOption = useMemo(
    () => allServiceTypeOptions.find((option) => option.value === serviceTypeCode),
    [allServiceTypeOptions, serviceTypeCode]
  );

  const mhCaseStateOption = useMemo(
    () => mhCaseStateOptions.find((option) => option.value === mhCaseStateCode),
    [mhCaseStateCode, mhCaseStateOptions]
  );

  const handleSaveCase = async (): Promise<void> => {
    const errors: FieldErrors<CaseModalField> = {};
    if (!status) errors.status = 'Required';
    if (!serviceTypeCode) errors.serviceTypeCode = 'Required';
    if (!openedDate) errors.openedDate = 'Required';
    if (!managingOrganization) errors.managingOrganization = 'Required';
    if (!insuranceProvider) errors.insuranceProvider = 'Required';
    if (requiresInsurancePlan && !insurancePlan) errors.insurancePlan = 'Required';
    if (!policyNumber) errors.policyNumber = 'Required';
    if (!careManager) errors.careManager = 'Required';
    if (consentSigned && !consentDate) errors.consentDate = 'Required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showNotification({
        color: 'yellow',
        title: 'Missing required fields',
        message:
          'Please provide Status, Service Type, Opened Date, Client/Organisation, Insurance Provider, Insurance Plan (for Aviva/Vitality), Policy Number, Care Manager, and Consent Date (when consent is signed) before saving a case.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const mhCaseStateExtension = mhCaseStateCode
        ? [
            {
              url: EOC_CASE_STATE_URL,
              valueCoding: {
                ...(mhCaseStateOption?.system ? { system: mhCaseStateOption.system } : {}),
                code: mhCaseStateCode,
                display: mhCaseStateDisplay ?? mhCaseStateCode,
              },
            },
          ]
        : [];

      const consentExtensions: EpisodeOfCare['extension'] = [
        { url: MH_CASE_CONSENT_SIGNED_URL, valueBoolean: consentSigned },
        ...(consentSigned && consentDate ? [{ url: MH_CASE_CONSENT_DATE_URL, valueDate: consentDate }] : []),
      ];
      const otherExtensions = (episode?.extension || []).filter(
        (ext) =>
          ext.url !== EOC_CASE_STATE_URL &&
          ext.url !== MH_CASE_CONSENT_SIGNED_URL &&
          ext.url !== MH_CASE_CONSENT_DATE_URL &&
          ext.url !== OPTIMA_EMPLOYER_EXTENSION_URL
      );
      const optimaExtensions: EpisodeOfCare['extension'] = hasOptimaExtension
        ? [
            {
              url: OPTIMA_EMPLOYER_EXTENSION_URL,
              extension: [
                ...(optimaEmployer ? [{ url: 'employer', valueReference: optimaEmployer }] : []),
                ...(optimaLocation ? [{ url: 'location', valueString: optimaLocation }] : []),
                ...(optimaFacility ? [{ url: 'facility', valueString: optimaFacility }] : []),
              ],
            },
          ]
        : [];
      const nextExtensions = [...otherExtensions, ...mhCaseStateExtension, ...consentExtensions, ...optimaExtensions];

      const episodeToSave: EpisodeOfCare = {
        resourceType: 'EpisodeOfCare',
        ...(episode?.id ? { id: episode.id } : {}),
        // Derived from the case-state (mhCaseStateCode), not the Status field directly, so the two
        // can never drift out of sync — see mapCaseStateToEpisodeStatus for the code -> status mapping.
        status: mapCaseStateToEpisodeStatus(mhCaseStateCode ?? undefined, status as EpisodeOfCare['status']),
        patient: episode?.patient || createReference(patient),
        type: [
          {
            ...(serviceTypeOption?.system
              ? {
                  coding: [
                    {
                      system: serviceTypeOption.system,
                      code: serviceTypeOption.value,
                      display: serviceTypeOption.label,
                    },
                  ],
                }
              : {}),
            text: serviceTypeOption?.label || serviceTypeCode || undefined,
          },
        ],
        period: { start: openedDate },
        identifier:
          episode?.identifier && episode.identifier.length > 0
            ? episode.identifier
            : [await generateCaseNumber(medplum)],
        managingOrganization,
        careManager,
        ...(nextExtensions.length > 0 ? { extension: nextExtensions } : {}),
        account: episode?.account || undefined,
        ...(episode?.diagnosis ? { diagnosis: episode.diagnosis } : {}),
      };

      // Create or update the ServiceRequest for the insurance provider
      if (insuranceProvider) {
        // Read the existing ServiceRequest at save time to get the current Coverage reference
        const existingReferralRef = episode?.referralRequest?.[0] as Reference<ServiceRequest> | undefined;
        let existingServiceRequest: ServiceRequest | undefined;
        if (existingReferralRef) {
          existingServiceRequest = await medplum.readReference(existingReferralRef);
        }

        // Create or update the Coverage for this case
        let coverage: Coverage;
        const currentCoverageRef = existingServiceRequest?.insurance?.[0] as Reference<Coverage> | undefined;
        const insurancePlanExtension = insurancePlan
          ? [{ url: COVERAGE_INSURANCE_PLAN_EXTENSION_URL, valueReference: insurancePlan }]
          : [];
        if (currentCoverageRef) {
          const existingCoverage = await medplum.readReference(currentCoverageRef);
          coverage = await medplum.updateResource<Coverage>({
            ...existingCoverage,
            subscriberId: policyNumber || undefined,
            payor: [insuranceProvider],
            extension: [
              ...(existingCoverage.extension || []).filter((ext) => ext.url !== COVERAGE_INSURANCE_PLAN_EXTENSION_URL),
              ...insurancePlanExtension,
            ],
          });
        } else {
          coverage = await medplum.createResource<Coverage>({
            resourceType: 'Coverage',
            status: 'active',
            beneficiary: createReference(patient),
            subscriberId: policyNumber || undefined,
            payor: [insuranceProvider],
            ...(insurancePlanExtension.length > 0 ? { extension: insurancePlanExtension } : {}),
          });
        }

        let serviceRequest: ServiceRequest;
        if (existingServiceRequest) {
          serviceRequest = await medplum.updateResource<ServiceRequest>({
            ...existingServiceRequest,
            requester: insuranceProvider,
            insurance: [createReference(coverage)],
          });
        } else {
          serviceRequest = await medplum.createResource<ServiceRequest>({
            resourceType: 'ServiceRequest',
            status: 'active',
            intent: 'order',
            subject: createReference(patient),
            requester: insuranceProvider,
            insurance: [createReference(coverage)],
          });
        }
        episodeToSave.referralRequest = [createReference(serviceRequest)];
      } else if (episode?.referralRequest) {
        episodeToSave.referralRequest = episode.referralRequest;
      }

      const savedEpisode = isEditMode
        ? await medplum.updateResource(episodeToSave)
        : await medplum.createResource(episodeToSave);

      showNotification({
        color: 'green',
        title: 'Success',
        message: isEditMode ? 'Case updated.' : 'Case created.',
      });

      onSaved?.(savedEpisode);
      onCreated?.(savedEpisode);
      recordPatientActivity(medplum, patient.id);
      onClose();
    } catch (err) {
      showNotification({ color: 'red', title: 'Error', message: normalizeErrorString(err) });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    status,
    setStatus,
    serviceTypeCode,
    setServiceTypeCode,
    openedDate,
    setOpenedDate,
    mhCaseStateCode,
    setMhCaseStateCode,
    managingOrganization,
    setManagingOrganization,
    setManagingOrganizationName,
    managingOrganizationResource,
    insuranceProvider,
    setInsuranceProvider,
    setInsuranceProviderName,
    setInsuranceProviderResource,
    insuranceProviderResource,
    insurancePlan,
    setInsurancePlan,
    setInsurancePlanResource,
    insurancePlanResource,
    requiresInsurancePlan,
    policyNumber,
    setPolicyNumber,
    careManager,
    setCareManager,
    careManagerResource,
    setCareManagerName,
    consentSigned,
    setConsentSigned,
    consentDate,
    setConsentDate,
    optimaEmployer,
    setOptimaEmployer,
    setOptimaEmployerResource,
    optimaEmployerResource,
    optimaLocation,
    setOptimaLocation,
    optimaFacility,
    setOptimaFacility,
    hasOptimaExtension,
    isLoading,
    isEditMode,
    statusOptions,
    mhCaseStateOptions,
    serviceTypeOptions,
    fieldErrors,
    handleSaveCase,
  };
}
