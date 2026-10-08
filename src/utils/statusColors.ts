import { Encounter, Task } from '@medplum/fhirtypes';

export const getCaseStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'accepted, awaiting booking':
      return 'green';
    case 'awaiting initial assessment':
      return 'orange';
    case 'awaiting acceptance':
      return 'red';
    case 'awaiting treatment decision':
      return 'purple';
    case 'in treatment':
      return 'blue';
    case 'awaiting discharge report':
      return 'purple';
    case 'on hold':
      return 'orange';
    case 'discharged':
      return 'yellow';
    default:
      return 'gray';
  }
};

export const getEncounterStatusColor = (status: Encounter['status']): string => {
  switch (status) {
    case 'planned':
      return 'green';
    case 'arrived':
      return 'green';
    case 'triaged':
      return 'yellow';
    case 'in-progress':
      return 'orange';
    case 'onleave':
      return 'orange';
    case 'finished':
      return 'gray';
    case 'cancelled':
      return 'red';
    case 'entered-in-error':
      return 'red';
    default:
      return 'gray';
  }
};

export const getTaskPriorityColor = (priority: Task['priority'] | undefined): string => {
  switch (priority) {
    case 'stat':
      return 'red';
    case 'asap':
      return 'orange';
    case 'urgent':
      return 'yellow';
    case 'routine':
    default:
      return 'blue';
  }
};

export const getTaskStatusColor = (status: Task['status']): string => {
  switch (status) {
    case 'draft':
      return 'gray';
    case 'requested':
      return 'blue';
    case 'completed':
      return 'green';
    case 'cancelled':
      return 'red';
    case 'on-hold':
      return 'orange';
    case 'failed':
      return 'red';
    case 'entered-in-error':
      return 'red';
    default:
      return 'gray';
  }
};

export function getDocRefDocStatusColor(docStatus: string | undefined): string {
  switch (docStatus) {
    case 'final':
      return 'green';
    case 'preliminary':
      return 'yellow';
    case 'amended':
      return 'orange';
    case 'entered-in-error':
      return 'red';
    default:
      return 'gray';
  }
}

export function getDocRefStatusColor(status: string | undefined): string {
  switch (status) {
    case 'current':
      return 'green';
    case 'superseded':
      return 'gray';
    case 'entered-in-error':
      return 'red';
    default:
      return 'gray';
  }
}
