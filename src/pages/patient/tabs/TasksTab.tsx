import type { JSX } from 'react';
import { TaskSearchPage } from '../../tasks/TaskSearchPage';

export function TasksTab(): JSX.Element {
  return <TaskSearchPage mode="episode" />;
}
