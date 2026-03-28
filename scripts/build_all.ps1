# scripts/build_all.ps1
# 全量打包脚本：PyInstaller 后端 + Electron 前端（含安装包）
# 用法：在项目根目录执行  .\scripts\build_all.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
$VenvPip = Join-Path $ProjectRoot '.venv\Scripts\pip.exe'
$PyInstaller = Join-Path $ProjectRoot '.venv\Scripts\pyinstaller.exe'
$BackendDir = Join-Path $ProjectRoot 'backend'
$FrontendDir = Join-Path $ProjectRoot 'frontend'
$BackendExe = Join-Path $BackendDir 'dist\backend\backend.exe'

Write-Host "=== [1/3] 确保 PyInstaller 已安装 ===" -ForegroundColor Cyan
if (-not (Test-Path $PyInstaller)) {
    Write-Host "  安装 PyInstaller..."
    & $VenvPip install pyinstaller
}
$ver = & $PyInstaller --version 2>&1
Write-Host "  PyInstaller 版本: $ver" -ForegroundColor Green

Write-Host "=== [2/3] 构建 Python 后端 (PyInstaller) ===" -ForegroundColor Cyan
Push-Location $BackendDir
& $PyInstaller backend.spec --distpath dist --workpath build --noconfirm
Pop-Location

if (-not (Test-Path $BackendExe)) {
    Write-Host "PyInstaller 构建失败：未找到 $BackendExe" -ForegroundColor Red
    exit 1
}
$exeSize = [math]::Round((Get-Item $BackendExe).Length / 1MB, 1)
Write-Host "  后端 exe 构建成功 (backend.exe = $exeSize MB)" -ForegroundColor Green

Write-Host "=== [3/3] 构建 Electron 前端 + 打包安装程序 ===" -ForegroundColor Cyan
Push-Location $FrontendDir
npm run build:win
Pop-Location

$Installer = Get-ChildItem (Join-Path $FrontendDir 'dist') -Filter '*-setup.exe' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($Installer) {
    $installerSize = [math]::Round($Installer.Length / 1MB, 1)
    Write-Host ""
    Write-Host "=== 全量打包完成 ===" -ForegroundColor Green
    Write-Host "  安装包: $($Installer.FullName)  ($installerSize MB)" -ForegroundColor Yellow
} else {
    Write-Host "警告：未找到安装包文件，请检查 frontend/dist/" -ForegroundColor Red
}
