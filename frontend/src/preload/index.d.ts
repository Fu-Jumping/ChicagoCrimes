import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI & {
      ipcRenderer: {
        send(channel: string, ...args: unknown[]): void
        on(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void
      }
    }
    api: unknown
  }
}
