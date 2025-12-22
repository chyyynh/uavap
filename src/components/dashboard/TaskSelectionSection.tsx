'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  InformationCircleIcon,
  UserIcon,
  Car01Icon,
  Cone01Icon,
} from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { IconButton } from '@/components/ui/icon-button'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { useTaskOptionsContext } from '@/contexts/TaskOptionsContext'

const DETECTION_TARGETS = [
  { key: 'personEnabled' as const, label: '人', icon: UserIcon },
  { key: 'vehicleEnabled' as const, label: '車輛', icon: Car01Icon },
  { key: 'coneEnabled' as const, label: '交通錐', icon: Cone01Icon },
]

const ANALYSIS_OPTIONS = [
  {
    key: 'geoEnabled' as const,
    label: '高程與高度',
    helpText: '在屬性表新增 elev_z（中心點高程）、height_m（相對地面高度）',
    subtitle: '點雲 / DSM',
  },
  {
    key: 'changeEnabled' as const,
    label: '地表變化偵測',
    subtitle: '多期比對',
  },
]

function TaskSelectionSection() {
  const [open, setOpen] = React.useState(true)
  const { options, setOption } = useTaskOptionsContext()

  return (
    <div className="border-t border-[var(--uav-stroke)] pt-3">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-[var(--uav-radius-sm)] border border-[var(--uav-stroke)] bg-[var(--uav-panel-elevated)] px-3 py-2">
          <span className="text-sm font-medium text-[var(--uav-text)]">Task Selection</span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            className={cn(
              'size-4 text-[var(--uav-text-secondary)] transition-transform duration-200',
              !open && '-rotate-90'
            )}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-3">
          <div className="rounded-[var(--uav-radius-sm)] border border-[var(--uav-stroke)] bg-[var(--uav-panel-elevated)] p-3">
            {/* Detection Targets - Chips */}
            <div className="mb-4">
              <span className="mb-2 block text-xs text-[var(--uav-text-tertiary)]">
                偵測目標
              </span>
              <div className="flex flex-wrap gap-2">
                {DETECTION_TARGETS.map((target) => (
                  <button
                    key={target.key}
                    type="button"
                    onClick={() => setOption(target.key, !options[target.key])}
                    className={cn(
                      'flex items-center gap-2 rounded-[var(--uav-radius-sm)] border px-3 py-2 text-sm transition-all',
                      options[target.key]
                        ? 'border-[var(--uav-teal)]/40 bg-[var(--uav-teal)]/10 text-[var(--uav-teal)]'
                        : 'border-[var(--uav-stroke)] bg-transparent text-[var(--uav-text-secondary)] hover:border-[var(--uav-text-tertiary)]'
                    )}
                  >
                    <HugeiconsIcon
                      icon={target.icon}
                      strokeWidth={1.5}
                      className="size-4"
                    />
                    {target.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Analysis Options - Switches */}
            <div className="space-y-1 border-t border-[var(--uav-stroke)] pt-3">
              {ANALYSIS_OPTIONS.map((option) => (
                <div
                  key={option.key}
                  className="group flex items-center justify-between gap-3 rounded-[var(--uav-radius-xs)] px-1 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--uav-text)]">
                      {option.label}
                      {option.subtitle && (
                        <span className="ml-1.5 text-xs text-[var(--uav-text-tertiary)]">
                          {option.subtitle}
                        </span>
                      )}
                    </span>
                    {option.helpText && (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <IconButton
                              variant="help"
                              size="sm"
                              aria-label="Help"
                              className="opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <HugeiconsIcon
                                icon={InformationCircleIcon}
                                strokeWidth={2}
                                className="size-3"
                              />
                            </IconButton>
                          }
                        />
                        <TooltipContent>{option.helpText}</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <Switch
                    checked={options[option.key]}
                    onCheckedChange={(v) => setOption(option.key, v)}
                  />
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export { TaskSelectionSection }
