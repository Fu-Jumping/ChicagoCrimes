$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$tokenPath = Join-Path $env:USERPROFILE ".kaggle\kaggle.json"

if (-not (Test-Path $tokenPath)) {
  Write-Host "缺少 Kaggle Token 文件：$tokenPath"
  Write-Host "请在 Kaggle -> Account -> Create New API Token 生成 kaggle.json 并放到上述路径。"
  exit 1
}

$outDir = Join-Path $repoRoot "data\kaggle"
New-Item -ItemType Directory -Force $outDir | Out-Null

Write-Host "开始下载 Kaggle 数据集到：$outDir"
kaggle datasets download -d utkarshx27/crimes-2001-to-present -p $outDir --unzip

Write-Host "下载完成。请在 $outDir 中找到 CSV 文件并用于导入。"

