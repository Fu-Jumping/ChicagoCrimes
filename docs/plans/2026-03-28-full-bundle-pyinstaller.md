# 全量打包（PyInstaller + Electron）实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 Python 后端用 PyInstaller 打包成独立 `backend.exe`，嵌入 Electron 资源目录，Electron 启动时自动拉起，同学只需双击安装包即可使用，无需安装 Python。

**Architecture:**
1. PyInstaller 把 `backend/main.py` + 所有依赖（fastapi、uvicorn、pymysql、sqlalchemy 等）+ `backend/sql/` 文件打成单目录（`--onedir`）可执行文件。
2. 将产物目录 `backend/dist/backend/` 作为 Electron extraResources 嵌入安装包。
3. Electron 主进程在生产模式下直接 spawn `resources/backend/backend.exe`，不再需要 Python 或项目源码。
4. `SetupGate` 的"后端未运行"错误屏幕只在极少数边缘情况下出现（比如 backend.exe 崩溃）。

**Tech Stack:** PyInstaller 6.x, electron-builder extraResources, Node.js child_process, Windows x64

---

## Task 1：安装 PyInstaller 并验证能跑通

**Files:**
- Modify: `backend/requirements.txt`（不需要改，PyInstaller 只用于构建，不进运行时依赖）
- Create: `backend/build_backend.spec`（PyInstaller spec 文件）

**Step 1：安装 PyInstaller**

在项目根目录执行（使用项目 .venv）：
```powershell
.venv\Scripts\pip.exe install pyinstaller
```
预期输出：`Successfully installed pyinstaller-6.x.x`

**Step 2：验证 PyInstaller 可用**

```powershell
.venv\Scripts\pyinstaller.exe --version
```
预期输出：`6.x.x`

---

## Task 2：创建 PyInstaller spec 文件

**Files:**
- Create: `backend/backend.spec`

**Step 1：创建 spec 文件**

```python
# backend/backend.spec
# -*- mode: python ; coding: utf-8 -*-
import sys
from pathlib import Path

block_cipher = None
backend_dir = Path(SPECPATH)   # SPECPATH = 包含此 .spec 文件的目录，即 backend/

a = Analysis(
    [str(backend_dir / 'main.py')],
    pathex=[str(backend_dir)],
    binaries=[],
    datas=[
        # 把 sql/ 目录全部打包进去（rebuild_layered_summaries.sql 等在运行时被读取）
        (str(backend_dir / 'sql'), 'sql'),
    ],
    hiddenimports=[
        # uvicorn 动态导入的模块
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.loops.asyncio',
        'uvicorn.loops.uvloop',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.http.httptools_impl',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.protocols.websockets.websockets_impl',
        'uvicorn.protocols.websockets.wsproto_impl',
        'uvicorn.lifespan',
        'uvicorn.lifespan.off',
        'uvicorn.lifespan.on',
        # pymysql cursors
        'pymysql.cursors',
        # pydantic v2
        'pydantic.v1',
        'pydantic_core',
        # anyio backends
        'anyio._backends._asyncio',
        'anyio._backends._trio',
        # app 内部模块（防止动态导入被遗漏）
        'app.routers.analytics',
        'app.routers.setup',
        'app.services.analytics',
        'app.services.setup_service',
        'app.models.crime',
        'app.schemas.crime',
        'app.config.env_file',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,      # 不弹黑色 cmd 窗口
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='backend',
)
```

**Step 2：解决 PyInstaller 打包后 `__file__` 路径问题**

PyInstaller 打包后运行时，`__file__` 不再指向源代码目录，而是指向 `sys._MEIPASS`（临时解压目录）或 exe 所在目录。
`backend/app/config/env_file.py` 中的 `repo_root()` 使用 `Path(__file__).resolve().parents[3]`，打包后这个路径会是错误的。

需要修改 `env_file.py` 的 `repo_root()` 和 `setup_service.py` 中 `ROOT` 的逻辑，打包后改为使用 exe 同级目录（`.env` 文件应放在 exe 旁边）：

修改 `backend/app/config/env_file.py`：

```python
"""Merge key/value pairs into the repository-root .env file."""

from __future__ import annotations

import sys
from pathlib import Path


def repo_root() -> Path:
    """
    Project root (parent of ``backend``).
    - Development: 4 levels up from this file (backend/app/config/env_file.py)
    - PyInstaller bundle: directory containing the backend.exe
    """
    if getattr(sys, 'frozen', False):
        # Running inside PyInstaller bundle: exe is at <root>/backend.exe
        # We use the directory that contains the exe as the "root"
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parents[3]
```

**Step 3：修改 `setup_service.py` 中的 `ROOT` 和 `BACKEND_DIR`**

`setup_service.py` 中有：
```python
ROOT = repo_root()
BACKEND_DIR = ROOT / "backend"
```

打包后没有独立的 `backend/` 子目录，SQL 文件在 PyInstaller 的 `_MEIPASS` 里。需要调整：

修改 `backend/app/services/setup_service.py` 顶部的 `BACKEND_DIR`：

```python
import sys as _sys

ROOT = repo_root()

# In PyInstaller bundle, _MEIPASS contains unpacked data (including sql/).
# In development, sql/ is under backend/.
if getattr(_sys, 'frozen', False):
    BACKEND_DIR = Path(_sys._MEIPASS)
else:
    BACKEND_DIR = ROOT / "backend"

LOG_DIR = ROOT / "logs"
SETUP_LOG = LOG_DIR / "setup.log"
```

---

## Task 3：构建 PyInstaller 产物并验证

**Step 1：执行 PyInstaller 构建**

```powershell
cd "G:/source/资料-MySQL数据库/school/实践/backend"
..\\.venv\\Scripts\\pyinstaller.exe backend.spec --distpath dist --workpath build --noconfirm
```

预期：`dist/backend/backend.exe` 生成，大约 80-150MB。

**Step 2：冒烟测试打包后的 exe**

```powershell
cd "G:/source/资料-MySQL数据库/school/实践/backend/dist/backend"
.\\backend.exe
```

预期控制台输出：
```
INFO:     Started server process [xxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

用浏览器或 curl 访问 `http://127.0.0.1:8000/api/setup/status`，预期返回 JSON。

**Step 3：验证 sql/ 文件打包进去了**

检查 `dist/backend/_internal/sql/rebuild_layered_summaries.sql` 是否存在（PyInstaller 6.x 的 datas 放在 `_internal/` 下）。

---

## Task 4：修改 Electron 主进程使用打包后的 exe

**Files:**
- Modify: `frontend/src/main/index.ts`

**当前问题：**
`startBackend()` 现在尝试找项目根目录然后用 Python 启动 uvicorn。打包后应改为直接找 `resources/backend/backend.exe`。

**修改后的 `startBackend()` 逻辑：**

```typescript
function startBackend(): void {
  if (is.dev) return  // dev 模式：后端由 start.py dev 手动启动

  // In production, backend.exe is in resources/backend/backend.exe
  // process.resourcesPath = <install_dir>/resources
  const backendExe = join(process.resourcesPath, 'backend', 'backend.exe')

  if (!existsSync(backendExe)) {
    console.error(`[backend] backend.exe not found at ${backendExe}`)
    return
  }

  console.log(`[backend] starting ${backendExe}`)
  const proc = spawn(backendExe, [], {
    cwd: process.resourcesPath,
    stdio: 'pipe',
    windowsHide: true,
    env: {
      ...process.env,
      // 告知后端 exe 的数据目录（.env 文件写在这里）
      CHICAGO_CRIME_DATA_DIR: process.resourcesPath,
    }
  })
  backendProcess = proc
  proc.stdout?.on('data', (d) => console.log(`[backend] ${String(d).trim()}`))
  proc.stderr?.on('data', (d) => console.warn(`[backend] ${String(d).trim()}`))
  proc.on('exit', (code) => {
    console.warn(`[backend] process exited with code ${code}`)
    backendProcess = null
  })
}
```

**同时移除**不再需要的 `findProjectRoot()` 和 `findPython()` 函数（或留着开发模式用）。

---

## Task 5：修改 env_file.py 支持数据目录环境变量

**Files:**
- Modify: `backend/app/config/env_file.py`

打包后 `repo_root()` 应返回可写目录（如 `%APPDATA%/ChicagoCrimeViz` 或 `resources/`），而不是只读的 exe 目录。`.env` 文件需要存储在用户可写的位置。

```python
def repo_root() -> Path:
    """
    Returns the directory where .env and logs/ should be stored.
    - Development: 4 levels up from this file (the git repo root)
    - PyInstaller bundle: env var CHICAGO_CRIME_DATA_DIR, or %APPDATA%/ChicagoCrimeViz as fallback
    """
    if getattr(sys, 'frozen', False):
        data_dir = os.environ.get('CHICAGO_CRIME_DATA_DIR')
        if data_dir:
            p = Path(data_dir)
        else:
            # Fallback: use AppData/Roaming/ChicagoCrimeViz
            appdata = Path(os.environ.get('APPDATA', Path.home()))
            p = appdata / 'ChicagoCrimeViz'
        p.mkdir(parents=True, exist_ok=True)
        return p
    return Path(__file__).resolve().parents[3]
```

---

## Task 6：配置 electron-builder extraResources

**Files:**
- Modify: `frontend/electron-builder.yml`

在 `files` 之后添加 `extraResources`，把 PyInstaller 产物目录打包进安装包：

```yaml
extraResources:
  - from: '../backend/dist/backend'
    to: 'backend'
    filter:
      - '**/*'
```

这会把 `backend/dist/backend/` 的全部内容复制到安装包的 `resources/backend/`，即 `process.resourcesPath/backend/backend.exe`。

---

## Task 7：创建构建脚本（一键全量打包）

**Files:**
- Create: `scripts/build_all.ps1`（Windows PowerShell）

```powershell
# scripts/build_all.ps1
# 全量打包脚本：PyInstaller 后端 + Electron 前端
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$VenvPy = Join-Path $ProjectRoot '.venv\Scripts\python.exe'
$VenvPip = Join-Path $ProjectRoot '.venv\Scripts\pip.exe'
$PyInstaller = Join-Path $ProjectRoot '.venv\Scripts\pyinstaller.exe'
$BackendDir = Join-Path $ProjectRoot 'backend'
$FrontendDir = Join-Path $ProjectRoot 'frontend'

Write-Host "=== Step 1: 确认 PyInstaller 已安装 ===" -ForegroundColor Cyan
if (-not (Test-Path $PyInstaller)) {
    Write-Host "安装 PyInstaller..."
    & $VenvPip install pyinstaller
}
& $PyInstaller --version

Write-Host "=== Step 2: 构建 Python 后端 (PyInstaller) ===" -ForegroundColor Cyan
Push-Location $BackendDir
& $PyInstaller backend.spec --distpath dist --workpath build --noconfirm
Pop-Location

$BackendExe = Join-Path $BackendDir 'dist\backend\backend.exe'
if (-not (Test-Path $BackendExe)) {
    Write-Error "PyInstaller 构建失败：未找到 $BackendExe"
    exit 1
}
Write-Host "后端 exe 构建成功: $BackendExe" -ForegroundColor Green

Write-Host "=== Step 3: 构建 Electron 前端 + 打包安装程序 ===" -ForegroundColor Cyan
Push-Location $FrontendDir
npm run build:win
Pop-Location

Write-Host "=== 全量打包完成 ===" -ForegroundColor Green
Write-Host "安装包位置: $FrontendDir\dist\frontend-1.0.0-setup.exe"
```

**测试运行：**
```powershell
.\scripts\build_all.ps1
```

---

## Task 8：端到端验证

**Step 1：在测试环境（不运行 Python 后端）验证安装包**

1. 运行 `frontend/dist/frontend-1.0.0-setup.exe` 安装
2. 打开应用，等待 `SetupGate` 加载（约 5-10 秒，因为 backend.exe 冷启动）
3. 确认进入向导，而非显示"后端未运行"错误屏幕
4. 在向导中完成 MySQL 配置，测试连接，保存配置
5. 验证 `.env` 文件写入到 `%APPDATA%/ChicagoCrimeViz/.env`

**Step 2：验证数据导入**

1. 选择 CSV 文件，点开始导入
2. 确认进度条有实时更新（READ UNCOMMITTED 生效）
3. 导入完成后进行"构建汇总"步骤
4. 完成后进入主应用，所有图表正常渲染

**Step 3：验证重启持久化**

关闭应用重新打开，确认不再显示向导（`SetupGate` 正确识别已就绪）。

---

## 注意事项

### PyInstaller 常见坑

1. **`console=False` 会吞掉启动错误** —— 调试时先用 `console=True`，确认没问题再改回 `False`。
2. **hiddenimports 可能不全** —— 如果 exe 崩溃，检查日志 `%APPDATA%/ChicagoCrimeViz/logs/setup.log`，根据 ImportError 补充 hiddenimports。
3. **`_internal/` vs `_MEIPASS`** —— PyInstaller 6.x onedir 模式，datas 放在 `dist/backend/_internal/`，运行时 `sys._MEIPASS` 指向这个目录。
4. **pymysql 的 `__version__` 动态导入** —— 已通过 `hiddenimports=['pymysql.cursors']` 处理。

### .env 文件位置变化

打包后 `.env` 文件从项目根目录改为写入 `%APPDATA%/ChicagoCrimeViz/.env`。
`database.py` 中的 `load_dotenv(_REPO_ROOT / ".env")` 需要同步更新：

```python
# backend/app/database.py 顶部
from app.config.env_file import repo_root as _get_root
_REPO_ROOT = _get_root()
load_dotenv(_REPO_ROOT / ".env")
```

### 构建产物大小预估

| 组件 | 大小 |
|------|------|
| backend.exe（PyInstaller onedir） | ~90-150 MB |
| Electron 前端 | ~211 MB |
| 安装包（NSIS 压缩后） | ~150-250 MB |
| **总计安装包** | **约 200-300 MB** |

这是将 Python 运行时、所有依赖库、FastAPI、uvicorn 全部打包的代价，对于学校项目完全可接受。
