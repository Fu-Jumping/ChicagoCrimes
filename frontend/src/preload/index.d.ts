import { ElectronAPI } from '@electron-toolkit/preload'

export interface SetupStoreSnapshot {
  setupCompleted: boolean
  lastCsvPath: string
}

export interface ChicagoCrimeApi {
  selectCsvFile: () => Promise<{ canceled: boolean; path: string | null; size: number | null }>
  getSetupStore: () => Promise<SetupStoreSnapshot>
  setSetupStore: (patch: Partial<{ setupCompleted: boolean; lastCsvPath: string }>) => Promise<void>
}

declare global {
  interface Window {
    electron: ElectronAPI & {
      ipcRenderer: {
        send(channel: string, ...args: unknown[]): void
        on(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void
      }
    }
    api: ChicagoCrimeApi
  }
}
