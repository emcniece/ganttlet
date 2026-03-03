import { createApp } from './app.js'
import { config } from './config.js'

const app = createApp()

app.listen(config.port, () => {
  console.log(`Ganttlet backend running on port ${config.port}`)
  console.log(`Environment: ${config.nodeEnv}`)
  if (config.hasGoogleOAuth) console.log('Google OAuth: enabled')
  if (config.hasGithubOAuth) console.log('GitHub OAuth: enabled')
  if (config.staticDir) console.log(`Serving frontend from: ${config.staticDir}`)
})
