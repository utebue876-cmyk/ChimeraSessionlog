import { IconArrowsSort, IconSortAscending, IconSortDescending } from '@tabler/icons-react';
import type { JSX } from 'react';
import type { SortDirection } from '../../hooks/useSortResults';

export function SortIcon<TKey extends string>({
  col,
  sortCol,
  sortDir,
}: {
  col: TKey;
  sortCol: TKey | null;
  sortDir: SortDirection;
}): JSX.Element {
  if (sortCol !== col) return <IconArrowsSort size={14} style={{ opacity: 0.4 }} />;
  return sortDir === 'asc' ? <IconSortAscending size={14} /> : <IconSortDescending size={14} />;
}
