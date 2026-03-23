import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { contextBridge, ipcRenderer } = require('electron') as typeof import('electron')

const api = {
  getWindowState: () =>
    ipcRenderer.invoke('window:get-state') as Promise<{
      alwaysOnTop: boolean
      clickThrough: boolean
      opacity: number
    }>,
  setAlwaysOnTop: (enabled: boolean) =>
    ipcRenderer.invoke('window:set-always-on-top', enabled) as Promise<void>,
  setClickThrough: (enabled: boolean) =>
    ipcRenderer.invoke('window:set-click-through', enabled) as Promise<void>,
  setOpacity: (opacity: number) =>
    ipcRenderer.invoke('window:set-opacity', opacity) as Promise<void>,
  saveProject: (content: string, suggestedPath?: string) =>
    ipcRenderer.invoke('project:save', {
      content,
      suggestedPath,
    }) as Promise<{ filePath: string } | null>,
  loadProject: () =>
    ipcRenderer.invoke('project:load') as Promise<
      | {
          filePath: string
          content: string
        }
      | null
    >,
}

contextBridge.exposeInMainWorld('heightReference', api)
