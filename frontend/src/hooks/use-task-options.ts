'use client'

import * as React from 'react'

interface TaskOptions {
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

interface UseTaskOptionsReturn {
  options: TaskOptions
  setOption: (key: keyof TaskOptions, value: boolean) => void
  outputText: string
  fieldText: string
}

export function useTaskOptions(): UseTaskOptionsReturn {
  const [options, setOptions] = React.useState<TaskOptions>({
    objectsEnabled: true,
    personEnabled: true,
    vehicleEnabled: true,
    coneEnabled: false,
    geoEnabled: true,
    changeEnabled: false,
    statsEnabled: true,
    pdfEnabled: true,
    gpkgEnabled: false,
  })

  const setOption = React.useCallback(
    (key: keyof TaskOptions, value: boolean) => {
      setOptions((prev) => {
        const next = { ...prev, [key]: value }

        if (key === 'objectsEnabled' && !value) {
          next.personEnabled = false
          next.vehicleEnabled = false
          next.coneEnabled = false
        }

        return next
      })
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

  return { options, setOption, outputText, fieldText }
}
