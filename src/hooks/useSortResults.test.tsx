import { render, renderHook } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { SortIcon } from '../components/common/SortIcon';
import { useSortResults } from './useSortResults';

type Row = { name: string; status: string };
type Col = 'name' | 'status';

describe('useSortResults', () => {
  test('sorts ascending then descending for same column', () => {
    const onSortChange = vi.fn();
    const items: Row[] = [
      { name: 'Charlie', status: 'active' },
      { name: 'Alice', status: 'active' },
      { name: 'Bob', status: 'inactive' },
    ];

    const { result } = renderHook(() => useSortResults<Row, Col>(items, (item, col) => item[col], onSortChange));

    expect(result.current.sorted.map((r) => r.name)).toEqual(['Charlie', 'Alice', 'Bob']);

    act(() => {
      result.current.handleSort('name');
    });
    expect(result.current.sortCol).toBe('name');
    expect(result.current.sortDir).toBe('asc');
    expect(result.current.sorted.map((r) => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);

    act(() => {
      result.current.handleSort('name');
    });
    expect(result.current.sortDir).toBe('desc');
    expect(result.current.sorted.map((r) => r.name)).toEqual(['Charlie', 'Bob', 'Alice']);
    expect(onSortChange).toHaveBeenCalledTimes(2);
  });

  test('switching to a different column resets direction to asc', () => {
    const { result } = renderHook(() =>
      useSortResults<Row, Col>(
        [
          { name: 'B', status: 'z' },
          { name: 'A', status: 'a' },
        ],
        (item, col) => item[col]
      )
    );

    act(() => {
      result.current.handleSort('name');
    });
    act(() => {
      result.current.handleSort('name');
    });
    expect(result.current.sortDir).toBe('desc');

    act(() => {
      result.current.handleSort('status');
    });
    expect(result.current.sortCol).toBe('status');
    expect(result.current.sortDir).toBe('asc');
  });
});

describe('SortIcon', () => {
  test('renders unsorted and sorted icon variants', () => {
    const { rerender, container } = render(<SortIcon col="name" sortCol={null} sortDir="asc" />);
    expect(container.querySelector('svg')).toBeInTheDocument();

    rerender(<SortIcon col="name" sortCol="name" sortDir="asc" />);
    expect(container.querySelector('svg')).toBeInTheDocument();

    rerender(<SortIcon col="name" sortCol="name" sortDir="desc" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
