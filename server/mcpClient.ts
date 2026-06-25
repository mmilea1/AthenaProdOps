import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const MCP_SERVER_URL = 'https://mcp-atlassian-server.srv.athena.io/mcp/'
const JIRA_BASE_URL = 'https://athenajira.athenahealth.com'

// Pin to the version whose tokens are already cached locally
const MCP_REMOTE_VERSION = '0.1.37'

let mcpClient: Client | null = null
let connecting: Promise<Client> | null = null

async function createClient(): Promise<Client> {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: [
      '-y',
      `mcp-remote@${MCP_REMOTE_VERSION}`,
      MCP_SERVER_URL,
    ],
  })

  const client = new Client(
    { name: 'athenapm', version: '0.10.0' },
    { capabilities: {} }
  )

  await client.connect(transport)
  return client
}

async function getClient(): Promise<Client> {
  if (mcpClient) return mcpClient
  if (connecting) return connecting

  connecting = createClient()
    .then((c) => {
      mcpClient = c
      connecting = null
      return c
    })
    .catch((err) => {
      connecting = null
      throw err
    })

  return connecting
}

export interface McpIssue {
  id: string
  key: string
  summary: string
  status: { name: string; category: string }
  customfield_22800?: { value: string } | null
  customfield_16006?: { value: string } | null
  customfield_28300?: { value: string } | null
}

export interface McpSearchResult {
  total: number
  start_at: number
  max_results: number
  issues: McpIssue[]
}

export interface JiraFeature {
  id: string
  key: string
  summary: string
  status: { name: string; category: string }
  scopingStatus: string | null
  targetGARelease: string | null
  uncommittedReview: string | null
  url: string
}

export function transformIssue(raw: McpIssue): JiraFeature {
  const releaseRaw = raw.customfield_16006?.value ?? null
  const targetGARelease = releaseRaw ? releaseRaw.replace(/\*/g, '').trim() : null

  return {
    id: raw.id,
    key: raw.key,
    summary: raw.summary,
    status: {
      name: raw.status.name,
      category: raw.status.category,
    },
    scopingStatus: raw.customfield_22800?.value ?? null,
    targetGARelease,
    uncommittedReview: raw.customfield_28300?.value ?? null,
    url: `${JIRA_BASE_URL}/browse/${raw.key}`,
  }
}

export async function searchFeatures(): Promise<JiraFeature[]> {
  const client = await getClient()

  const result = await client.callTool({
    name: 'jira_search',
    arguments: {
      jql: 'cf[17211] = "mmilea" ORDER BY cf[16006] ASC',
      fields: 'summary,status,customfield_22800,customfield_16006,customfield_28300,customfield_17211',
      limit: 50,
    },
  })

  const textItem = (result.content as Array<{ type: string; text?: string }>)
    .find((c) => c.type === 'text')

  if (!textItem?.text) throw new Error('Unexpected MCP response format')

  // Surface raw MCP error text before attempting JSON parse
  let data: McpSearchResult
  try {
    data = JSON.parse(textItem.text) as McpSearchResult
  } catch {
    throw new Error(`MCP tool error: ${textItem.text.slice(0, 300)}`)
  }
  return data.issues.map(transformIssue)
}
