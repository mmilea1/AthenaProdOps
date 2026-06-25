import 'dotenv/config'

const JIRA_BASE_URL = process.env.JIRA_BASE_URL ?? 'https://athenajira.athenahealth.com'
const JIRA_USER_EMAIL = process.env.JIRA_USER_EMAIL ?? ''
// Accept either name: JIRA_PERSONAL_TOKEN (used by atlassian MCP) or JIRA_API_TOKEN
const JIRA_API_TOKEN = process.env.JIRA_PERSONAL_TOKEN ?? process.env.JIRA_API_TOKEN ?? ''

function getAuthHeader(): string {
  return `Bearer ${JIRA_API_TOKEN}`
}

export interface RawJiraIssue {
  id: string
  key: string
  fields: Record<string, unknown>
}

export async function jiraSearch(
  jql: string,
  fields: string[],
  limit?: number,  // if set, fetch only this many results (single request)
  expand?: string[]
): Promise<RawJiraIssue[]> {
  if (!JIRA_BASE_URL || !JIRA_API_TOKEN) {
    throw new Error('Missing Jira credentials. Check your .env file.')
  }

  const results: RawJiraIssue[] = []
  let startAt = 0
  const pageSize = limit ?? 50

  while (true) {
    const url = new URL(`${JIRA_BASE_URL}/rest/api/2/search`)
    url.searchParams.set('jql', jql)
    url.searchParams.set('fields', fields.join(','))
    url.searchParams.set('maxResults', String(pageSize))
    url.searchParams.set('startAt', String(startAt))
    if (expand?.length) url.searchParams.set('expand', expand.join(','))

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Jira API error ${response.status}: ${text}`)
    }

    const data = (await response.json()) as {
      issues: RawJiraIssue[]
      total: number
    }

    results.push(...data.issues)

    // Stop after first page if a limit was specified
    if (limit !== undefined) break
    if (startAt + data.issues.length >= data.total) break
    startAt += pageSize
  }

  return results
}

export function getJiraIssueUrl(key: string): string {
  return `${JIRA_BASE_URL}/browse/${key}`
}

// Fetch distinct releases by sampling recently-updated features
// Much faster than scanning all issues; covers all active release cycles
export async function fetchReleaseOptions(): Promise<string[]> {
  const issues = await jiraSearch(
    'project = FEATURE AND cf[16006] is not EMPTY AND cf[16006] != "TBD" ORDER BY cf[16006] DESC',
    ['customfield_16006'],
    100
  )

  const seen = new Set<string>()
  for (const issue of issues) {
    const fields = issue.fields as Record<string, unknown>
    const f = fields.customfield_16006 as { value?: string } | null
    const v = f?.value?.replace(/\*/g, '').trim()
    if (v) seen.add(v)
  }

  return Array.from(seen)
}
