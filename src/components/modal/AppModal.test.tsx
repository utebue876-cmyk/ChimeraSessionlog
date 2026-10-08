import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '../../testUtils/render';
import { AppModal } from './AppModal';

describe('AppModal', () => {
  test('renders opened modal content', () => {
    render(
      <AppModal opened onClose={vi.fn()} title="Modal title">
        Modal body
      </AppModal>
    );

    expect(screen.getByText('Modal title')).toBeInTheDocument();
    expect(screen.getByText('Modal body')).toBeInTheDocument();
  });

  test('calls custom close button handlers', () => {
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();

    render(
      <AppModal opened onClose={vi.fn()} title="Modal title" closeButtonProps={{ onMouseEnter, onMouseLeave }}>
        Modal body
      </AppModal>
    );

    const closeButton = screen.getAllByRole('button')[0];
    fireEvent.mouseEnter(closeButton);
    fireEvent.mouseLeave(closeButton);

    expect(onMouseEnter).toHaveBeenCalled();
    expect(onMouseLeave).toHaveBeenCalled();
  });
});
