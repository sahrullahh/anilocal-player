import { BrowserWindow, ipcMain, nativeTheme } from 'electron'

/** Colours the renderer sends whenever the app theme changes. */
export type TitleBarColors = {
  /** Title bar background. */
  color: string
  /** Minimize / maximize / close glyph colour. */
  symbolColor: string
  /** `true` when the active theme is a dark one, used for the native theme source. */
  dark: boolean
}

export function registerWindowIpc(): void {
  ipcMain.handle('window:close', () => {
    BrowserWindow.getAllWindows()[0]?.close()
  })

  ipcMain.handle('window:setTitleBarColors', (_, colors: TitleBarColors) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return

    // Keeps native menus, dialogs and scrollbars in step with the app theme.
    nativeTheme.themeSource = colors.dark ? 'dark' : 'light'

    // Windows-only API. The window background is repainted too, so resizing
    // never flashes the previous colour.
    if (process.platform === 'win32') {
      try {
        win.setTitleBarOverlay({
          color: colors.color,
          symbolColor: colors.symbolColor,
          height: 36
        })
      } catch {
        // Older Windows builds may not support the overlay; the app still runs.
      }
    }
    win.setBackgroundColor(colors.color)
  })
}
