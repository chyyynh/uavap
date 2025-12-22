'use client'

import * as React from 'react'

export interface TaskOptions {
  objectsEnabled: boolean
  personEnabled: boolean
  vehicleEnabled: boolean
  coneEnabled: boolean
  geoEnabled: boolean
  changeEnabled: boolean
  statsEnabled: boolean
  pdfEnabled: boolean
  gpkgEnabled: boolean
}

interface TaskOptionsContextValue {
  options: TaskOptions
  setOption: (key: keyof TaskOptions, value: boolean) => void
  outputText: string
  fieldText: string
}

const TaskOptionsContext = React.createContext<TaskOptionsContextValue | null>(null)

const DEFAULT_OPTIONS: TaskOptions = {
  objectsEnabled: true,
  personEnabled: true,
  vehicleEnabled: true,
  coneEnabled: false,
  geoEnabled: true,
  changeEnabled: false,
  statsEnabled: true,
  pdfEnabled: true,
  gpkgEnabled: false,
}

export function TaskOptionsProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = React.useState<TaskOptions>(DEFAULT_OPTIONS)

  const setOption = React.useCallback((key: keyof TaskOptions, value: boolean) => {
    setOptions((prev) => {
      const next = { ...prev, [key]: value }

      // Cascade: disabling parent disables children
      if (key === 'objectsEnabled' && !value) {
        next.personEnabled = false
        next.vehicleEnabled = false
        next.coneEnabled = false
      }

      return next
    })
  }, [])

  const outputText = React.useMemo(() => {
    const parts: string[] = []
    if (options.statsEnabled) parts.push('Stats')
    if (options.pdfEnabled) parts.push('PDF')
    if (options.gpkgEnabled) parts.push('GPKG')
    return parts.length > 0 ? parts.join(' + ') : 'None'
  }, [options.statsEnabled, options.pdfEnabled, options.gpkgEnabled])

  const fieldText = React.useMemo(() => {
    return options.geoEnabled ? '+ elev_z / height_m' : 'No elev/height'
  }, [options.geoEnabled])

  const value = React.useMemo(
    () => ({ options, setOption, outputText, fieldText }),
    [options, setOption, outputText, fieldText]
  )

  return (
    <TaskOptionsContext.Provider value={value}>
      {children}
    </TaskOptionsContext.Provider>
  )
}

export function useTaskOptionsContext() {
  const context = React.useContext(TaskOptionsContext)
  if (!context) {
    throw new Error('useTaskOptionsContext must be used within TaskOptionsProvider')
  }
  return context
}
