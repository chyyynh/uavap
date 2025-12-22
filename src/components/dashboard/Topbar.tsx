'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  AirplaneModeIcon,
  Upload04Icon,
  Link04Icon,
} from '@hugeicons/core-free-icons'
import { useQueryClient } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  useProjects,
  useGpuStatus,
  useUploadFile,
  setApiBaseUrl,
  getStoredApiUrl,
} from '@/api/queries'

interface TopbarProps {
  className?: string
  onProjectChange?: (projectId: string) => void
  selectedProjectId?: string
}

function Topbar({ className, onProjectChange, selectedProjectId }: TopbarProps) {
  const queryClient = useQueryClient()
  const { data: projects = [] } = useProjects()
  const { data: gpuStatus } = useGpuStatus()
  const uploadMutation = useUploadFile()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [apiUrl, setApiUrl] = React.useState('')
  const [isConnected, setIsConnected] = React.useState(false)

  React.useEffect(() => {
    const stored = getStoredApiUrl()
    setApiUrl(stored)
    setIsConnected(!!stored)
  }, [])

  const handleApiUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiUrl(e.target.value)
  }

  const handleApiConnect = () => {
    setApiBaseUrl(apiUrl)
    setIsConnected(!!apiUrl)
    queryClient.invalidateQueries()
  }

  const handleApiDisconnect = () => {
    setApiUrl('')
    setApiBaseUrl(null)
    setIsConnected(false)
    queryClient.invalidateQueries()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadMutation.mutate(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-50 flex h-14 items-center justify-between',
        'border-b border-[var(--uav-stroke)] bg-[var(--uav-panel)] px-4',
        className
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-[var(--uav-radius-xs)] bg-white/8">
          <HugeiconsIcon
            icon={AirplaneModeIcon}
            className="size-5 text-[var(--uav-teal)]"
            strokeWidth={1.8}
          />
        </div>
        <div>
          <div className="text-base font-semibold">UAV Dashboard</div>
          <div className="text-xs text-[var(--uav-text-secondary)]">
            Automated Inspection Platform
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* API Connection */}
        <div className="flex items-center gap-1.5 rounded-[var(--uav-radius-sm)] border border-[var(--uav-stroke)] bg-[var(--uav-panel-elevated)] px-2.5 py-1.5">
          <HugeiconsIcon
            icon={Link04Icon}
            className={cn(
              'size-3.5',
              isConnected ? 'text-[var(--uav-success)]' : 'text-[var(--uav-text-tertiary)]'
            )}
            strokeWidth={2}
          />
          <input
            type="text"
            value={apiUrl}
            onChange={handleApiUrlChange}
            placeholder="https://xxx.trycloudflare.com"
            className="w-56 bg-transparent text-xs text-[var(--uav-text)] placeholder:text-[var(--uav-text-tertiary)] focus:outline-none"
          />
          {isConnected ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={handleApiDisconnect}
              className="text-[var(--uav-error)] hover:bg-[var(--uav-error)]/10"
            >
              Disconnect
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="xs"
              onClick={handleApiConnect}
              disabled={!apiUrl}
              className="text-[var(--uav-success)] hover:bg-[var(--uav-success)]/10 disabled:opacity-40"
            >
              Connect
            </Button>
          )}
        </div>

        {/* Upload - 支援 TIFF, DSM, LAZ */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".tif,.tiff,.jpg,.jpeg,.png,.dsm,.laz,.las"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={uploadMutation.isPending || !isConnected}
          onClick={handleUploadClick}
          className="gap-1.5 border-[var(--uav-stroke)] bg-white/4 text-[var(--uav-text)] hover:bg-white/8"
        >
          <HugeiconsIcon icon={Upload04Icon} className="size-3.5" strokeWidth={2} />
          {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
        </Button>

        {/* Project Selector */}
        <div className="flex items-center gap-2 rounded-[var(--uav-radius-sm)] border border-[var(--uav-stroke)] bg-[var(--uav-panel-elevated)] px-2.5 py-1">
          <span className="text-xs text-[var(--uav-text-secondary)]">Project</span>
          <Select value={selectedProjectId} onValueChange={(val) => val && onProjectChange?.(val)}>
            <SelectTrigger className="h-6 min-w-40 border-0 bg-transparent px-2 text-xs">
              <SelectValue>
                {selectedProjectId ? projects.find(p => p.id === selectedProjectId)?.name : 'Select project'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* GPU Status */}
        {gpuStatus && (
          <div className="flex items-center gap-2 rounded-[var(--uav-radius-sm)] border border-[var(--uav-stroke)] bg-[var(--uav-panel-elevated)] px-2.5 py-1.5">
            <span
              className={cn(
                'size-2 rounded-full',
                gpuStatus.status === 'online' && 'bg-[var(--uav-success)]',
                gpuStatus.status === 'offline' && 'bg-[var(--uav-error)]',
                gpuStatus.status === 'busy' && 'bg-[var(--uav-warning)]'
              )}
            />
            <span className="text-xs text-[var(--uav-text-secondary)]">
              GPU: {gpuStatus.name}
            </span>
          </div>
        )}
      </div>
    </header>
  )
}

export { Topbar }
