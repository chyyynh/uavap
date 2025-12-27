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

function fmt(v: number | null | undefined, decimals = 3): string {
  if (v === null || v === undefined) return '—'
  return v.toFixed(decimals)
}

const columns: ColumnDef<DetectionObject>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    size: 50,
  },
  {
    accessorKey: 'cls',
    header: 'Class',
    size: 80,
  },
  {
    accessorKey: 'score',
    header: 'Score',
    size: 70,
    cell: ({ getValue }) => fmt(getValue() as number, 3),
  },
  {
    accessorKey: 'center_x',
    header: 'Center X',
    size: 100,
    cell: ({ getValue }) => fmt(getValue() as number, 5),
  },
  {
    accessorKey: 'center_y',
    header: 'Center Y',
    size: 100,
    cell: ({ getValue }) => fmt(getValue() as number, 4),
  },
  {
    accessorKey: 'area_m2',
    header: 'Area (m²)',
    size: 90,
    cell: ({ getValue }) => fmt(getValue() as number, 2),
  },
  {
    accessorKey: 'elev_z',
    header: 'Elev Z',
    size: 80,
    cell: ({ getValue }) => fmt(getValue() as number, 2),
  },
  {
    accessorKey: 'height_m',
    header: 'Height',
    size: 80,
    cell: ({ getValue }) => fmt(getValue() as number, 2),
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

  return (
    <div className="overflow-auto rounded-[var(--uav-radius-sm)] border border-[var(--uav-stroke)] bg-[var(--uav-panel-elevated)]">
      <table className="w-full border-collapse text-xs">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-[var(--uav-stroke)]">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={cn(
                    'whitespace-nowrap px-2.5 py-2 text-left font-medium text-[var(--uav-text-tertiary)]',
                    header.column.getCanSort() && 'cursor-pointer select-none hover:text-[var(--uav-text-secondary)]'
                  )}
                  style={{ width: header.getSize() }}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc' && (
                      <HugeiconsIcon icon={ArrowUp01Icon} className="size-3" strokeWidth={2} />
                    )}
                    {header.column.getIsSorted() === 'desc' && (
                      <HugeiconsIcon icon={ArrowDown01Icon} className="size-3" strokeWidth={2} />
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
                'cursor-pointer border-b border-[var(--uav-stroke)] transition-colors last:border-b-0',
                'hover:bg-white/4',
                selectedId === row.original.id && 'bg-[var(--uav-teal)]/10'
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="whitespace-nowrap px-2.5 py-2 text-[var(--uav-text)]"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {objects.length === 0 && (
        <div className="py-8 text-center text-sm text-[var(--uav-text-tertiary)]">
          No detection results
        </div>
      )}
    </div>
  )
}

export { DetectionTable }
