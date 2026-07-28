import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

/** Shared with the renderer's TitleBar so the drag strip lines up with the
 *  native window buttons exactly. */
export const TITLE_BAR_HEIGHT = 36

export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#020617',
    // Hide the OS-drawn title bar but keep the native minimize / maximize /
    // close buttons, drawn as an overlay whose colours we control. The
    // renderer repaints them through `window:setTitleBarColors` on every theme
    // change, so the top strip stops being the one part that ignores the theme.
    titleBarStyle: 'hidden',
    ...(process.platform === 'win32'
      ? {
          titleBarOverlay: {
            color: '#111827',
            symbolColor: '#d1d5db',
            height: TITLE_BAR_HEIGHT
          }
        }
      : {}),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Allow renderer (served from localhost in dev) to load file:// local media
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}
