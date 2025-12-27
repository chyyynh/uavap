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

export interface UploadedFiles {
  ortho: { name: string; uploaded: boolean } | null
  dsm: { name: string; uploaded: boolean } | null
  laz: { name: string; uploaded: boolean } | null
}

export interface RequiredFiles {
  ortho: boolean
  dsm: boolean
  laz: boolean
}

interface TaskOptionsContextValue {
  options: TaskOptions
  setOption: (key: keyof TaskOptions, value: boolean) => void
  outputText: string
  fieldText: string
  uploadedFiles: UploadedFiles
  setUploadedFile: (key: keyof UploadedFiles, file: { name: string; uploaded: boolean } | null) => void
  requiredFiles: RequiredFiles
  canProcess: boolean
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

const DEFAULT_UPLOADED_FILES: UploadedFiles = {
  ortho: null,
  dsm: null,
  laz: null,
}

export function TaskOptionsProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = React.useState<TaskOptions>(DEFAULT_OPTIONS)
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFiles>(DEFAULT_UPLOADED_FILES)

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

  const setUploadedFile = React.useCallback(
    (key: keyof UploadedFiles, file: { name: string; uploaded: boolean } | null) => {
      setUploadedFiles((prev) => ({ ...prev, [key]: file }))
    },
    []
  )

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

  // Compute required files based on selected options
  const requiredFiles = React.useMemo<RequiredFiles>(() => {
    return {
      ortho: true, // Always required for object detection
      dsm: options.geoEnabled || options.changeEnabled, // DSM for elevation or terrain analysis
      laz: options.geoEnabled, // Point cloud for height calculation
    }
  }, [options.geoEnabled, options.changeEnabled])

  // Check if all required files are uploaded
  const canProcess = React.useMemo(() => {
    if (requiredFiles.ortho && !uploadedFiles.ortho?.uploaded) return false
    if (requiredFiles.dsm && !uploadedFiles.dsm?.uploaded) return false
    if (requiredFiles.laz && !uploadedFiles.laz?.uploaded) return false
    return true
  }, [requiredFiles, uploadedFiles])

  const value = React.useMemo(
    () => ({
      options,
      setOption,
      outputText,
      fieldText,
      uploadedFiles,
      setUploadedFile,
      requiredFiles,
      canProcess,
    }),
    [options, setOption, outputText, fieldText, uploadedFiles, setUploadedFile, requiredFiles, canProcess]
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
