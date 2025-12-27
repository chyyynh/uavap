'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { PlayIcon, Link04Icon, Tick02Icon, Cancel01Icon } from '@hugeicons/core-free-icons'
import { useQueryClient } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import { DashboardCard } from './DashboardCard'
import { TaskSelectionSection } from './TaskSelectionSection'
import { ProcessingSection } from './ProcessingSection'
import { TaskOptionsProvider } from '@/contexts/TaskOptionsContext'
import { useGpuStatus, setApiBaseUrl, getStoredApiUrl } from '@/api/queries'
import type { ProcessingStep } from '@/types/detection'

interface DetectionTaskCardProps {
  onRun: () => void
  isRunning: boolean
  steps: ProcessingStep[]
  progress: number
  elapsed: number
  currentStep?: string
}

function DetectionTaskCard({
  onRun,
  isRunning,
  steps,
  progress,
  elapsed,
  currentStep,
}: DetectionTaskCardProps) {
  const queryClient = useQueryClient()
  const { data: gpuStatus } = useGpuStatus()

  const [apiUrl, setApiUrl] = React.useState('')
  const [isConnected, setIsConnected] = React.useState(false)
  const [showApiInput, setShowApiInput] = React.useState(false)

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
    setShowApiInput(false)
    queryClient.invalidateQueries()
  }

  const handleApiDisconnect = () => {
    setApiUrl('')
    setApiBaseUrl(null)
    setIsConnected(false)
    queryClient.invalidateQueries()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && apiUrl) {
      handleApiConnect()
    } else if (e.key === 'Escape') {
      setShowApiInput(false)
    }
  }

  return (
    <TaskOptionsProvider>
      <DashboardCard
        title="Detection Task"
        helpText="Select detection targets and analysis options"
      >
        <div className="space-y-4">
          {/* Connection & GPU Status */}
          <div className="flex items-center justify-between">
            {/* GPU Status */}
            {gpuStatus && (
              <div className="flex flex-col">
                <span className="text-[9px] font-medium tracking-widest text-[var(--uav-text-tertiary)]">
                  {gpuStatus.status === 'online' ? 'GPU ACTIVE' : 'GPU STATUS'}
                </span>
                <span className={cn(
                  'text-[10px] font-mono',
                  gpuStatus.status === 'online' ? 'text-[var(--uav-success)]' : 'text-[var(--uav-text-secondary)]'
                )}>
                  {gpuStatus.name}
                </span>
              </div>
            )}
            {!gpuStatus && <div />}

            {/* Connection */}
            {showApiInput ? (
              <div className="flex items-center gap-2 border border-[var(--uav-stroke)] bg-black/30 px-2 py-1">
                <input
                  type="text"
                  value={apiUrl}
                  onChange={handleApiUrlChange}
                  onKeyDown={handleKeyDown}
                  placeholder="API URL"
                  autoFocus
                  className="w-32 bg-transparent font-mono text-[10px] text-[var(--uav-text)] placeholder:text-[var(--uav-text-tertiary)] focus:outline-none"
                />
                <button
                  onClick={handleApiConnect}
                  disabled={!apiUrl}
                  className="p-0.5 text-[var(--uav-success)] transition-opacity disabled:opacity-30"
                >
                  <HugeiconsIcon icon={Tick02Icon} className="size-3" strokeWidth={2} />
                </button>
                <button
                  onClick={() => setShowApiInput(false)}
                  className="p-0.5 text-[var(--uav-text-tertiary)]"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-3" strokeWidth={2} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (isConnected) {
                    handleApiDisconnect()
                  } else {
                    setShowApiInput(true)
                  }
                }}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 transition-all',
                  'border',
                  isConnected
                    ? 'border-[var(--uav-success)]/30 text-[var(--uav-success)]'
                    : 'border-[var(--uav-stroke)] text-[var(--uav-text-tertiary)] hover:border-[var(--uav-red)]/30 hover:text-[var(--uav-red)]'
                )}
              >
                <HugeiconsIcon
                  icon={Link04Icon}
                  className="size-3"
                  strokeWidth={2}
                />
                <span className="text-[9px] font-medium tracking-wider">
                  {isConnected ? 'CONNECTED' : 'CONNECT'}
                </span>
              </button>
            )}
          </div>

          <div className="h-px bg-[var(--uav-stroke)]" />

          <TaskSelectionSection />

          {/* Processing Section - Only show when running or has progress */}
          {(isRunning || progress > 0) ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="border border-[var(--uav-red)] bg-[var(--uav-red)]/10 px-3 py-2.5">
                <ProcessingSection
                  steps={steps}
                  progress={progress}
                  elapsed={elapsed}
                  currentStep={currentStep}
                  isRunning={isRunning}
                />
              </div>

              {/* Show "Run Again" button after completion */}
              {!isRunning && progress === 100 && (
                <button
                  onClick={onRun}
                  className="mt-2 w-full border border-[var(--uav-stroke)] py-2 text-[10px] font-medium tracking-wider text-[var(--uav-text-secondary)] transition-all hover:border-[var(--uav-red)]/30 hover:text-[var(--uav-red)]"
                >
                  RUN AGAIN
                </button>
              )}
            </div>
          ) : (
            /* Execute Button - Show when idle */
            <button
              onClick={onRun}
              disabled={isRunning}
              className="group relative w-full overflow-hidden py-3 font-medium tracking-wider transition-all duration-300 border border-[var(--uav-red)] bg-[var(--uav-red)] text-white shadow-[0_0_20px_var(--uav-red-glow)] hover:shadow-[0_0_30px_var(--uav-red-glow)]"
            >
              {/* Shine effect on hover */}
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

              <span className="relative flex items-center justify-center gap-2 text-[11px]">
                <HugeiconsIcon
                  icon={PlayIcon}
                  strokeWidth={2}
                  className="size-4"
                />
                EXECUTE DETECTION
              </span>
            </button>
          )}
        </div>
      </DashboardCard>
    </TaskOptionsProvider>
  )
}

export { DetectionTaskCard }
