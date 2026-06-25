import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import featuresRouter from './routes/features.js'
import settingsRouter from './routes/settings.js'
import goalsRouter from './routes/goals.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())
app.use('/api', featuresRouter)
app.use('/api', settingsRouter)
app.use('/api', goalsRouter)

if (process.env.NODE_ENV === 'production') {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const distPath = join(__dirname, '../dist')
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`athenaPM server running on http://localhost:${PORT}`)
})
