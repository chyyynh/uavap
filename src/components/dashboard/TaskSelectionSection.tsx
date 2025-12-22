'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon, InformationCircleIcon } from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
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

interface TaskOption {
  id: string
  label: string
  helpText?: string
  indent?: boolean
}

interface TaskSelectionSectionProps {
  objectsEnabled: boolean
  onObjectsChange: (checked: boolean) => void
  personEnabled: boolean
  onPersonChange: (checked: boolean) => void
  vehicleEnabled: boolean
  onVehicleChange: (checked: boolean) => void
  coneEnabled: boolean
  onConeChange: (checked: boolean) => void
  geoEnabled: boolean
  onGeoChange: (checked: boolean) => void
  changeEnabled: boolean
  onChangeChange: (checked: boolean) => void
  statsEnabled: boolean
  onStatsChange: (checked: boolean) => void
  pdfEnabled: boolean
  onPdfChange: (checked: boolean) => void
  gpkgEnabled: boolean
  onGpkgChange: (checked: boolean) => void
}

function TaskSelectionSection({
  objectsEnabled,
  onObjectsChange,
  personEnabled,
  onPersonChange,
  vehicleEnabled,
  onVehicleChange,
  coneEnabled,
  onConeChange,
  geoEnabled,
  onGeoChange,
  changeEnabled,
  onChangeChange,
  statsEnabled,
  onStatsChange,
  pdfEnabled,
  onPdfChange,
  gpkgEnabled,
  onGpkgChange,
}: TaskSelectionSectionProps) {
  const [open, setOpen] = React.useState(true)

  return (
    <div className="mt-2.5 border-t border-white/6 pt-3">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full cursor-pointer select-none items-center justify-between gap-2.5 rounded-[var(--uav-radius-sm)] border border-white/6 bg-black/12 px-2.5 py-2">
          <div className="flex items-center gap-2.5">
            <span className="text-base text-white/88">Task Selection</span>
            <Tooltip>
              <TooltipTrigger
                render={
                  <IconButton
                    variant="help"
                    size="sm"
                    aria-label="Help"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <HugeiconsIcon
                      icon={InformationCircleIcon}
                      strokeWidth={2}
                      className="text-white/88"
                    />
                  </IconButton>
                }
              />
              <TooltipContent>
                勾選想要的分析項目與輸出內容。進階說明可在地圖圖層或報表查看。
              </TooltipContent>
            </Tooltip>
          </div>
          <IconButton variant="default" size="sm" aria-label="Toggle">
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              strokeWidth={2}
              className={cn(
                'text-white/88 transition-transform',
                !open && '-rotate-90'
              )}
            />
          </IconButton>
        </CollapsibleTrigger>

        <CollapsibleContent className="px-2 pt-2.5">
          <TaskRow
            label="場域中的物件"
            helpText="啟用物件偵測與屬性表輸出（bbox/center/score/class…）。"
            checked={objectsEnabled}
            onCheckedChange={onObjectsChange}
          />
          <TaskRow
            label="人"
            checked={personEnabled}
            onCheckedChange={onPersonChange}
            disabled={!objectsEnabled}
            indent
          />
          <TaskRow
            label="車輛"
            checked={vehicleEnabled}
            onCheckedChange={onVehicleChange}
            disabled={!objectsEnabled}
            indent
          />
          <TaskRow
            label="交通角錐"
            checked={coneEnabled}
            onCheckedChange={onConeChange}
            disabled={!objectsEnabled}
            indent
          />

          <TaskRow
            label="加算高程與高度（點雲/DSM）"
            helpText="在屬性表新增：elev_z（中心點高程）、height_m（相對地面高度）。"
            checked={geoEnabled}
            onCheckedChange={onGeoChange}
            className="mt-1.5"
          />
          <TaskRow
            label="地表/地形變化（多期）"
            checked={changeEnabled}
            onCheckedChange={onChangeChange}
          />

          <TaskRow
            label="統計摘要"
            checked={statsEnabled}
            onCheckedChange={onStatsChange}
            className="mt-1.5"
          />
          <TaskRow
            label="報表（PDF）"
            checked={pdfEnabled}
            onCheckedChange={onPdfChange}
          />
          <TaskRow
            label="GIS 圖層（GeoPackage）"
            checked={gpkgEnabled}
            onCheckedChange={onGpkgChange}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

interface TaskRowProps {
  label: string
  helpText?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  indent?: boolean
  className?: string
}

function TaskRow({
  label,
  helpText,
  checked,
  onCheckedChange,
  disabled,
  indent,
  className,
}: TaskRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2.5 py-2',
        indent && 'pl-7',
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <Checkbox
          variant="teal"
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          className="mt-0.5"
        />
        <div className="flex items-center gap-2.5">
          <span className="text-base">{label}</span>
          {helpText && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <IconButton variant="help" size="sm" aria-label="Help">
                    <HugeiconsIcon
                      icon={InformationCircleIcon}
                      strokeWidth={2}
                      className="text-white/88"
                    />
                  </IconButton>
                }
              />
              <TooltipContent>{helpText}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  )
}

export { TaskSelectionSection }
