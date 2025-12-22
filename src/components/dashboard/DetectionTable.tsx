'use client'

import * as React from 'react'

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

function DetectionTable({
  objects,
  selectedId,
  onSelectRow,
}: DetectionTableProps) {
  return (
    <div className="overflow-auto rounded-[var(--uav-radius-sm)] border border-white/8 bg-black/18">
      <table className="w-full min-w-[780px] border-collapse text-[12.5px]">
        <thead>
          <tr className="sticky top-0 z-10 border-b border-white/6 bg-white/4">
            <th className="w-[46px] whitespace-nowrap px-2.5 py-2 text-left font-normal text-[var(--uav-muted)]">
              id
            </th>
            <th className="whitespace-nowrap px-2.5 py-2 text-left font-normal text-[var(--uav-muted)]">
              class
            </th>
            <th className="w-[70px] whitespace-nowrap px-2.5 py-2 text-left font-normal text-[var(--uav-muted)]">
              score
            </th>
            <th className="w-[120px] whitespace-nowrap px-2.5 py-2 text-left font-normal text-[var(--uav-muted)]">
              center_x
            </th>
            <th className="w-[120px] whitespace-nowrap px-2.5 py-2 text-left font-normal text-[var(--uav-muted)]">
              center_y
            </th>
            <th className="w-[90px] whitespace-nowrap px-2.5 py-2 text-left font-normal text-[var(--uav-muted)]">
              area_m2
            </th>
            <th className="w-[110px] whitespace-nowrap px-2.5 py-2 text-left font-normal text-[var(--uav-muted)]">
              aspect_rat
            </th>
            <th className="w-[90px] whitespace-nowrap px-2.5 py-2 text-left font-normal text-[var(--uav-muted)]">
              elev_z
            </th>
            <th className="w-[90px] whitespace-nowrap px-2.5 py-2 text-left font-normal text-[var(--uav-muted)]">
              height_m
            </th>
          </tr>
        </thead>
        <tbody>
          {objects.map((obj) => (
            <tr
              key={obj.id}
              onClick={() => onSelectRow(obj.id)}
              className={cn(
                'cursor-pointer border-b border-white/6 transition-colors last:border-b-0',
                'hover:bg-white/3',
                selectedId === obj.id && 'bg-[var(--uav-teal)]/8'
              )}
            >
              <td className="whitespace-nowrap px-2.5 py-2">{obj.id}</td>
              <td className="whitespace-nowrap px-2.5 py-2">{obj.cls}</td>
              <td className="whitespace-nowrap px-2.5 py-2">
                {fmt(obj.score, 3)}
              </td>
              <td className="whitespace-nowrap px-2.5 py-2">
                {fmt(obj.center_x, 5)}
              </td>
              <td className="whitespace-nowrap px-2.5 py-2">
                {fmt(obj.center_y, 4)}
              </td>
              <td className="whitespace-nowrap px-2.5 py-2">
                {fmt(obj.area_m2, 6)}
              </td>
              <td className="whitespace-nowrap px-2.5 py-2">
                {fmt(obj.aspect_rat, 7)}
              </td>
              <td className="whitespace-nowrap px-2.5 py-2">
                {fmt(obj.elev_z, 2)}
              </td>
              <td className="whitespace-nowrap px-2.5 py-2">
                {fmt(obj.height_m, 2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { DetectionTable }
