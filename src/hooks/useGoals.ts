import { useState, useEffect, useCallback } from 'react'

export interface ScopingFeature {
  id: string
  key: string
  summary: string
  url: string
  created: string
  scopedAt: string | null
  businessDaysTaken: number
  scopingStatus: string | null
  targetRelease: string | null
  product: string | null
  zone: string | null
  isDemo?: boolean
}

export interface GoalsScope {
  product: string
  zone: string
}

export const GOAL_DAYS = 14

const SCOPED_STATUSES = new Set([
  'Scoped-Supported',
  'Scoped-Not Supported',
  'Deferred Scoping',
  'In Scoping',
])

export function isScopingComplete(status: string | null): boolean {
  return !!status && SCOPED_STATUSES.has(status)
}

export function isGoalMet(f: ScopingFeature): boolean {
  return isScopingComplete(f.scopingStatus) && f.businessDaysTaken <= GOAL_DAYS
}

export function isGoalMissed(f: ScopingFeature): boolean {
  return isScopingComplete(f.scopingStatus) && f.businessDaysTaken > GOAL_DAYS
}

export function needsAttention(f: ScopingFeature): boolean {
  return !isScopingComplete(f.scopingStatus) && f.businessDaysTaken < GOAL_DAYS
}

export function isLate(f: ScopingFeature): boolean {
  return !isScopingComplete(f.scopingStatus) && f.businessDaysTaken >= GOAL_DAYS
}

export function daysLeft(f: ScopingFeature): number {
  return GOAL_DAYS - f.businessDaysTaken
}

function makeDemoFeature(trackingSince: string, scope: GoalsScope | null): ScopingFeature {
  const base = new Date(trackingSince)
  base.setDate(base.getDate() + 1)
  return {
    id: 'demo-99999',
    key: 'FEATURE-99999',
    summary: '[DEMO] New SSO integration for partner portal',
    url: '#',
    created: base.toISOString(),
    scopedAt: null,
    businessDaysTaken: 2,
    scopingStatus: null,
    targetRelease: '26.11',
    product: scope?.product ?? 'Data and Ecosystem Platform',
    zone: scope?.zone ?? 'Identity and Access Management',
    isDemo: true,
  }
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; features: ScopingFeature[] }
  | { status: 'error'; message: string; features: ScopingFeature[] }

export function useGoals(showDemo: boolean, trackingSince: string, scope: GoalsScope | null) {
  const [state, setState] = useState<State>({ status: 'idle' })
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    const demoFeature = makeDemoFeature(trackingSince, scope)
    const params = new URLSearchParams({ showDemo: String(showDemo) })
    if (scope?.product) params.set('product', scope.product)
    if (scope?.zone) params.set('zone', scope.zone)

    fetch(`/api/goals/scoping?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<ScopingFeature[]>
      })
      .then((features) => {
        if (!cancelled) {
          const withoutServerDemo = features.filter((f) => !f.isDemo)
          setState({ status: 'success', features: showDemo ? [demoFeature, ...withoutServerDemo] : withoutServerDemo })
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          setState({ status: 'error', message, features: showDemo ? [demoFeature] : [] })
        }
      })

    return () => { cancelled = true }
  }, [showDemo, trackingSince, scope?.product, scope?.zone, tick])

  return {
    features: state.status === 'success' ? state.features : state.status === 'error' ? state.features : [],
    loading: state.status === 'loading' || state.status === 'idle',
    error: state.status === 'error' ? state.message : null,
    refresh,
  }
}
