'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  InformationCircleIcon,
  UserIcon,
  Car01Icon,
  Cone01Icon,
  CloudUploadIcon,
  CheckmarkCircle02Icon,
  Image02Icon,
  GridIcon,
} from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { IconButton } from '@/components/ui/icon-button'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import {
  useTaskOptionsContext,
  type UploadedFiles,
} from '@/contexts/TaskOptionsContext'
import { useUploadFile, useUploadLocalPaths } from '@/api/queries'
import { Input } from '@/components/ui/input'

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
    helpText:
      '使用 UPerNet 模型進行土地覆蓋分類，包含：裸地、樹木、道路、鋪面、草地、建物',
    subtitle: '土地覆蓋',
  },
]

const FILE_UPLOAD_ITEMS: Array<{
  key: keyof UploadedFiles
  label: string
  accept: string
  icon: typeof Image02Icon
  helpText: string
}> = [
  {
    key: 'ortho',
    label: '正射影像',
    accept: '.tif,.tiff',
    icon: Image02Icon,
    helpText: 'odm_orthophoto.tif',
  },
  {
    key: 'dsm',
    label: 'DSM',
    accept: '.tif,.tiff',
    icon: GridIcon,
    helpText: 'dsm.tif - 數值高程模型',
  },
  {
    key: 'laz',
    label: '點雲',
    accept: '.laz,.las',
    icon: GridIcon,
    helpText: 'odm_georeferenced_model.laz',
  },
]

function TaskSelectionSection() {
  const { options, setOption, fileMode, setFileMode, bumpCacheBust, uploadedFiles, setUploadedFile, requiredFiles } =
    useTaskOptionsContext()
  const uploadMutation = useUploadFile()
  const uploadLocalMutation = useUploadLocalPaths()
  const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>(
    {},
  )
  const [localProjectDir, setLocalProjectDir] = React.useState('C:\\Users\\chonrou hsu\\Pictures\\20250410_hole\\20260105\\uavap\\UAVAP_DATA\\project_001')
  const [localNames, setLocalNames] = React.useState({
    ortho: 'odm_orthophoto.tif',
    dsm: 'dsm.tif',
    laz: 'odm_georeferenced_model.laz',
  })

  const switchMode = React.useCallback(
    (mode: 'upload' | 'local') => {
      setFileMode(mode)
      if (mode === 'local') {
        setLocalNames({
          ortho: 'odm_orthophoto.tif',
          dsm: 'dsm.tif',
          laz: 'odm_georeferenced_model.laz',
        })
        setUploadedFile('ortho', null)
        setUploadedFile('dsm', null)
        setUploadedFile('laz', null)
      }
    },
    [setFileMode, setUploadedFile],
  )

  const handleFileSelect = React.useCallback(
    async (key: keyof UploadedFiles, file: File) => {
      if (fileMode === 'local') {
        setUploadedFile(key, { name: file.name, uploaded: true })
        return
      }
      try {
        setUploadedFile(key, { name: file.name, uploaded: false })
        await uploadMutation.mutateAsync({ file, fileType: key })
        setUploadedFile(key, { name: file.name, uploaded: true })
      } catch {
        setUploadedFile(key, null)
      }
    },
    [fileMode, uploadMutation, setUploadedFile],
  )

  const handleLocalProjectChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalProjectDir(e.target.value)
  }, [])

  const handleLocalNameChange = React.useCallback(
    (key: keyof UploadedFiles) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setLocalNames((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const localRequirementsMet = React.useMemo(() => {
    if (!localProjectDir.trim()) return false
    if (requiredFiles.ortho && !localNames.ortho.trim()) return false
    if (requiredFiles.dsm && !localNames.dsm.trim()) return false
    if (requiredFiles.laz && !localNames.laz.trim()) return false
    return true
  }, [localNames, localProjectDir, requiredFiles])

  const handleApplyLocal = React.useCallback(async () => {
    if (!localRequirementsMet) return
    const payload = {
      project_dir: localProjectDir.trim(),
      ortho_name: requiredFiles.ortho ? (localNames.ortho.trim() || undefined) : undefined,
      dsm_name: requiredFiles.dsm ? (localNames.dsm.trim() || undefined) : undefined,
      laz_name: requiredFiles.laz ? (localNames.laz.trim() || undefined) : undefined,
    }
    await uploadLocalMutation.mutateAsync(payload)
    if (payload.ortho_name) setUploadedFile('ortho', { name: `${payload.project_dir}\\${payload.ortho_name}`, uploaded: true })
    if (payload.dsm_name) setUploadedFile('dsm', { name: `${payload.project_dir}\\${payload.dsm_name}`, uploaded: true })
    if (payload.laz_name) setUploadedFile('laz', { name: `${payload.project_dir}\\${payload.laz_name}`, uploaded: true })
    bumpCacheBust()
  }, [bumpCacheBust, localNames, localProjectDir, localRequirementsMet, requiredFiles, setUploadedFile, uploadLocalMutation])

  const handleInputChange = React.useCallback(
    (key: keyof UploadedFiles) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFileSelect(key, file)
      }
    },
    [handleFileSelect],
  )

  return (
    <div className="border-t border-(--uav-stroke) pt-3">
      <div className="rounded-(--uav-radius-sm) border border-(--uav-stroke) bg-(--uav-panel-elevated) p-3">
        {/* Detection Targets - Chips */}
        <div className="mb-4">
          <span className="mb-2 block text-xs text-(--uav-text-tertiary)">
            偵測目標
          </span>
          <div className="flex flex-wrap gap-2">
            {DETECTION_TARGETS.map((target) => (
              <button
                key={target.key}
                type="button"
                onClick={() => setOption(target.key, !options[target.key])}
                className={cn(
                  'flex items-center gap-2 rounded-(--uav-radius-sm) border px-3 py-2 text-sm transition-all',
                  options[target.key]
                    ? 'border-(--uav-teal)/40 bg-(--uav-teal)/10 text-(--uav-teal)'
                    : 'border-(--uav-stroke) bg-transparent text-(--uav-text-secondary) hover:border-(--uav-text-tertiary)',
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
        <div className="space-y-1 border-t border-(--uav-stroke) pt-3">
          {ANALYSIS_OPTIONS.map((option) => (
            <div
              key={option.key}
              className="group flex items-center justify-between gap-3 rounded-(--uav-radius-xs) px-1 py-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-(--uav-text)">
                  {option.label}
                  {option.subtitle && (
                    <span className="ml-1.5 text-xs text-(--uav-text-tertiary)">
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

        {/* File Upload Section */}
        <div className="mt-4 border-t border-(--uav-stroke) pt-3">
          {fileMode === 'local' && (
            <div className="mb-3">
              <span className="mb-2 block text-xs text-(--uav-text-tertiary)">
                Local project dir
              </span>
              <Input
                value={localProjectDir}
                onChange={handleLocalProjectChange}
                placeholder="C:\\path\\to\\project"
                className="h-7 text-xs"
              />
            </div>
          )}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-(--uav-text-tertiary)">
              File source
            </span>
            <div className="flex overflow-hidden rounded-(--uav-radius-xs) border border-(--uav-stroke)">
              <button
                type="button"
                onClick={() => switchMode('upload')}
                className={cn(
                  'px-2 py-1 text-[10px] font-medium uppercase tracking-wider transition-all',
                  fileMode === 'upload'
                    ? 'bg-(--uav-teal)/20 text-(--uav-teal)'
                    : 'bg-transparent text-(--uav-text-tertiary) hover:text-(--uav-text-secondary)',
                )}
              >
                Upload
              </button>
              <button
                type="button"
                onClick={() => switchMode('local')}
                className={cn(
                  'px-2 py-1 text-[10px] font-medium uppercase tracking-wider transition-all',
                  fileMode === 'local'
                    ? 'bg-(--uav-teal)/20 text-(--uav-teal)'
                    : 'bg-transparent text-(--uav-text-tertiary) hover:text-(--uav-text-secondary)',
                )}
              >
                Local
              </button>
            </div>
          </div>
          <span className="mb-2 block text-xs text-(--uav-text-tertiary) hidden">
            檔案上傳
          </span>
          <div className="space-y-2">
            {FILE_UPLOAD_ITEMS.map((item) => {
              const isRequired = requiredFiles[item.key]
              const fileInfo = uploadedFiles[item.key]
              const isUploaded = fileInfo?.uploaded

              if (!isRequired) return null

              return (
                <div
                  key={item.key}
                  className={cn(
                    'flex items-center gap-3 rounded-(--uav-radius-sm) border px-3 py-2 transition-all',
                    isUploaded
                      ? 'border-(--uav-teal)/40 bg-(--uav-teal)/5'
                      : 'border-(--uav-stroke) bg-transparent',
                  )}
                >
                  <HugeiconsIcon
                    icon={isUploaded ? CheckmarkCircle02Icon : item.icon}
                    strokeWidth={1.5}
                    className={cn(
                      'size-5',
                      isUploaded
                        ? 'text-(--uav-teal)'
                        : 'text-(--uav-text-tertiary)',
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-(--uav-text)">
                        {item.label}
                      </span>
                      {fileInfo && fileMode === 'upload' && (
                        <span className="truncate text-xs text-(--uav-text-tertiary)">
                          {fileInfo.name}
                        </span>
                      )}
                    </div>
                    {!isUploaded && fileMode === 'upload' && (
                      <span className="text-xs text-(--uav-text-tertiary)">
                        {item.helpText}
                      </span>
                    )}
                  </div>
                  {fileMode === 'local' ? (
                    <Input
                      value={localNames[item.key] ?? ''}
                      onChange={handleLocalNameChange(item.key)}
                      placeholder="Filename"
                      className="h-7 text-xs"
                    />
                  ) : (
                    <>
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
                      'flex items-center gap-1.5 rounded-(--uav-radius-xs) px-2 py-1 text-xs transition-all',
                      isUploaded
                        ? 'bg-transparent text-(--uav-text-secondary) hover:text-(--uav-text)'
                        : 'bg-(--uav-teal)/10 text-(--uav-teal) hover:bg-(--uav-teal)/20',
                      uploadMutation.isPending &&
                        'opacity-50 cursor-not-allowed',
                    )}
                  >
                    <HugeiconsIcon
                      icon={CloudUploadIcon}
                      strokeWidth={2}
                      className="size-3.5"
                    />
                    {isUploaded ? '更換' : '上傳'}
                  </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
          {fileMode === 'local' && (
            <div className="mt-3 flex items-center justify-end">
              <button
                type="button"
                onClick={handleApplyLocal}
                disabled={!localRequirementsMet || uploadLocalMutation.isPending}
                className={cn(
                  'rounded-(--uav-radius-xs) border px-3 py-1 text-xs font-medium transition-all',
                  localRequirementsMet
                    ? 'border-(--uav-teal)/40 text-(--uav-teal) hover:bg-(--uav-teal)/10'
                    : 'border-(--uav-stroke) text-(--uav-text-tertiary)',
                  uploadLocalMutation.isPending && 'opacity-50 cursor-not-allowed',
                )}
              >
                {uploadLocalMutation.isPending ? 'Applying...' : 'Apply local paths'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { TaskSelectionSection }
