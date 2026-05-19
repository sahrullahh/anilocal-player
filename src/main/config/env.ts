import { config as loadEnv } from 'dotenv'
import { app } from 'electron'
import { dirname, join } from 'path'

const envCandidates = [
  join(process.cwd(), '.env'),
  join(app.getAppPath(), '.env'),
  join(process.resourcesPath, '.env'),
  join(dirname(process.execPath), '.env')
]

for (const envPath of envCandidates) {
  loadEnv({ path: envPath, override: false })
}

export const env = {
  discordClientId: process.env.DISCORD_CLIENT_ID ?? ''
}
