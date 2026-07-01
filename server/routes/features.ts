import { Router } from 'express'
import { jiraSearch, getJiraIssueUrl, fetchReleaseOptions } from '../jira.js'
import type { RawJiraIssue } from '../jira.js'

const router = Router()

const FIELDS = [
  'summary',
  'status',
  'assignee',
  'customfield_22800',
  'customfield_16006',
  'customfield_28300',
  'customfield_17211',
]

function transformIssue(raw: RawJiraIssue) {
  const fields = raw.fields as Record<string, unknown>
  const releaseField = fields.customfield_16006 as { value?: string } | null
  const releaseRaw = releaseField?.value ?? null
  const targetGARelease = releaseRaw ? releaseRaw.replace(/\*/g, '').trim() : null
  const statusField = fields.status as { name?: string; statusCategory?: { name?: string } } | null
  const scopingField = fields.customfield_22800 as { value?: string } | null
  const uncommittedField = fields.customfield_28300 as { value?: string } | null
  const assigneeField = fields.assignee as { displayName?: string } | null

  return {
    id: raw.id,
    key: raw.key,
    summary: (fields.summary as string) ?? '',
    status: {
      name: statusField?.name ?? 'Unknown',
      category: statusField?.statusCategory?.name ?? 'To Do',
    },
    scopingStatus: scopingField?.value ?? null,
    targetGARelease,
    uncommittedReview: uncommittedField?.value ?? null,
    assignee: assigneeField?.displayName ?? null,
    url: getJiraIssueUrl(raw.key),
  }
}

router.get('/features', async (_req, res) => {
  try {
    const issues = await jiraSearch(
      'cf[17211] = currentUser() ORDER BY cf[16006] ASC',
      FIELDS
    )
    res.json(issues.map(transformIssue))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

// Cache releases for 1 hour to avoid slow full-project scans
let releasesCache: { data: string[]; fetchedAt: number } | null = null
const CACHE_TTL_MS = 60 * 60 * 1000

async function fetchReleases(): Promise<string[]> {
  if (releasesCache && Date.now() - releasesCache.fetchedAt < CACHE_TTL_MS) {
    return releasesCache.data
  }

  const options = await fetchReleaseOptions()
  const sorted = options.sort(sortRelease)
  releasesCache = { data: sorted, fetchedAt: Date.now() }
  return sorted
}

router.get('/releases', async (_req, res) => {
  try {
    res.json(await fetchReleases())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

function sortRelease(a: string, b: string): number {
  const parse = (s: string): [number, number] => {
    const [maj, min] = s.split('.').map(Number)
    return [maj ?? 0, min ?? 0]
  }
  const [aMaj, aMin] = parse(a)
  const [bMaj, bMin] = parse(b)
  return aMaj !== bMaj ? aMaj - bMaj : aMin - bMin
}

export default router
