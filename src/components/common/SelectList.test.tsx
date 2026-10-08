import { describe, expect, test, vi } from 'vitest';
import { render, screen, userEvent } from '../../testUtils/render';
import { SelectList } from './SelectList';

describe('SelectList', () => {
  test('clears the selection when clear icon is pressed', async () => {
    const onChange = vi.fn();

    render(
      <SelectList
        label="Language"
        data={[{ value: 'en', label: 'English' }]}
        value="en"
        onChange={onChange}
        clearAriaLabel="Clear language"
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Clear language' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  test('does not render clear icon when there is no value', () => {
    render(<SelectList label="Language" data={[{ value: 'en', label: 'English' }]} value={null} onChange={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Clear selection' })).not.toBeInTheDocument();
  });
});
