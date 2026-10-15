import { useState } from 'react'

export type SortDir = 'asc' | 'desc'

export interface SortState<K extends string> {
  key: K
  dir: SortDir
}

const collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' })

function compare(a: unknown, b: unknown): number {
  const emptyA = a === null || a === undefined || a === ''
  const emptyB = b === null || b === undefined || b === ''
  if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return collator.compare(String(a), String(b))
}

/** Sorts rows by a column; empty values always go last. */
export function useSort<T, K extends string>(
  rows: T[],
  initial: K,
  value: (row: T, key: K) => unknown
): { sorted: T[]; sort: SortState<K>; toggle: (key: K) => void } {
  const [sort, setSort] = useState<SortState<K>>({ key: initial, dir: 'asc' })
  const factor = sort.dir === 'asc' ? 1 : -1
  const sorted = [...rows].sort((a, b) => {
    const va = value(a, sort.key)
    const vb = value(b, sort.key)
    const emptyA = va === null || va === undefined || va === ''
    const emptyB = vb === null || vb === undefined || vb === ''
    if (emptyA || emptyB) return compare(va, vb)
    return compare(va, vb) * factor
  })
  const toggle = (key: K): void =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  return { sorted, sort, toggle }
}

export function SortTh<K extends string>({
  k,
  sort,
  onSort,
  children
}: {
  k: K
  sort: SortState<K>
  onSort: (k: K) => void
  children: React.ReactNode
}): JSX.Element {
  const active = sort.key === k
  return (
    <th className={active ? 'sortable sorted' : 'sortable'} onClick={() => onSort(k)} title="Сортировать">
      {children}
      <span className="sort-arrow">{active ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}</span>
    </th>
  )
}
