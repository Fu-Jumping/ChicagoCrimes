param(
  [int]$Port = 3307,
  [string]$Database = "school_chicago_crime",
  [string]$User = "school_app",
  [string]$Password = "",
  [string]$ContainerName = "school-mysql-chicago"
)

$ErrorActionPreference = "Stop"

function New-RandomPassword([int]$length = 20) {
  $chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#%&*_-"
  -join (1..$length | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
}

if ([string]::IsNullOrWhiteSpace($Password)) {
  $Password = New-RandomPassword 22
}

$rootPassword = New-RandomPassword 24

Write-Host "将启动 MySQL 容器：$ContainerName"
Write-Host "映射端口：localhost:$Port -> container:3306"

docker rm -f $ContainerName 2>$null | Out-Null

docker run -d --name $ContainerName `
  -e "MYSQL_DATABASE=$Database" `
  -e "MYSQL_USER=$User" `
  -e "MYSQL_PASSWORD=$Password" `
  -e "MYSQL_ROOT_PASSWORD=$rootPassword" `
  -p "$Port`:3306" `
  -v "$ContainerName-data:/var/lib/mysql" `
  mysql:8.4 `
  --local-infile=1 `
  --character-set-server=utf8mb4 `
  --collation-server=utf8mb4_0900_ai_ci | Out-Null

Write-Host ""
Write-Host "请把以下内容写入仓库根目录 .env（注意不要提交到 git）："
Write-Host "MYSQL_USER=$User"
Write-Host "MYSQL_PASSWORD=$Password"
Write-Host "MYSQL_HOST=127.0.0.1"
Write-Host "MYSQL_PORT=$Port"
Write-Host "MYSQL_DATABASE=$Database"
Write-Host "BACKEND_HOST=0.0.0.0"
Write-Host "BACKEND_PORT=8000"
Write-Host "FRONTEND_DEV_PORT=5173"
Write-Host "CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173"
Write-Host ""
Write-Host "Root 密码（仅供容器内维护用）：$rootPassword"

