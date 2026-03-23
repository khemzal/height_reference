import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Electron main process stays in ESM, but Electron itself is loaded through createRequire.
const require = createRequire(import.meta.url)
const { app, BrowserWindow, dialog, globalShortcut, ipcMain } = require('electron') as typeof import('electron')
const fs = require('node:fs/promises') as typeof import('node:fs/promises')

type BrowserWindowInstance = InstanceType<typeof BrowserWindow>

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

type WindowState = {
  alwaysOnTop: boolean
  clickThrough: boolean
  opacity: number
}

const defaultWindowState: WindowState = {
  alwaysOnTop: true,
  clickThrough: false,
  opacity: 0.96,
}

let mainWindow: BrowserWindowInstance | null = null
const windowState = { ...defaultWindowState }
const defaultProjectFileName = 'height-reference-project.hrp'

const devServerUrl = process.env.VITE_DEV_SERVER_URL

// Creates the single desktop window used by the current MVP.
const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1540,
    height: 960,
    minWidth: 1200,
    minHeight: 760,
    autoHideMenuBar: true,
    backgroundColor: '#07101ccc',
    title: 'Height Reference',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.setAlwaysOnTop(windowState.alwaysOnTop, 'screen-saver')
  mainWindow.setOpacity(windowState.opacity)
  mainWindow.webContents.on('did-fail-load', (_event, code, description, url) => {
    console.error('[renderer] did-fail-load', { code, description, url })
  })
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[renderer] render-process-gone', details)
  })

  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl)
  } else {
    // Production build loads the renderer from the local dist folder via file://.
    await mainWindow.loadFile(
      path.resolve(__dirname, '..', '..', 'dist', 'index.html')
    )
  }
}

// Click-through mode lets the overlay stay visible while forwarding mouse input to apps underneath.
const applyClickThrough = (enabled: boolean) => {
  if (!mainWindow) {
    return
  }

  windowState.clickThrough = enabled
  mainWindow.setIgnoreMouseEvents(enabled, { forward: true })
  mainWindow.setFocusable(!enabled)

  if (!enabled) {
    mainWindow.focus()
  }
}

// IPC handlers expose only the small desktop API surface needed by the renderer.
const registerIpc = () => {
  ipcMain.handle('window:get-state', () => windowState)
  ipcMain.handle('window:set-always-on-top', (_event, enabled: boolean) => {
    windowState.alwaysOnTop = enabled
    mainWindow?.setAlwaysOnTop(enabled, 'screen-saver')
    return windowState
  })
  ipcMain.handle('window:set-click-through', (_event, enabled: boolean) => {
    applyClickThrough(enabled)
    return windowState
  })
  ipcMain.handle('window:set-opacity', (_event, nextOpacity: number) => {
    const opacity = Math.min(Math.max(nextOpacity, 0.35), 1)
    windowState.opacity = opacity
    mainWindow?.setOpacity(opacity)
    return windowState
  })
  ipcMain.handle(
    'project:save',
    async (_event, payload: { suggestedPath?: string; content: string }) => {
      if (!mainWindow) {
        throw new Error('Hlavní okno není připravené.')
      }

      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Uložit projekt',
        defaultPath: payload.suggestedPath ?? defaultProjectFileName,
        filters: [{ name: 'Height Reference Project', extensions: ['hrp'] }],
      })

      if (canceled || !filePath) {
        return null
      }

      await fs.writeFile(filePath, payload.content, 'utf8')
      return { filePath }
    }
  )
  ipcMain.handle('project:load', async () => {
    if (!mainWindow) {
      throw new Error('Hlavní okno není připravené.')
    }

    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Načíst projekt',
      properties: ['openFile'],
      filters: [
        { name: 'Height Reference Project', extensions: ['hrp'] },
        { name: 'JSON files', extensions: ['json'] },
      ],
    })

    if (canceled || filePaths.length === 0) {
      return null
    }

    const filePath = filePaths[0]
    const content = await fs.readFile(filePath, 'utf8')
    return { filePath, content }
  })
}

// Global shortcuts are registered in the main process so they work even when the window is unfocused.
const registerShortcuts = () => {
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    applyClickThrough(!windowState.clickThrough)
  })

  globalShortcut.register('CommandOrControl+Shift+O', () => {
    windowState.alwaysOnTop = !windowState.alwaysOnTop
    mainWindow?.setAlwaysOnTop(windowState.alwaysOnTop, 'screen-saver')
  })
}

app.whenReady().then(async () => {
  registerIpc()
  registerShortcuts()
  await createWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
