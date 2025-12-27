'use client'

import * as React from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUp01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'
import type { DetectionObject } from '@/types/detection'

interface DetectionTableProps {
  objects: DetectionObject[]
  selectedId: number | null
  onSelectRow: (id: number) => void
}

const CLASS_COLORS: Record<string, string> = {
  person: '#3b82f6',
  vehicle: '#f97316',
  cone: '#eab308',
}

function fmt(v: number | null | undefined, decimals = 2): string {
  if (v === null || v === undefined) return '--'
  return v.toFixed(decimals)
}

function ClassBadge({ value }: { value: string }) {
  const color = CLASS_COLORS[value] || '#888'
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-wider"
      style={{ color }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {value.slice(0, 3)}
    </span>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 80 ? '#4caf50' : pct >= 50 ? '#ffc107' : '#e53935'
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative h-1 w-10 overflow-hidden bg-white/[0.05]">
        <div
          className="absolute inset-y-0 left-0"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="font-mono text-[9px]" style={{ color }}>
        {pct}
      </span>
    </div>
  )
}

const columns: ColumnDef<DetectionObject>[] = [
  {
    accessorKey: 'id',
    header: '#',
    size: 32,
    cell: ({ getValue }) => (
      <span className="font-mono text-[9px] text-[var(--uav-text-tertiary)]">
        {getValue() as number}
      </span>
    ),
  },
  {
    accessorKey: 'cls',
    header: 'CLASS',
    size: 56,
    cell: ({ getValue }) => <ClassBadge value={getValue() as string} />,
  },
  {
    accessorKey: 'score',
    header: 'CONF',
    size: 72,
    cell: ({ getValue }) => <ConfidenceBar value={getValue() as number} />,
  },
  {
    accessorKey: 'center_x',
    header: 'X',
    size: 56,
    cell: ({ getValue }) => (
      <span className="font-mono text-[9px] text-[var(--uav-text-tertiary)]">
        {fmt(getValue() as number, 1)}
      </span>
    ),
  },
  {
    accessorKey: 'center_y',
    header: 'Y',
    size: 56,
    cell: ({ getValue }) => (
      <span className="font-mono text-[9px] text-[var(--uav-text-tertiary)]">
        {fmt(getValue() as number, 1)}
      </span>
    ),
  },
]

function DetectionTable({
  objects,
  selectedId,
  onSelectRow,
}: DetectionTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])

  const table = useReactTable({
    data: objects,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (objects.length === 0) {
    return (
      <div className="py-6 text-center">
        <span className="text-[10px] tracking-wider text-[var(--uav-text-tertiary)]">
          NO DATA AVAILABLE
        </span>
      </div>
    )
  }

  return (
    <table className="w-full border-collapse">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id} className="border-b border-[var(--uav-stroke)]">
            {headerGroup.headers.map((header) => (
              <th
                key={header.id}
                className={cn(
                  'px-2 py-2 text-left text-[8px] font-medium tracking-wider text-[var(--uav-text-tertiary)]',
                  header.column.getCanSort() && 'cursor-pointer hover:text-[var(--uav-text-secondary)]'
                )}
                style={{ width: header.getSize() }}
                onClick={header.column.getToggleSortingHandler()}
              >
                <div className="flex items-center gap-1">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() === 'asc' && (
                    <HugeiconsIcon icon={ArrowUp01Icon} className="size-2.5" strokeWidth={2} />
                  )}
                  {header.column.getIsSorted() === 'desc' && (
                    <HugeiconsIcon icon={ArrowDown01Icon} className="size-2.5" strokeWidth={2} />
                  )}
                </div>
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr
            key={row.id}
            onClick={() => onSelectRow(row.original.id)}
            className={cn(
              'cursor-pointer border-b border-[var(--uav-stroke)]/50 transition-colors',
              'hover:bg-white/[0.02]',
              selectedId === row.original.id && 'bg-[var(--uav-red)]/10'
            )}
          >
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} className="px-2 py-1.5">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export { DetectionTable }
