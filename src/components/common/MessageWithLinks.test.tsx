import { describe, expect, test } from 'vitest';
import { render, screen } from '../../testUtils/render';
import { MessageWithLinks } from './MessageWithLinks';

describe('MessageWithLinks', () => {
  test('converts resource references into links', () => {
    render(<MessageWithLinks content="See Patient/123 and Appointment/abc." />);

    expect(screen.getByRole('link', { name: 'Patient/123' })).toHaveAttribute('href', '/Patient/123');
    expect(screen.getByRole('link', { name: 'Appointment/abc' })).toHaveAttribute('href', '/Appointment/abc');
  });

  test('renders plain text when there are no resource references', () => {
    render(<MessageWithLinks content="No links in this sentence" />);

    expect(screen.getByText('No links in this sentence')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
