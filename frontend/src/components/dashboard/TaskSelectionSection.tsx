'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  UserIcon,
  Car01Icon,
  Cone01Icon,
  CloudUploadIcon,
  CheckmarkCircle02Icon,
  Image02Icon,
  GridIcon,
  ArrowDown01Icon,
} from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  useTaskOptionsContext,
  type UploadedFiles,
} from '@/contexts/TaskOptionsContext'
import { useUploadFile } from '@/api/queries'

const DETECTION_TARGETS = [
  { key: 'personEnabled' as const, label: 'PERSON', icon: UserIcon },
  { key: 'vehicleEnabled' as const, label: 'VEHICLE', icon: Car01Icon },
  { key: 'coneEnabled' as const, label: 'CONE', icon: Cone01Icon },
]

const ANALYSIS_OPTIONS = [
  {
    key: 'geoEnabled' as const,
    label: 'Terrain Analysis',
    subtitle: 'DSM',
  },
  {
    key: 'changeEnabled' as const,
    label: 'Land Cover',
    subtitle: 'Classification',
  },
]

const FILE_UPLOAD_ITEMS: Array<{
  key: keyof UploadedFiles
  label: string
  accept: string
  icon: typeof Image02Icon
}> = [
  { key: 'ortho', label: 'Orthophoto', accept: '.tif,.tiff', icon: Image02Icon },
  { key: 'dsm', label: 'DSM', accept: '.tif,.tiff', icon: GridIcon },
  { key: 'laz', label: 'Point Cloud', accept: '.laz,.las', icon: GridIcon },
]

function TaskSelectionSection() {
  const { options, setOption, uploadedFiles, setUploadedFile, requiredFiles } =
    useTaskOptionsContext()
  const uploadMutation = useUploadFile()
  const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({})
  const [uploadOpen, setUploadOpen] = React.useState(false)

  const uploadedCount = FILE_UPLOAD_ITEMS.filter(
    (item) => requiredFiles[item.key] && uploadedFiles[item.key]?.uploaded
  ).length
  const requiredCount = FILE_UPLOAD_ITEMS.filter(
    (item) => requiredFiles[item.key]
  ).length

  const handleFileSelect = React.useCallback(
    async (key: keyof UploadedFiles, file: File) => {
      try {
        setUploadedFile(key, { name: file.name, uploaded: false })
        await uploadMutation.mutateAsync({ file, fileType: key })
        setUploadedFile(key, { name: file.name, uploaded: true })
      } catch {
        setUploadedFile(key, null)
      }
    },
    [uploadMutation, setUploadedFile]
  )

  const handleInputChange = React.useCallback(
    (key: keyof UploadedFiles) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileSelect(key, file)
    },
    [handleFileSelect]
  )

  return (
    <div className="space-y-4">
      {/* Detection Targets */}
      <div>
        <div className="mb-2 text-[8px] tracking-wider text-[var(--uav-text-tertiary)]">
          DETECTION TARGETS
        </div>
        <div className="grid grid-cols-3 gap-2">
          {DETECTION_TARGETS.map((target) => {
            const isActive = options[target.key]
            return (
              <button
                key={target.key}
                type="button"
                onClick={() => setOption(target.key, !isActive)}
                className={cn(
                  'flex flex-col items-center gap-1.5 border py-2.5 transition-all',
                  isActive
                    ? 'border-[var(--uav-red)]/30 bg-[var(--uav-red)]/10'
                    : 'border-[var(--uav-stroke)] bg-transparent hover:border-[var(--uav-stroke-strong)]'
                )}
              >
                <HugeiconsIcon
                  icon={target.icon}
                  strokeWidth={1.5}
                  className={cn(
                    'size-4 transition-colors',
                    isActive ? 'text-[var(--uav-red)]' : 'text-[var(--uav-text-tertiary)]'
                  )}
                />
                <span
                  className={cn(
                    'text-[9px] font-medium tracking-wider transition-colors',
                    isActive ? 'text-[var(--uav-red)]' : 'text-[var(--uav-text-secondary)]'
                  )}
                >
                  {target.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Analysis Options */}
      <div className="space-y-1.5">
        {ANALYSIS_OPTIONS.map((option) => (
          <div
            key={option.key}
            className="flex items-center justify-between gap-3 border border-[var(--uav-stroke)] px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-[var(--uav-text-secondary)]">
                {option.label}
              </span>
              <span className="text-[9px] text-[var(--uav-text-tertiary)]">
                ({option.subtitle})
              </span>
            </div>
            <Switch
              checked={options[option.key]}
              onCheckedChange={(v) => setOption(option.key, v)}
              className="data-checked:bg-[var(--uav-red)]/20 [&_[data-slot=switch-thumb]]:bg-white/70 [&_[data-slot=switch-thumb]]:data-checked:bg-[var(--uav-red)]"
            />
          </div>
        ))}
      </div>

      {/* File Upload - Collapsible */}
      <Collapsible open={uploadOpen} onOpenChange={setUploadOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 border border-[var(--uav-stroke)] px-3 py-2 transition-colors hover:bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={CloudUploadIcon}
              strokeWidth={1.5}
              className="size-3.5 text-[var(--uav-text-tertiary)]"
            />
            <span className="text-[10px] font-medium text-[var(--uav-text-secondary)]">
              File Upload
            </span>
            {requiredCount > 0 && (
              <span
                className={cn(
                  'px-1.5 py-0.5 text-[9px] font-medium',
                  uploadedCount === requiredCount
                    ? 'bg-[var(--uav-success)]/15 text-[var(--uav-success)]'
                    : 'bg-[var(--uav-warning)]/15 text-[var(--uav-warning)]'
                )}
              >
                {uploadedCount}/{requiredCount}
              </span>
            )}
          </div>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            className={cn(
              'size-3 text-[var(--uav-text-tertiary)] transition-transform duration-200',
              !uploadOpen && '-rotate-90'
            )}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-1.5">
          <div className="space-y-1">
            {FILE_UPLOAD_ITEMS.map((item) => {
              const isRequired = requiredFiles[item.key]
              const fileInfo = uploadedFiles[item.key]
              const isUploaded = fileInfo?.uploaded

              if (!isRequired) return null

              return (
                <div
                  key={item.key}
                  className={cn(
                    'flex items-center gap-2 border px-3 py-2 transition-all',
                    isUploaded
                      ? 'border-[var(--uav-success)]/20 bg-[var(--uav-success)]/5'
                      : 'border-[var(--uav-stroke)]'
                  )}
                >
                  <HugeiconsIcon
                    icon={isUploaded ? CheckmarkCircle02Icon : item.icon}
                    strokeWidth={1.5}
                    className={cn(
                      'size-3.5 shrink-0',
                      isUploaded
                        ? 'text-[var(--uav-success)]'
                        : 'text-[var(--uav-text-tertiary)]'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-[var(--uav-text-secondary)]">
                        {item.label}
                      </span>
                      {fileInfo && (
                        <span className="truncate text-[9px] text-[var(--uav-text-tertiary)]">
                          {fileInfo.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    ref={(el) => {
                      fileInputRefs.current[item.key] = el
                    }}
                    type="file"
                    accept={item.accept}
                    onChange={handleInputChange(item.key)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[item.key]?.click()}
                    disabled={uploadMutation.isPending}
                    className={cn(
                      'shrink-0 px-2 py-1 text-[9px] font-medium tracking-wider transition-all',
                      isUploaded
                        ? 'text-[var(--uav-text-tertiary)] hover:text-[var(--uav-text)]'
                        : 'border border-[var(--uav-stroke)] text-[var(--uav-text-secondary)] hover:border-[var(--uav-red)]/30 hover:text-[var(--uav-red)]',
                      uploadMutation.isPending && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    {isUploaded ? 'CHANGE' : 'SELECT'}
                  </button>
                </div>
              )
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export { TaskSelectionSection }
