# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UAV AIP Dashboard (無人機自動巡檢平台) - A visualization dashboard for UAV-based object detection. The frontend connects to a FastAPI backend (typically running on Google Colab via Cloudflare Tunnel) for real-time inference.

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server on port 3000
pnpm build            # Production build
pnpm test             # Run tests with vitest
pnpm lint             # Run ESLint
pnpm check            # Format with Prettier + fix ESLint issues
```

## Architecture

### Tech Stack
- **Framework**: TanStack Start (React meta-framework with SSR)
- **Routing**: TanStack Router (file-based routing in `src/routes/`)
- **State**: TanStack Query for server state
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **UI Components**: Base-UI + shadcn/ui-style components in `src/components/ui/`
- **Map**: react-leaflet for interactive mapping

### Key Directories
- `src/routes/` - File-based routes (TanStack Router generates `routeTree.gen.ts`)
- `src/api/queries.ts` - TanStack Query hooks and API functions
- `src/api/mock-data.ts` - Mock data for development without backend
- `src/components/dashboard/` - Dashboard-specific components
- `src/components/ui/` - Reusable UI primitives
- `src/hooks/` - Custom React hooks
- `src/types/detection.ts` - TypeScript types for detection objects

### Data Flow
1. API URL stored in localStorage (`uav_api_url` key)
2. `useMock()` returns true when no API URL set - uses mock data
3. When connected, queries poll real FastAPI endpoints
4. Detection results flow: API -> TanStack Query -> Dashboard components -> MapView

### API Integration
- Set API URL via `setApiBaseUrl()` from `src/api/queries.ts`
- Main endpoints: `/api/projects`, `/api/gpu/status`, `/api/detections/{project_id}`, `/api/ortho/*`
- File upload to `/api/upload` supports TIFF, DSM, LAZ formats

### Processing Pipeline
- `useProcessing` hook manages detection job lifecycle
- Polls `/api/process/status` during processing
- Steps: Preprocessing -> Detection -> Postprocessing -> etc.

## Path Alias
`@/*` maps to `./src/*` (configured in tsconfig.json)
