import { describe, expect, test } from 'vitest';
import { render } from '../../testUtils/render';
import { SortIcon } from './SortIcon';

describe('SortIcon', () => {
  test('renders the neutral icon when the column is not the active sort column', () => {
    const { container } = render(<SortIcon col="name" sortCol={null} sortDir="asc" />);

    expect(container.querySelector('.tabler-icon-arrows-sort')).toBeInTheDocument();
  });

  test('renders the ascending icon when the column is sorted ascending', () => {
    const { container } = render(<SortIcon col="name" sortCol="name" sortDir="asc" />);

    expect(container.querySelector('.tabler-icon-sort-ascending')).toBeInTheDocument();
  });

  test('renders the descending icon when the column is sorted descending', () => {
    const { container } = render(<SortIcon col="name" sortCol="name" sortDir="desc" />);

    expect(container.querySelector('.tabler-icon-sort-descending')).toBeInTheDocument();
  });
});
