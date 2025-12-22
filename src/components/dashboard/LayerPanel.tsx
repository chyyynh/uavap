'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon } from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'
import { IconButton } from '@/components/ui/icon-button'
import { Switch } from '@/components/ui/switch'
import type { LayerVisibility } from '@/types/detection'

interface LayerPanelProps {
  visibility: LayerVisibility
  onToggle: (layer: keyof LayerVisibility) => void
}

const LAYER_LABELS: Record<keyof LayerVisibility, string> = {
  base: 'Base map',
  landcover: 'Land cover',
  person: 'Detections: Person',
  vehicle: 'Detections: Vehicle',
  cone: 'Detections: Cone',
}

function LayerPanel({ visibility, onToggle }: LayerPanelProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <div
      className={cn(
        'absolute left-3.5 top-3.5 z-[650] w-[220px] overflow-hidden rounded-2xl border border-white/10 shadow-[var(--uav-shadow)]',
        'bg-[rgba(16,28,51,0.78)] backdrop-blur-[10px]'
      )}
    >
      <div
        className="flex cursor-pointer items-center justify-between border-b border-white/8 px-3 py-2.5"
        onClick={() => setOpen(!open)}
      >
        <span className="text-[13px] text-white/90">Layers</span>
        <IconButton
          variant="default"
          size="sm"
          aria-label="Toggle layers"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(!open)
          }}
        >
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            className={cn(
              'text-white/88 transition-transform',
              !open && '-rotate-90'
            )}
          />
        </IconButton>
      </div>

      {open && (
        <div className="px-3 py-2.5">
          {(Object.keys(visibility) as Array<keyof LayerVisibility>).map(
            (layer) => (
              <div
                key={layer}
                className="flex items-center justify-between gap-2.5 py-1.5 text-[13px] text-white/86"
              >
                <span>{LAYER_LABELS[layer]}</span>
                <Switch
                  checked={visibility[layer]}
                  onCheckedChange={() => onToggle(layer)}
                />
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

export { LayerPanel }
