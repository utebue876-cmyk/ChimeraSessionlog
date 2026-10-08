import { AppShell, Loading, useMedplum, useMedplumProfile } from '@medplum/react';
import type { JSX } from 'react';
import { Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router';
import { TaskDetailsModal } from './components/tasks/TaskDetailsModal';
import './index.css';

// Add a class to <html> so CSS can target Chrome specifically.
// Edge also has 'Chrome' in its UA but always includes 'Edg/'.
if (/Chrome/.test(navigator.userAgent) && !/Edg\//.test(navigator.userAgent)) {
  document.documentElement.classList.add('is-chrome');
}

import { AccountPage } from './pages/account/AccountPage';
import { PatientsPage } from './pages/allPatients/PatientsPage';
import { CareManagerCasesPage } from './pages/careManager/CareManagerCasesPage';
import { DocumentsPage } from './pages/document/DocumentsPage';
import { EditPatientPage } from './pages/editPatient/EditPatientPage';
import { EncounterChartPage } from './pages/encounter/EncounterChartPage';
import { EncounterModal } from './pages/encounter/EncounterModal';
import { EncountersPage } from './pages/encounter/EncountersPage';
import { FindPatientPage } from './pages/findPatient/FindPatientPage';
import { MessagesPage } from './pages/messages/MessagesPage';
import { OdsSearchOrganisationPage } from './pages/odsSearch/OdsSearchOrganisationPage';
import { OdsSearchPage } from './pages/odsSearch/OdsSearchPage';
import { PatientPage } from './pages/patient/PatientPage';
import { PatientSearchPage } from './pages/patient/PatientSearchPage';
import { CaseTab } from './pages/patient/tabs/CaseTab';
import { CommunicationTab } from './pages/patient/tabs/CommunicationTab';
import { EditTab } from './pages/patient/tabs/EditTab';
import { ExportTab } from './pages/patient/tabs/ExportTab';
import { TasksTab } from './pages/patient/tabs/TasksTab';
import { TimelineTab } from './pages/patient/tabs/TimelineTab';
import { PatientIntakeFormPage } from './pages/patientIntake/PatientIntakeFormPage';
import { RecentPatients } from './pages/recentPatients/RecentPatients';
import { ResourceCreatePage } from './pages/resource/ResourceCreatePage';
import { ResourceDetailPage } from './pages/resource/ResourceDetailPage';
import { ResourceEditPage } from './pages/resource/ResourceEditPage';
import { ResourceHistoryPage } from './pages/resource/ResourceHistoryPage';
import { ResourcePage } from './pages/resource/ResourcePage';
import { SchedulePage } from './pages/schedule/SchedulePage';
import { SearchPage } from './pages/search/SearchPage';
import { SelfReferralPage } from './pages/selfReferral/SelfReferralPage';
import { ServiceSchedulePage } from './pages/serviceSchedule/ServiceSchedulePage';
import { SignInPage } from './pages/signin/SignInPage';
import { TaskPage } from './pages/tasks/TaskPage';
import { TaskSearchPage } from './pages/tasks/TaskSearchPage';
import { TasksPage } from './pages/tasks/TasksPage';
import { TreatmentPathwayPage } from './pages/treatmentPathway/TreatmentPathwayPage';

import { ProjectNotConfiguredError, fetchProjectOrganizationSettings } from './config/projectOrganization';
import { UK_CORE_EXTENSION_URLS } from './config/uk-core-urls';
import { useLanguageFilter } from './hooks/useLanguageFilter';
import { useMenu } from './menus/useMenu';
import { ProjectError } from './pages/config/ProjectError';
import { PatientPortalLayout } from './portals/patientPortal/PatientPortalLayout';
import { PatientPortalPage } from './portals/patientPortal/PatientPortalPage';
import { useProjectOrganizationStore } from './store/projectOrganizationStore';

export function App(): JSX.Element | null {
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { getMenus, getHomeRoute } = useMenu();
  const { organizationCode } = useProjectOrganizationStore();
  const [orgError, setOrgError] = useState<ProjectNotConfiguredError | null>(null);
  const shortCommit = import.meta.env.VITE_APP_COMMIT.slice(0, 8);
  const buildDate = new Date(import.meta.env.VITE_APP_BUILD_TIME).toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const appVersionLabel = `v${import.meta.env.VITE_APP_VERSION} • ${shortCommit} • ${buildDate}`;

  useLanguageFilter();

  useEffect(() => {
    if (profile) {
      if (profile.resourceType !== 'Patient') {
        fetchProjectOrganizationSettings(medplum).catch((err: unknown) =>
          setOrgError(err instanceof ProjectNotConfiguredError ? err : new ProjectNotConfiguredError('unknown'))
        );
      }
      // Load UK Core extension StructureDefinitions into the client schema from the server.
      void Promise.all(UK_CORE_EXTENSION_URLS.map((url) => medplum.requestProfileSchema(url)));
    }
  }, [medplum, profile]);

  if (medplum.isLoading()) {
    return null;
  }

  if (orgError) {
    return <ProjectError error={orgError} />;
  }

  if (profile && !organizationCode && profile.resourceType !== 'Patient') {
    return null;
  }

  if (location.pathname.startsWith('/self-referral')) {
    return (
      <Routes>
        <Route path="/self-referral" element={<SelfReferralPage />} />
      </Routes>
    );
  }

  if (profile?.resourceType === 'Patient') {
    return (
      <PatientPortalLayout>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/portal" element={<PatientPortalPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="*" element={<Navigate to="/portal" replace />} />
          </Routes>
        </Suspense>
      </PatientPortalLayout>
    );
  }

  return (
    <AppShell
      logo={<img src="/iprshealth.png" alt="IPRS Health" style={{ height: 24, width: 24 }} />}
      pathname={location.pathname}
      searchParams={searchParams}
      version={appVersionLabel}
      layoutVersion="v2"
      showLayoutVersionToggle={false}
      menus={getMenus()}
      headerSearchDisabled={true}
      resourceTypeSearchDisabled={true}
      spotlightPatientsOnly={false}
    >
      <Suspense fallback={<Loading />}>
        <Routes>
          {profile ? (
            <>
              <Route path="/" element={<Navigate to={getHomeRoute()} replace />} />
              <Route path="/Patient/new" element={<ResourceCreatePage />} />
              <Route path="/Patient/:patientId" element={<PatientPage />}>
                <Route path="Encounter/new" element={<EncounterModal />} />
                <Route path="Encounter/:encounterId" element={<EncounterChartPage />}>
                  <Route path="Task/:taskId" element={<TaskDetailsModal />} />
                </Route>
                <Route path="encounters" element={<EncountersPage />} />
                <Route path="treatment" element={<TreatmentPathwayPage />} />
                <Route path="account" element={<AccountPage />} />
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="edit" element={<EditTab />} />
                <Route path="edit-patient" element={<EditPatientPage />} />
                <Route path="Communication" element={<CommunicationTab />} />
                <Route path="Communication/:messageId" element={<CommunicationTab />} />
                <Route path="Task" element={<TasksTab />} />
                <Route caseSensitive path="Task/:taskId" element={<TasksTab />} />
                <Route path="timeline" element={<TimelineTab />} />
                <Route path="export" element={<ExportTab />} />
                <Route path=":resourceType" element={<PatientSearchPage />} />
                <Route path=":resourceType/new" element={<ResourceCreatePage />} />
                <Route path=":resourceType/:id" element={<ResourcePage />}>
                  <Route path="" element={<ResourceDetailPage />} />
                  <Route path="edit" element={<ResourceEditPage />} />
                  <Route path="history" element={<ResourceHistoryPage />} />
                </Route>
                <Route path="" element={<CaseTab />} />
                <Route path="case" element={<CaseTab />} />
                <Route caseSensitive path="task/:id" element={<TaskPage />} />
                <Route caseSensitive path="task/:id/:tab" element={<TaskPage />} />
              </Route>
              <Route path="/Communication" element={<MessagesPage />}>
                <Route index element={<MessagesPage />} />
                <Route path=":messageId" element={<MessagesPage />} />
              </Route>
              <Route path="/Task/:id">
                <Route index element={<TaskPage />} />
                <Route path="*" element={<TaskPage />} />
              </Route>
              <Route path="/Task" element={<TaskSearchPage mode="all" />} />
              <Route path="/my-tasks" element={<TaskSearchPage mode="mine" />} />
              <Route path="/team-tasks" element={<TaskSearchPage mode="team" />} />
              <Route path="/Task/:taskId" element={<TasksPage />} />
              <Route path="/intake/new" element={<PatientIntakeFormPage />} />
              <Route path="/utilities/gp-lookup" element={<OdsSearchPage />} />
              <Route path="/utilities/gp-practices" element={<OdsSearchOrganisationPage />} />
              <Route path="/self-referral" element={<SelfReferralPage />} />
              <Route path="/findPatient" element={<FindPatientPage />} />
              <Route path="/Patients" element={<PatientsPage />} />
              <Route path="/my-cases" element={<CareManagerCasesPage />} />
              <Route path="/recentPatients" element={<RecentPatients />} />
              <Route path="/Calendar/Schedule" element={<SchedulePage />} />
              <Route path="/Calendar/Schedule/:id" element={<SchedulePage />} />
              <Route path="/Calendar/ServiceSchedule" element={<ServiceSchedulePage />} />
              <Route path="/signin" element={<SignInPage />} />
              <Route path="/:resourceType" element={<SearchPage />} />
              <Route path="/:resourceType/new" element={<ResourceCreatePage />} />
              <Route path="/:resourceType/:id" element={<ResourcePage />}>
                <Route path="" element={<ResourceDetailPage />} />
                <Route path="edit" element={<ResourceEditPage />} />
                <Route path="history" element={<ResourceHistoryPage />} />
              </Route>
            </>
          ) : (
            <>
              <Route path="/signin" element={<SignInPage />} />
              <Route path="*" element={<Navigate to="/signin" replace />} />
            </>
          )}
        </Routes>
      </Suspense>
    </AppShell>
  );
}
