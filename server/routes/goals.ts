import { Router } from 'express'
import { jiraSearch, getJiraIssueUrl } from '../jira.js'

const router = Router()

const FIELD_SCOPING_STATUS = 'customfield_22800'  // Product Operations Scoping Status
const FIELD_RELEASE        = 'customfield_16006'  // Target GA Release
const FIELD_PRODUCT        = 'customfield_28102'  // Product (Insight object)
const FIELD_ZONE           = 'customfield_28103'  // Zone (Insight object, multi)
const FIELD_PROD_OPS_NUM   = '17211'

const FIELDS = [
  'summary',
  'created',
  'status',
  FIELD_SCOPING_STATUS,
  FIELD_RELEASE,
  FIELD_PRODUCT,
  FIELD_ZONE,
]

const SCOPED_DONE = new Set([
  'Scoped-Supported',
  'Scoped-Not Supported',
  'Deferred Scoping',
])

export function businessDaysBetween(from: Date, to: Date): number {
  let count = 0
  const cur = new Date(from)
  cur.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(0, 0, 0, 0)
  while (cur < end) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

interface ChangelogItem {
  field: string
  fieldId: string
  toString: string | null
}
interface ChangelogHistory {
  created: string
  items: ChangelogItem[]
}

function scopingCompletedAt(changelog: { histories: ChangelogHistory[] } | undefined): Date | null {
  if (!changelog?.histories) return null
  let earliest: Date | null = null
  for (const history of changelog.histories) {
    for (const item of history.items) {
      if (
        (item.fieldId === FIELD_SCOPING_STATUS || item.field === 'Product Operations Scoping Status') &&
        item.toString && SCOPED_DONE.has(item.toString)
      ) {
        const d = new Date(history.created)
        if (!earliest || d < earliest) earliest = d
      }
    }
  }
  return earliest
}

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

// Insight/Assets fields return string arrays like ["Data and Ecosystem Platform (PZ-401)"]
function insightLabel(raw: unknown): string | null {
  if (!raw) return null
  const val = Array.isArray(raw) ? (raw[0] as string) : (raw as string)
  if (typeof val !== 'string') return null
  return val.replace(/\s*\([A-Z]+-\d+\)\s*$/, '').trim() || null
}

// Cache scope options for 1 hour
let scopeCache: { data: { products: string[]; zones: string[] }; fetchedAt: number } | null = null

router.get('/goals/scope-options', async (_req, res) => {
  if (scopeCache && Date.now() - scopeCache.fetchedAt < 60 * 60 * 1000) {
    return res.json(scopeCache.data)
  }
  try {
    const issues = await jiraSearch(
      'project = FEATURE AND created >= "2023-01-01" ORDER BY created DESC',
      [FIELD_PRODUCT, FIELD_ZONE],
      300
    )
    const products = new Set<string>()
    const zones = new Set<string>()
    for (const issue of issues) {
      const f = issue.fields as Record<string, unknown>
      const p = insightLabel(f[FIELD_PRODUCT])
      const z = insightLabel(f[FIELD_ZONE])
      if (p) products.add(p)
      if (z) zones.add(z)
    }
    const data = {
      products: [...products].sort(),
      zones: [...zones].sort(),
    }
    scopeCache = { data, fetchedAt: Date.now() }
    res.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

router.get('/goals/scoping', async (req, res) => {
  const showDemo = req.query.showDemo === 'true'
  const scopeProduct = req.query.product as string | undefined
  const scopeZone = req.query.zone as string | undefined
  // source=assigned → always query by current user (for Historic tab)
  // source=scope (or omitted) → query by product/zone scope when set
  const source = (req.query.source as string | undefined) ?? 'scope'

  let jql: string
  if (source === 'assigned') {
    jql = `cf[${FIELD_PROD_OPS_NUM}] = currentUser() ORDER BY created DESC`
  } else if (scopeProduct || scopeZone) {
    const clauses = ['project = FEATURE', 'created >= "2023-01-01"']
    if (scopeProduct) clauses.push(`"Product" = "${scopeProduct}"`)
    if (scopeZone) clauses.push(`"Zone" = "${scopeZone}"`)
    jql = clauses.join(' AND ') + ' ORDER BY created DESC'
  } else {
    jql = `cf[${FIELD_PROD_OPS_NUM}] = currentUser() ORDER BY created DESC`
  }

  try {
    const raw = await jiraSearch(jql, FIELDS, undefined, ['changelog'])
    const now = new Date()

    const features: ScopingFeature[] = raw.map((issue) => {
      const f = issue.fields as Record<string, unknown>
      const changelog = (issue as unknown as { changelog?: { histories: ChangelogHistory[] } }).changelog

      const created = (f.created as string) ?? new Date().toISOString()
      const scopingField = f[FIELD_SCOPING_STATUS] as { value?: string } | null
      const releaseField = f[FIELD_RELEASE] as { value?: string } | null
      const scopingStatus = scopingField?.value ?? null
      const releaseRaw = releaseField?.value ?? null

      const completedAt = scopingCompletedAt(changelog)
      const endDate = completedAt ?? now

      return {
        id: issue.id,
        key: issue.key,
        summary: (f.summary as string) ?? '',
        url: getJiraIssueUrl(issue.key),
        created,
        scopedAt: completedAt ? completedAt.toISOString() : null,
        businessDaysTaken: businessDaysBetween(new Date(created), endDate),
        scopingStatus,
        targetRelease: releaseRaw ? releaseRaw.replace(/\*/g, '').trim() : null,
        product: insightLabel(f[FIELD_PRODUCT]),
        zone: insightLabel(f[FIELD_ZONE]),
      }
    })

    if (showDemo) features.unshift({
      id: 'demo-99999', key: 'FEATURE-99999',
      summary: '[DEMO] New SSO integration for partner portal',
      url: '#',
      created: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      scopedAt: null, businessDaysTaken: 2, scopingStatus: null,
      targetRelease: '26.11',
      product: scopeProduct ?? 'Data and Ecosystem Platform',
      zone: scopeZone ?? 'Identity and Access Management',
      isDemo: true,
    })

    res.json(features)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (showDemo) return res.json([])
    res.status(500).json({ error: message })
  }
})

export default router
