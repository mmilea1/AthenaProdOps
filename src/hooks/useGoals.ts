import { useState, useEffect, useCallback } from 'react'

export interface ScopingFeature {
  id: string
  key: string
  summary: string
  url: string
  created: string
  scopedAt: string | null        // ISO date when scoping status was set to a done value
  businessDaysTaken: number      // created → scopedAt (or today if not done)
  scopingStatus: string | null
  targetRelease: string | null
  isDemo?: boolean
}

export const GOAL_DAYS = 14

// Statuses that satisfy the scoping goal
const SCOPED_STATUSES = new Set([
  'Scoped-Supported',
  'Scoped-Not Supported',
  'Deferred Scoping',
  'In Scoping',
])

export function isScopingComplete(status: string | null): boolean {
  return !!status && SCOPED_STATUSES.has(status)
}

// Goal is met only if scoped AND completed within 14 business days
export function isGoalMet(f: ScopingFeature): boolean {
  return isScopingComplete(f.scopingStatus) && f.businessDaysTaken <= GOAL_DAYS
}

// Scoped but took too long
export function isGoalMissed(f: ScopingFeature): boolean {
  return isScopingComplete(f.scopingStatus) && f.businessDaysTaken > GOAL_DAYS
}

// Not yet scoped, still within the window — needs action soon
export function needsAttention(f: ScopingFeature): boolean {
  return !isScopingComplete(f.scopingStatus) && f.businessDaysTaken < GOAL_DAYS
}

// Not yet scoped and already past 14 days — overdue
export function isLate(f: ScopingFeature): boolean {
  return !isScopingComplete(f.scopingStatus) && f.businessDaysTaken >= GOAL_DAYS
}

export function daysLeft(f: ScopingFeature): number {
  return GOAL_DAYS - f.businessDaysTaken
}

// Client-side demo feature shown when showDemo=true and the API is unavailable
const DEMO_FEATURE: ScopingFeature = {
  id: 'demo-99999',
  key: 'FEATURE-99999',
  summary: '[DEMO] New SSO integration for partner portal',
  url: '#',
  created: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  scopedAt: null,
  businessDaysTaken: 8,
  scopingStatus: null,
  targetRelease: '26.11',
  isDemo: true,
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; features: ScopingFeature[] }
  | { status: 'error'; message: string; features: ScopingFeature[] }

export function useGoals(showDemo: boolean) {
  const [state, setState] = useState<State>({ status: 'idle' })
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    const params = new URLSearchParams({ showDemo: String(showDemo) })
    fetch(`/api/goals/scoping?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<ScopingFeature[]>
      })
      .then((features) => {
        if (!cancelled) setState({ status: 'success', features })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          // Fall back to client-side demo data so the UI is still usable
          setState({ status: 'error', message, features: showDemo ? [DEMO_FEATURE] : [] })
        }
      })

    return () => { cancelled = true }
  }, [showDemo, tick])

  return {
    features: state.status === 'success' ? state.features : state.status === 'error' ? state.features : [],
    loading: state.status === 'loading' || state.status === 'idle',
    error: state.status === 'error' ? state.message : null,
    refresh,
  }
}
