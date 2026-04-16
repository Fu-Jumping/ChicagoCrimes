import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export interface SetupStoreSnapshot {
  setupCompleted: boolean
  lastCsvPath: string
}

// Custom APIs for renderer
const api = {
  selectCsvFile: (): Promise<{ canceled: boolean; path: string | null; size: number | null }> =>
    ipcRenderer.invoke('select-csv-file'),
  getSetupStore: (): Promise<SetupStoreSnapshot> => ipcRenderer.invoke('setup-store-get'),
  setSetupStore: (
    patch: Partial<{ setupCompleted: boolean; lastCsvPath: string }>
  ): Promise<void> => ipcRenderer.invoke('setup-store-set', patch)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
