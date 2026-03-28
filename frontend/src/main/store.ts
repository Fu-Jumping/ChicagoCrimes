import Store from 'electron-store'

export interface SetupStoreSchema {
  setupCompleted: boolean
  lastCsvPath: string
}

export const setupStore = new Store<SetupStoreSchema>({
  name: 'chicago-crime-setup',
  defaults: {
    setupCompleted: false,
    lastCsvPath: ''
  }
})
