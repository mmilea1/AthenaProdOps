import { Router } from 'express'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const router = Router()
const __dirname = dirname(fileURLToPath(import.meta.url))
const ENV_PATH = join(__dirname, '../../.env')

function readEnv(): Record<string, string> {
  const source = ENV_PATH
  const lines = readFileSync(source, 'utf8').split('\n')
  const result: Record<string, string> = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    result[trimmed.slice(0, idx)] = trimmed.slice(idx + 1)
  }
  return result
}

function writeEnv(values: Record<string, string>) {
  const content = Object.entries(values)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') + '\n'
  writeFileSync(ENV_PATH, content, 'utf8')
}

// GET /api/settings — return config with masked token
router.get('/settings', (_req, res) => {
  const env = readEnv()
  res.json({
    jiraBaseUrl: env.JIRA_BASE_URL ?? '',
    jiraUserEmail: env.JIRA_USER_EMAIL ?? '',
    hasToken: !!(env.JIRA_API_TOKEN ?? '').trim(),
    tokenPreview: env.JIRA_API_TOKEN
      ? `${env.JIRA_API_TOKEN.slice(0, 6)}${'•'.repeat(12)}`
      : '',
  })
})

// PUT /api/settings — update .env values
router.put('/settings', (req, res) => {
  const { jiraBaseUrl, jiraUserEmail, jiraApiToken } = req.body as {
    jiraBaseUrl?: string
    jiraUserEmail?: string
    jiraApiToken?: string
  }

  const env = readEnv()

  if (jiraBaseUrl !== undefined) env.JIRA_BASE_URL = jiraBaseUrl
  if (jiraUserEmail !== undefined) env.JIRA_USER_EMAIL = jiraUserEmail
  if (jiraApiToken !== undefined && jiraApiToken.trim() !== '') {
    env.JIRA_API_TOKEN = jiraApiToken.trim()
  }

  writeEnv(env)

  // Reload into process env so the running server picks up new values
  if (jiraBaseUrl !== undefined) process.env.JIRA_BASE_URL = jiraBaseUrl
  if (jiraUserEmail !== undefined) process.env.JIRA_USER_EMAIL = jiraUserEmail
  if (jiraApiToken !== undefined && jiraApiToken.trim() !== '') {
    process.env.JIRA_API_TOKEN = jiraApiToken.trim()
    process.env.JIRA_PERSONAL_TOKEN = jiraApiToken.trim()
  }

  res.json({ ok: true })
})

export default router
