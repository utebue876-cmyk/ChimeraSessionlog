import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { SidebarCollapsibleSection } from './SidebarCollapsibleSection';

describe('SidebarCollapsibleSection', () => {
  test('toggles collapsed state from chevron control', async () => {
    const user = userEvent.setup();

    render(
      <MantineProvider>
        <SidebarCollapsibleSection title="Conditions">
          <div>Section Content</div>
        </SidebarCollapsibleSection>
      </MantineProvider>
    );

    expect(screen.getByText('Section Content')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Hide conditions'));
    expect(screen.getByLabelText('Show conditions')).toBeInTheDocument();
  });

  test('calls onAdd when add button is clicked', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();

    render(
      <MantineProvider>
        <SidebarCollapsibleSection title="Conditions" onAdd={onAdd} tooltip="New condition">
          <div>Section Content</div>
        </SidebarCollapsibleSection>
      </MantineProvider>
    );

    await user.click(screen.getByLabelText('New condition'));
    expect(onAdd).toHaveBeenCalled();
  });
});
