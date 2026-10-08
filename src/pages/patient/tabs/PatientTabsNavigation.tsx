import { Indicator, Paper, Tabs } from '@mantine/core';
import type { Task } from '@medplum/fhirtypes';
import { useMedplum, useSubscription } from '@medplum/react';
import type { CSSProperties, JSX } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { hasRequestedScheduleAssessmentTask } from '../../../utils/scheduleAssessmentTask';
import type { PatientPageTabInfo } from '../PatientPageUtils';
import classes from './PatientTabsNavigation.module.css';

interface PatientTabsNavigationProps {
  tabs: PatientPageTabInfo[];
  currentTab: string;
  patientId: string;
  onTabChange: (value: string | null) => void;
}

export function PatientTabsNavigation({
  tabs,
  currentTab,
  patientId,
  onTabChange,
}: PatientTabsNavigationProps): JSX.Element {
  const activeTab = currentTab.toLowerCase();
  const medplum = useMedplum();
  const [tasks, setTasks] = useState<Task[]>();

  const refreshTasks = useCallback(() => {
    medplum
      .searchResources('Task', `patient=Patient/${patientId}&status=requested`, { cache: 'no-cache' })
      .then(setTasks)
      .catch(console.error);
  }, [medplum, patientId]);

  useEffect(() => refreshTasks(), [refreshTasks]);

  // Re-fetch requested tasks whenever one is created/updated/deleted for this patient, so the
  // indicator reacts immediately to status changes (e.g. made via the back-end) without a page refresh...
  useSubscription(`Task?patient=Patient/${patientId}`, refreshTasks);

  const showScheduleAssessmentIndicator = hasRequestedScheduleAssessmentTask(tasks);

  return (
    <Paper
      w="100%"
      h={81}
      px={0}
      radius={0}
      style={{
        borderBottom: '1px solid var(--app-shell-border-color)',
        display: 'flex',
        alignItems: 'center',
        background: 'var(--mantine-color-white)',
      }}
    >
      <Tabs value={activeTab} onChange={onTabChange} variant="unstyled" className="pill-tabs">
        <Tabs.List className={classes.list}>
          {tabs.map((t) => (
            <Tabs.Tab
              key={t.id}
              value={t.id}
              aria-label={t.label}
              disabled={(t.id === 'treatment' || t.id === 'encounter') && showScheduleAssessmentIndicator}
            >
              {t.id === 'tasks' && showScheduleAssessmentIndicator ? (
                <Indicator
                  label="1"
                  color="orange"
                  size={16}
                  offset={0}
                  styles={{ indicator: { fontSize: 9, fontWeight: 700 } }}
                  style={{ '--indicator-right': '-10px' } as CSSProperties}
                >
                  {t.label}
                </Indicator>
              ) : (
                t.label
              )}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
    </Paper>
  );
}
