---
name: electron-development
description: Best practices for Electron + Vite + React development, IPC communication, and process separation
---

# Electron Development Best Practices

## Overview

Guidelines for developing Electron applications with React, focusing on security, performance, and proper architecture.

## When to Use

- Creating new Electron windows or processes
- Implementing IPC communication
- Adding native functionality
- Debugging Electron-specific issues
- Packaging and distribution

## Architecture Principles

### Process Separation

**Main Process** (`electron/main.ts`):
- Window lifecycle management
- Native OS integration
- File system access
- Database operations
- Auto-updates

**Renderer Process** (React app):
- UI rendering
- User interactions
- State management
- NO direct Node.js access

**Preload Script** (`electron/preload.ts`):
- Bridge between main and renderer
- Expose safe APIs via contextBridge
- Type-safe IPC definitions

### Security Rules

<CRITICAL>
NEVER expose Node.js or Electron APIs directly to renderer process.
ALWAYS use contextBridge in preload scripts.
</CRITICAL>

## IPC Communication Pattern

### 1. Define Type-Safe API

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  // Read operation
  getData: () => ipcRenderer.invoke('db:read'),
  
  // Write operation
  saveData: (data: any) => ipcRenderer.invoke('db:write', data),
  
  // Event listener
  onUpdate: (callback: (data: any) => void) => {
    ipcRenderer.on('data-updated', (_event, data) => callback(data));
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
```

### 2. Implement Main Process Handler

```typescript
// electron/main.ts
import { ipcMain } from 'electron';

ipcMain.handle('db:read', async () => {
  // Perform operation
  return data;
});

ipcMain.handle('db:write', async (_event, data) => {
  // Validate and save
  return result;
});

// Send events to renderer
mainWindow.webContents.send('data-updated', newData);
```

### 3. Use in React Components

```typescript
// src/components/MyComponent.tsx
useEffect(() => {
  const fetchData = async () => {
    const data = await window.electronAPI.getData();
    setData(data);
  };
  
  fetchData();
  
  // Listen for updates
  window.electronAPI.onUpdate((newData) => {
    setData(newData);
  });
}, []);
```

## Common Patterns

### Database Access

```typescript
// electron/db.ts - Main process only
import { JSONFilePreset } from 'lowdb/node';

let db: Low<DBData>;

export const setupDB = async () => {
  const dbPath = path.join(app.getPath('userData'), 'db.json');
  db = await JSONFilePreset<DBData>(dbPath, defaultData);
  
  ipcMain.handle('db:read', () => db.data);
  ipcMain.handle('db:write', async (_, data) => {
    db.data = { ...db.data, ...data };
    await db.write();
    return db.data;
  });
};
```

### Window Management

```typescript
// electron/main.ts
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,  // CRITICAL: Keep false
      contextIsolation: true,   // CRITICAL: Keep true
      sandbox: true             // Recommended
    }
  });
  
  // Load app
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile('dist/index.html');
  }
}
```

### Native Dialogs

```typescript
// electron/main.ts
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'png', 'gif'] }
    ]
  });
  
  if (!result.canceled) {
    return result.filePaths[0];
  }
  return null;
});
```

## Vite Integration

### Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';

export default defineConfig({
  plugins: [
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron'
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        }
      }
    ])
  ]
});
```

### Hot Reload

- Renderer auto-reloads via Vite HMR
- Main process restarts on file change
- Preload script triggers window reload

## Common Issues

### ESM vs CommonJS

**Problem**: lowdb and other ESM-only packages

**Solution**:
```json
// package.json
{
  "type": "module"
}
```

```typescript
// Use import, not require
import { JSONFilePreset } from 'lowdb/node';
```

### Path Resolution

**Problem**: Different paths in dev vs production

**Solution**:
```typescript
// Use app.getPath for user data
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'db.json');

// Use __dirname for bundled resources
const iconPath = path.join(__dirname, '../build/icon.ico');
```

### TypeScript Types

```typescript
// src/global.d.ts
interface Window {
  electronAPI: {
    getData: () => Promise<any>;
    saveData: (data: any) => Promise<any>;
    onUpdate: (callback: (data: any) => void) => void;
  };
}
```

## Testing

### Main Process Tests

```typescript
// electron/db.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { setupDB } from './db';

describe('Database', () => {
  beforeEach(async () => {
    // Setup test database
  });
  
  it('should read data', async () => {
    const data = await db.read();
    expect(data).toBeDefined();
  });
});
```

### IPC Mocking in React Tests

```typescript
// src/components/MyComponent.test.tsx
beforeEach(() => {
  window.electronAPI = {
    getData: vi.fn().mockResolvedValue(mockData),
    saveData: vi.fn().mockResolvedValue(true),
    onUpdate: vi.fn()
  };
});
```

## Debugging

### Main Process

```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Electron Main",
  "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
  "args": [".", "--remote-debugging-port=9223"]
}
```

### Renderer Process

- Use Chrome DevTools (auto-opens in dev)
- `Ctrl+Shift+I` to toggle DevTools
- React DevTools available

### IPC Communication

```typescript
// Add logging
ipcMain.handle('db:read', async () => {
  console.log('[IPC] db:read called');
  const data = await db.read();
  console.log('[IPC] db:read result:', data);
  return data;
});
```

## Packaging

### electron-builder Configuration

```json
// package.json
{
  "build": {
    "appId": "com.yourapp.app",
    "files": [
      "dist-electron/**/*",
      "dist/**/*"
    ],
    "extraResources": [
      {
        "from": "build/icon.ico",
        "to": "icon.ico"
      }
    ],
    "win": {
      "icon": "build/icon.ico",
      "target": ["nsis"]
    }
  }
}
```

### Build Process

```bash
# 1. Build renderer (Vite)
npm run build

# 2. Build main process (TypeScript)
tsc -b

# 3. Package (electron-builder)
electron-builder
```

## Performance Optimization

### Lazy Loading

```typescript
// Lazy load heavy modules in main process
ipcMain.handle('heavy-operation', async () => {
  const { heavyModule } = await import('./heavy-module');
  return heavyModule.process();
});
```

### Window Optimization

```typescript
new BrowserWindow({
  show: false,  // Don't show until ready
  backgroundColor: '#ffffff'  // Prevent white flash
});

mainWindow.once('ready-to-show', () => {
  mainWindow.show();
});
```

### Memory Management

```typescript
// Clean up on window close
mainWindow.on('closed', () => {
  mainWindow = null;
  // Clean up resources
});
```

## Security Checklist

- [ ] `nodeIntegration: false` in webPreferences
- [ ] `contextIsolation: true` in webPreferences
- [ ] All APIs exposed via contextBridge
- [ ] Input validation in IPC handlers
- [ ] CSP headers configured
- [ ] No eval() or Function() in renderer
- [ ] Sanitize user input before file operations

## Anti-Patterns

### ❌ DON'T: Direct Node.js in Renderer

```typescript
// BAD - Security risk
const fs = require('fs');
fs.readFileSync('/etc/passwd');
```

### ✅ DO: Use IPC

```typescript
// GOOD - Safe
const data = await window.electronAPI.readFile('/safe/path');
```

### ❌ DON'T: Expose Entire Modules

```typescript
// BAD
contextBridge.exposeInMainWorld('fs', require('fs'));
```

### ✅ DO: Expose Specific Functions

```typescript
// GOOD
contextBridge.exposeInMainWorld('fileAPI', {
  readFile: (path: string) => ipcRenderer.invoke('file:read', path)
});
```

## Resources

- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
- [IPC Tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [Vite Plugin Electron](https://github.com/electron-vite/vite-plugin-electron)

## Verification Checklist

Before completing Electron-related work:

- [ ] All IPC channels have type definitions
- [ ] No Node.js APIs exposed directly to renderer
- [ ] Security settings verified (contextIsolation, nodeIntegration)
- [ ] Paths use app.getPath() for user data
- [ ] Error handling in all IPC handlers
- [ ] Tests cover IPC communication
- [ ] DevTools disabled in production build
- [ ] Resources cleaned up on window close
