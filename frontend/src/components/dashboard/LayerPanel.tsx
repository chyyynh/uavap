'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon } from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import type { LayerVisibility } from '@/types/detection'

interface LayerPanelProps {
  visibility: LayerVisibility
  onToggle: (layer: keyof LayerVisibility) => void
}

const LAYER_CONFIG: Array<{ key: keyof LayerVisibility; label: string; group?: string }> = [
  { key: 'base', label: 'Base Map', group: 'base' },
  { key: 'ortho', label: 'Orthophoto', group: 'base' },
  { key: 'landcover', label: 'Land Cover', group: 'analysis' },
  { key: 'slope', label: 'Slope', group: 'terrain' },
  { key: 'aspect', label: 'Aspect', group: 'terrain' },
  { key: 'person', label: 'Person', group: 'detections' },
  { key: 'vehicle', label: 'Vehicle', group: 'detections' },
  { key: 'cone', label: 'Cone', group: 'detections' },
]

function LayerPanel({ visibility, onToggle }: LayerPanelProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <div
      className={cn(
        'absolute left-3 top-3 z-[650] w-48',
        'rounded-[var(--uav-radius-sm)] border border-[var(--uav-stroke)] bg-[var(--uav-panel)]',
        'shadow-[var(--uav-shadow-md)]'
      )}
    >
      <button
        className="flex w-full items-center justify-between px-3 py-2"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-medium text-[var(--uav-text)]">Layers</span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          strokeWidth={2}
          className={cn(
            'size-4 text-[var(--uav-text-secondary)] transition-transform',
            !open && '-rotate-90'
          )}
        />
      </button>

      {open && (
        <div className="border-t border-[var(--uav-stroke)] px-3 py-2">
          {LAYER_CONFIG.map((layer, index) => {
            const prevGroup = LAYER_CONFIG[index - 1]?.group
            const showDivider = prevGroup && layer.group !== prevGroup

            return (
              <React.Fragment key={layer.key}>
                {showDivider && (
                  <div className="my-2 border-t border-[var(--uav-stroke)]" />
                )}
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-[var(--uav-text-secondary)]">
                    {layer.label}
                  </span>
                  <Switch
                    checked={visibility[layer.key]}
                    onCheckedChange={() => onToggle(layer.key)}
                  />
                </div>
              </React.Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}

export { LayerPanel }
