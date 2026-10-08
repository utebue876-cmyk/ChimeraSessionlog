import { Loader, ScrollArea } from '@mantine/core';
import { getReferenceString, isOk } from '@medplum/core';
import type { OperationOutcome } from '@medplum/fhirtypes';
import { Document, OperationOutcomeAlert, useMedplum } from '@medplum/react';
import type { JSX } from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { Location } from 'react-router';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { usePatient } from '../../hooks/usePatient';
import { useEpisodeOfCareStore } from '../../store/episodeOfCareStore';
import { PatientSidebar } from '../patientSidebar/PatientSidebar';
import classes from './PatientPage.module.css';
import type { PatientPageTabInfo } from './PatientPageUtils';
import { formatPatientPageTabUrl, getPatientPageTabs } from './PatientPageUtils';
import { PatientTabsNavigation } from './tabs/PatientTabsNavigation';

function getTabFromLocation(location: Location, tabs: PatientPageTabInfo[]): PatientPageTabInfo | undefined {
  const tabId = location.pathname.split('/')[3] ?? '';
  // If tabId is empty, find the tab with empty url (case)
  if (!tabId) {
    return tabs.find((t) => t.url === '');
  }
  return tabs.find((t) => t.id === tabId || t.url.toLowerCase().startsWith(tabId.toLowerCase()));
}

export function PatientPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const medplum = useMedplum();
  const membership = medplum.getProjectMembership();
  const [outcome, setOutcome] = useState<OperationOutcome>();
  const patient = usePatient({ setOutcome });
  const tabs = getPatientPageTabs(membership);
  const [currentTab, setCurrentTab] = useState<string>(() => {
    return (getTabFromLocation(location, tabs) ?? tabs[0]).id;
  });
  const setActiveEpisode = useEpisodeOfCareStore((s) => s.setActiveEpisode);

  // Reset the active episode when navigating to a different patient
  useEffect(() => {
    setActiveEpisode(undefined);
  }, [patient?.id, setActiveEpisode]);

  /**
   * Handles a tab change event.
   * @param newTabName - The new tab name.
   */
  const onTabChange = useCallback(
    (newTabName: string | null): void => {
      if (!patient?.id) {
        console.error('Not within a patient context');
        return;
      }
      const tab = newTabName ? tabs.find((t) => t.id === newTabName) : tabs[0];
      if (tab) {
        setCurrentTab(tab.id);
        navigate(formatPatientPageTabUrl(patient.id, tab))?.catch(console.error);
      }
    },
    [navigate, patient?.id, tabs]
  );

  // Rectify the active tab UI with the current URL. This is necessary because the active tab can be changed
  // in ways other than clicking on a tab in the navigation bar.
  useEffect(() => {
    const newTab = getTabFromLocation(location, tabs);
    if (newTab && newTab.id !== currentTab) {
      setCurrentTab(newTab.id);
    }
  }, [currentTab, location, tabs]);

  if (outcome && !isOk(outcome)) {
    return (
      <Document>
        <OperationOutcomeAlert outcome={outcome} />
      </Document>
    );
  }

  const patientId = patient?.id;
  if (!patientId) {
    return (
      <Document>
        <Loader />
      </Document>
    );
  }

  return (
    <div key={getReferenceString(patient)} className={classes.container}>
      <div className={classes.sidebar}>
        <ScrollArea className={classes.scrollArea}>
          <PatientSidebar
            patient={patient}
            onClickResource={(resource) =>
              navigate(`/Patient/${patientId}/${resource.resourceType}/${resource.id}`)?.catch(console.error)
            }
          />
        </ScrollArea>
      </div>

      <div className={classes.content}>
        <PatientTabsNavigation tabs={tabs} currentTab={currentTab} patientId={patientId} onTabChange={onTabChange} />
        <div className={classes.contentBody}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
