import { describe, expect, test } from 'vitest';
import { render, screen } from '../../testUtils/render';
import { PlanDefinitionSummary } from './PlanDefinitionSummary';

describe('PlanDefinitionSummary', () => {
  test('returns null when no actions are present', () => {
    render(<PlanDefinitionSummary planDefinition={{ resourceType: 'PlanDefinition', status: 'active' }} />);
    expect(screen.queryByText('Included Tasks')).not.toBeInTheDocument();
  });

  test('renders included tasks when actions exist', () => {
    render(
      <PlanDefinitionSummary
        planDefinition={{
          resourceType: 'PlanDefinition',
          status: 'active',
          action: [
            { id: 'a1', title: 'Task one' },
            { id: 'a2', title: 'Task two' },
          ],
        }}
      />
    );

    expect(screen.getByText('Included Tasks')).toBeInTheDocument();
    expect(screen.getByText('- Task one')).toBeInTheDocument();
    expect(screen.getByText('- Task two')).toBeInTheDocument();
  });
});
