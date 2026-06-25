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

async function fetchFeatures(params: URLSearchParams): Promise<ScopingFeature[]> {
  const r = await fetch(`/api/goals/scoping?${params}`)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json() as Promise<ScopingFeature[]>
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; scopeFeatures: ScopingFeature[]; assignedFeatures: ScopingFeature[] }
  | { status: 'error'; message: string; scopeFeatures: ScopingFeature[]; assignedFeatures: ScopingFeature[] }

export function useGoals(showDemo: boolean, trackingSince: string, scope: GoalsScope | null) {
  const [state, setState] = useState<State>({ status: 'idle' })
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    const demoFeature = makeDemoFeature(trackingSince, scope)

    // Scope query (for New Features tab) — uses product/zone when set
    const scopeParams = new URLSearchParams({ showDemo: 'false', source: 'scope' })
    if (scope?.product) scopeParams.set('product', scope.product)
    if (scope?.zone) scopeParams.set('zone', scope.zone)

    // Assigned query (always used for Historic tab)
    const assignedParams = new URLSearchParams({ showDemo: 'false', source: 'assigned' })

    Promise.all([fetchFeatures(scopeParams), fetchFeatures(assignedParams)])
      .then(([scopeFeatures, assignedFeatures]) => {
        if (!cancelled) {
          const newFeatures = showDemo ? [demoFeature, ...scopeFeatures] : scopeFeatures
          setState({ status: 'success', scopeFeatures: newFeatures, assignedFeatures })
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          setState({
            status: 'error', message,
            scopeFeatures: showDemo ? [demoFeature] : [],
            assignedFeatures: [],
          })
        }
      })

    return () => { cancelled = true }
  }, [showDemo, trackingSince, scope?.product, scope?.zone, tick])

  const scopeFeatures = state.status === 'success' ? state.scopeFeatures
    : state.status === 'error' ? state.scopeFeatures : []
  const assignedFeatures = state.status === 'success' ? state.assignedFeatures
    : state.status === 'error' ? state.assignedFeatures : []

  return {
    scopeFeatures,
    assignedFeatures,
    loading: state.status === 'loading' || state.status === 'idle',
    error: state.status === 'error' ? state.message : null,
    refresh,
  }
}
