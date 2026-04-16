import { app, shell, BrowserWindow, ipcMain, dialog, type OpenDialogOptions } from 'electron'
import { join } from 'path'
import { spawn, type ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.ico?asset'
import { setupStore } from './store'

let backendProcess: ChildProcess | null = null
const APP_USER_MODEL_ID = 'com.chicago-crime.visualization'
const gotSingleInstanceLock = app.requestSingleInstanceLock()

function startBackend(): void {
  if (is.dev) return // dev mode: backend is started manually via `python start.py dev`

  // In the packaged installer, backend.exe is copied to resources/backend/ by electron-builder.
  // process.resourcesPath points to the <install_dir>/resources directory.
  const backendExe = join(process.resourcesPath, 'backend', 'backend.exe')

  if (!existsSync(backendExe)) {
    console.error(`[backend] backend.exe not found at ${backendExe}`)
    return
  }

  console.log(`[backend] launching ${backendExe}`)
  const proc = spawn(backendExe, [], {
    // Tell the backend where to write .env and logs (user-writable AppData)
    env: {
      ...process.env,
      CHICAGO_CRIME_DATA_DIR: app.getPath('userData')
    },
    stdio: 'pipe',
    windowsHide: true
  })
  backendProcess = proc
  proc.stdout?.on('data', (d) => console.log(`[backend] ${String(d).trim()}`))
  proc.stderr?.on('data', (d) => console.warn(`[backend] ${String(d).trim()}`))
  proc.on('exit', (code) => {
    console.warn(`[backend] process exited with code ${code}`)
    backendProcess = null
  })
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  ipcMain.on('window-minimize', () => {
    mainWindow.minimize()
  })
  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })
  ipcMain.on('window-close', () => {
    mainWindow.close()
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (!mainWindow) {
      return
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.focus()
  })

  app.whenReady().then(() => {
    startBackend()

    electronApp.setAppUserModelId(APP_USER_MODEL_ID)

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    ipcMain.on('ping', () => console.log('pong'))

    ipcMain.handle('select-csv-file', async () => {
      const win = BrowserWindow.getFocusedWindow()
      const dialogOptions: OpenDialogOptions = {
        title: '选择 crimes CSV 数据文件',
        properties: ['openFile'],
        filters: [{ name: 'CSV', extensions: ['csv'] }]
      }
      const { canceled, filePaths } = win
        ? await dialog.showOpenDialog(win, dialogOptions)
        : await dialog.showOpenDialog(dialogOptions)
      const filePath = filePaths[0] ?? null
      let size: number | null = null
      if (filePath) {
        try {
          const fs = await import('fs/promises')
          const stat = await fs.stat(filePath)
          size = stat.size
        } catch {}
      }
      return { canceled, path: filePath, size }
    })

    ipcMain.handle('setup-store-get', () => ({
      setupCompleted: setupStore.get('setupCompleted'),
      lastCsvPath: setupStore.get('lastCsvPath')
    }))

    ipcMain.handle(
      'setup-store-set',
      (_event, patch: Partial<{ setupCompleted: boolean; lastCsvPath: string }>): void => {
        if (typeof patch.setupCompleted === 'boolean') {
          setupStore.set('setupCompleted', patch.setupCompleted)
        }
        if (typeof patch.lastCsvPath === 'string') {
          setupStore.set('lastCsvPath', patch.lastCsvPath)
        }
      }
    )

    createWindow()

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (backendProcess && backendProcess.exitCode === null) {
    backendProcess.kill()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
