import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import SidebarItem from './SidebarItem';

describe('SidebarItem', () => {
  test('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <MantineProvider>
        <SidebarItem onClick={onClick}>
          <span>Item body</span>
        </SidebarItem>
      </MantineProvider>
    );

    await user.click(screen.getByText('Item body'));
    expect(onClick).toHaveBeenCalled();
  });

  test('renders without chevron when showChevron is false', () => {
    render(
      <MantineProvider>
        <SidebarItem onClick={vi.fn()} showChevron={false}>
          <span>No Chevron</span>
        </SidebarItem>
      </MantineProvider>
    );

    expect(screen.getByText('No Chevron')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
