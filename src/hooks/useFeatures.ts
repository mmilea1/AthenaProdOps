import { useState, useEffect, useCallback } from 'react'
import type { JiraFeature, ReleaseGroup } from '../types/jira'

function parseReleaseVersion(name: string): [number, number] {
  if (name === 'No Release') return [Infinity, Infinity]
  const parts = name.split('.').map(Number)
  return [parts[0] ?? 0, parts[1] ?? 0]
}

function sortReleases(a: string, b: string): number {
  const [aMaj, aMin] = parseReleaseVersion(a)
  const [bMaj, bMin] = parseReleaseVersion(b)
  if (aMaj !== bMaj) return aMaj - bMaj
  return aMin - bMin
}

function groupByRelease(features: JiraFeature[], allReleases: string[]): ReleaseGroup[] {
  const map = new Map<string, JiraFeature[]>()

  // Seed all known releases with empty arrays
  for (const r of allReleases) map.set(r, [])

  for (const f of features) {
    const key = f.targetGARelease ?? 'No Release'
    const existing = map.get(key)
    if (existing) {
      existing.push(f)
    } else {
      map.set(key, [f])
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => sortReleases(a, b))
    .map(([releaseName, feats]) => ({ releaseName, features: feats }))
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; groups: ReleaseGroup[] }
  | { status: 'error'; message: string }

export function useFeatures() {
  const [state, setState] = useState<State>({ status: 'idle' })
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })

    Promise.all([
      fetch('/api/features').then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<JiraFeature[]>
      }),
      fetch('/api/releases').then((r) => {
        if (!r.ok) return [] as string[]
        return r.json() as Promise<string[]>
      }),
    ])
      .then(([features, allReleases]) => {
        if (!cancelled) {
          setState({ status: 'success', groups: groupByRelease(features, allReleases) })
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          setState({ status: 'error', message })
        }
      })

    return () => { cancelled = true }
  }, [tick])

  return {
    groups: state.status === 'success' ? state.groups : [],
    loading: state.status === 'loading' || state.status === 'idle',
    error: state.status === 'error' ? state.message : null,
    refresh,
  }
}
