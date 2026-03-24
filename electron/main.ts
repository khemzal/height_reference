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
const startupLogPath = path.resolve(process.cwd(), 'electron-startup.log')

const devServerUrl = process.env.VITE_DEV_SERVER_URL

const writeStartupLog = async (message: string) => {
  const line = `[${new Date().toISOString()}] ${message}\n`
  await fs.appendFile(startupLogPath, line, 'utf8')
}

// Creates the single desktop window used by the current MVP.
const createWindow = async () => {
  await writeStartupLog('createWindow:begin')

  mainWindow = new BrowserWindow({
    x: 80,
    y: 80,
    width: 1540,
    height: 960,
    minWidth: 1200,
    minHeight: 760,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#07101ccc',
    title: 'Height Reference',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    void writeStartupLog('window:ready-to-show')

    if (!mainWindow) {
      return
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    mainWindow.setPosition(80, 80)
    mainWindow.show()
    mainWindow.moveTop()
    mainWindow.focus()
  })
  mainWindow.on('show', () => {
    void writeStartupLog('window:show')
  })
  mainWindow.on('closed', () => {
    void writeStartupLog('window:closed')
    mainWindow = null
  })

  mainWindow.setAlwaysOnTop(windowState.alwaysOnTop, 'screen-saver')
  mainWindow.setOpacity(windowState.opacity)
  mainWindow.webContents.on('did-fail-load', (_event, code, description, url) => {
    void writeStartupLog(`renderer:did-fail-load code=${code} description=${description} url=${url}`)
    console.error('[renderer] did-fail-load', { code, description, url })
  })
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    void writeStartupLog(`renderer:render-process-gone reason=${details.reason} exitCode=${details.exitCode}`)
    console.error('[renderer] render-process-gone', details)
  })
  mainWindow.webContents.on('did-finish-load', () => {
    void writeStartupLog('renderer:did-finish-load')
  })

  if (devServerUrl) {
    await writeStartupLog(`renderer:load-url ${devServerUrl}`)
    await mainWindow.loadURL(devServerUrl)
  } else {
    // Production build loads the renderer from the local dist folder via file://.
    const rendererPath = path.resolve(__dirname, '..', '..', 'dist', 'index.html')
    await writeStartupLog(`renderer:load-file ${rendererPath}`)
    await mainWindow.loadFile(
      rendererPath
    )
  }

  if (!mainWindow.isVisible()) {
    await writeStartupLog('window:show-fallback')
    mainWindow.show()
  }

  await writeStartupLog('createWindow:end')
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

app.whenReady()
  .then(async () => {
    await fs.writeFile(startupLogPath, '', 'utf8')
    await writeStartupLog('app:ready')
    registerIpc()
    registerShortcuts()
    await createWindow()

    app.on('activate', async () => {
      await writeStartupLog('app:activate')
      if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow()
      }
    })
  })
  .catch((error: unknown) => {
    void writeStartupLog(`app:start-failed ${String(error)}`)
    console.error('[main] failed to start application', error)
    app.exit(1)
  })

app.on('window-all-closed', () => {
  void writeStartupLog('app:window-all-closed')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  void writeStartupLog('app:will-quit')
  globalShortcut.unregisterAll()
})
