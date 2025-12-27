'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Layers01Icon, Moon02Icon, Sun03Icon, PaintBoardIcon } from '@hugeicons/core-free-icons'

import { cn } from '@/lib/utils'
import type { LayerVisibility } from '@/types/detection'

export type MapTheme = 'dark' | 'light' | 'color'

interface LayerPanelProps {
  visibility: LayerVisibility
  onToggle: (layer: keyof LayerVisibility) => void
  mapTheme: MapTheme
  onThemeChange: (theme: MapTheme) => void
}

interface LayerItem {
  key: keyof LayerVisibility
  label: string
  shortLabel: string
  color: string
}

interface LayerGroup {
  id: string
  label: string
  items: LayerItem[]
}

const LAYER_GROUPS: LayerGroup[] = [
  {
    id: 'base',
    label: 'BASE',
    items: [
      { key: 'base', label: 'Base Map', shortLabel: 'MAP', color: '#6b7280' },
      { key: 'ortho', label: 'Orthophoto', shortLabel: 'ORTHO', color: '#8b5cf6' },
    ],
  },
  {
    id: 'analysis',
    label: 'ANALYSIS',
    items: [
      { key: 'landcover', label: 'Land Cover', shortLabel: 'LAND', color: '#14b8a6' },
      { key: 'slope', label: 'Slope', shortLabel: 'SLOPE', color: '#f59e0b' },
      { key: 'aspect', label: 'Aspect', shortLabel: 'ASPECT', color: '#ec4899' },
    ],
  },
  {
    id: 'detections',
    label: 'OBJECTS',
    items: [
      { key: 'person', label: 'Person', shortLabel: 'PER', color: '#3b82f6' },
      { key: 'vehicle', label: 'Vehicle', shortLabel: 'VEH', color: '#22c55e' },
      { key: 'cone', label: 'Cone', shortLabel: 'CON', color: '#f97316' },
    ],
  },
]

function LayerIndicator({
  item,
  active,
  onClick,
}: {
  item: LayerItem
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-1.5 rounded-sm px-1.5 py-1 transition-all',
        'hover:bg-white/[0.06]',
        active && 'bg-white/[0.03]'
      )}
      title={item.label}
    >
      {/* LED Indicator */}
      <div className="relative">
        {/* Outer ring */}
        <span
          className={cn(
            'block size-2.5 rounded-full border transition-all duration-300',
            active
              ? 'border-current'
              : 'border-white/20'
          )}
          style={{
            borderColor: active ? item.color : undefined,
          }}
        />
        {/* Inner glow dot */}
        <span
          className={cn(
            'absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300',
            active ? 'opacity-100' : 'opacity-20'
          )}
          style={{
            backgroundColor: item.color,
            boxShadow: active
              ? `0 0 4px ${item.color}, 0 0 8px ${item.color}, 0 0 12px ${item.color}40`
              : undefined,
          }}
        />
      </div>

      {/* Label */}
      <span
        className={cn(
          'text-[8px] font-medium tracking-wide transition-colors duration-200',
          active ? 'text-white/90' : 'text-white/40 group-hover:text-white/60'
        )}
      >
        {item.shortLabel}
      </span>
    </button>
  )
}

const THEME_OPTIONS = [
  { key: 'dark' as MapTheme, label: 'Dark', icon: Moon02Icon },
  { key: 'light' as MapTheme, label: 'Light', icon: Sun03Icon },
  { key: 'color' as MapTheme, label: 'Color', icon: PaintBoardIcon },
]

function LayerPanel({ visibility, onToggle, mapTheme, onThemeChange }: LayerPanelProps) {
  const [isOpen, setIsOpen] = React.useState(true)

  const activeCount = Object.values(visibility).filter(Boolean).length
  const totalCount = Object.keys(visibility).length

  return (
    <div
      className={cn(
        'pointer-events-auto absolute left-3 top-3 z-[9999]',
        'border border-white/[0.12] bg-neutral-800/90 backdrop-blur-md',
        'shadow-[0_4px_24px_rgba(0,0,0,0.5)]',
        'transition-all duration-300'
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2',
          'border-b border-white/[0.06] transition-colors hover:bg-white/[0.03]'
        )}
      >
        {/* Icon with subtle glow */}
        <div className="relative">
          <HugeiconsIcon
            icon={Layers01Icon}
            className="size-3.5 text-white/50"
            strokeWidth={1.5}
          />
          <div className="absolute inset-0 blur-sm">
            <HugeiconsIcon
              icon={Layers01Icon}
              className="size-3.5 text-white/20"
              strokeWidth={1.5}
            />
          </div>
        </div>

        <span className="text-[9px] font-medium tracking-[0.2em] text-white/70">
          LAYERS
        </span>

        {/* Status indicator */}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="font-mono text-[9px] text-white/50">{activeCount}</span>
            <span className="text-[8px] text-white/20">/</span>
            <span className="font-mono text-[9px] text-white/30">{totalCount}</span>
          </div>

          {/* Chevron */}
          <svg
            viewBox="0 0 10 6"
            className={cn(
              'size-2 text-white/30 transition-transform duration-300',
              !isOpen && '-rotate-90'
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 1L5 5L9 1" />
          </svg>
        </div>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="flex divide-x divide-white/[0.06]">
          {LAYER_GROUPS.map((group) => (
            <div key={group.id} className="flex flex-col px-2 py-2">
              {/* Group Label */}
              <div className="mb-1.5 px-1.5">
                <span className="text-[7px] font-semibold tracking-[0.15em] text-white/25">
                  {group.label}
                </span>
              </div>

              {/* Group Items */}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <LayerIndicator
                    key={item.key}
                    item={item}
                    active={visibility[item.key]}
                    onClick={() => onToggle(item.key)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Theme Selector */}
          <div className="flex flex-col px-2 py-2">
            <div className="mb-1.5 px-1.5">
              <span className="text-[7px] font-semibold tracking-[0.15em] text-white/25">
                THEME
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              {THEME_OPTIONS.map((theme) => (
                <button
                  key={theme.key}
                  type="button"
                  onClick={() => onThemeChange(theme.key)}
                  className={cn(
                    'group relative flex items-center gap-1.5 rounded-sm px-1.5 py-1 transition-all',
                    'hover:bg-white/[0.06]',
                    mapTheme === theme.key && 'bg-white/[0.03]'
                  )}
                  title={theme.label}
                >
                  <HugeiconsIcon
                    icon={theme.icon}
                    className={cn(
                      'size-3 transition-colors duration-200',
                      mapTheme === theme.key
                        ? 'text-white/90'
                        : 'text-white/30 group-hover:text-white/50'
                    )}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  )
}

export { LayerPanel }
