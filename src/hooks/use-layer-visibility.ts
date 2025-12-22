'use client'

import * as React from 'react'
import type { LayerVisibility } from '@/types/detection'

interface UseLayerVisibilityReturn {
  visibility: LayerVisibility
  toggle: (layer: keyof LayerVisibility) => void
  enable: (layer: keyof LayerVisibility) => void
  setVisibility: React.Dispatch<React.SetStateAction<LayerVisibility>>
}

export function useLayerVisibility(): UseLayerVisibilityReturn {
  const [visibility, setVisibility] = React.useState<LayerVisibility>({
    base: true,
    landcover: false,
    person: true,
    vehicle: true,
    cone: true,
  })

  const toggle = React.useCallback((layer: keyof LayerVisibility) => {
    setVisibility((prev) => ({ ...prev, [layer]: !prev[layer] }))
  }, [])

  const enable = React.useCallback((layer: keyof LayerVisibility) => {
    setVisibility((prev) => ({ ...prev, [layer]: true }))
  }, [])

  return { visibility, toggle, enable, setVisibility }
}
