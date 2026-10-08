import { useMemo, useRef, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface UseSortResultsReturn<TItem, TKey extends string> {
  sorted: TItem[];
  sortCol: TKey | null;
  sortDir: SortDirection;
  handleSort: (col: TKey) => void;
}

/**
 * Generic client-side sort hook.
 *
 * @param items          - The array to sort (original, not mutated).
 * @param getValue       - Pure accessor – given a row and a column key, return the
 *                       string value to compare.  Define this outside your component
 *                       (or wrap in useCallback) so it has a stable reference.
 * @param onSortChange   - Optional callback fired whenever the sort column or
 *                       direction changes (e.g. () => setCurrentPage(1)).
 */
export function useSortResults<TItem, TKey extends string>(
  items: TItem[],
  getValue: (item: TItem, col: TKey) => string,
  onSortChange?: () => void
): UseSortResultsReturn<TItem, TKey> {
  const [sortCol, setSortCol] = useState<TKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  // Stable refs so neither getValue nor onSortChange need to be memoised by callers
  const getValueRef = useRef(getValue);
  getValueRef.current = getValue;
  const onSortChangeRef = useRef(onSortChange);
  onSortChangeRef.current = onSortChange;

  const handleSort = (col: TKey): void => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    onSortChangeRef.current?.();
  };

  const sorted = useMemo(() => {
    if (!sortCol) return items;
    return [...items].sort((a, b) => {
      const av = getValueRef.current(a, sortCol);
      const bv = getValueRef.current(b, sortCol);
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [items, sortCol, sortDir]);

  return { sorted, sortCol, sortDir, handleSort };
}
