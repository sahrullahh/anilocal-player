import { ipcMain } from 'electron'
import {
  discordRpcService,
  type DiscordActivityPayload
} from '../services/discord-rpc.service'

export function registerDiscordRpcIpc() {
  ipcMain.handle('discord:connect', async () => {
    return discordRpcService.connect()
  })

  ipcMain.handle('discord:updateActivity', async (_event, payload: DiscordActivityPayload) => {
    await discordRpcService.updateActivity(payload)
  })

  ipcMain.handle('discord:clearActivity', async () => {
    await discordRpcService.clearActivity()
  })

  ipcMain.handle('discord:disconnect', async () => {
    await discordRpcService.disconnect()
  })
}
