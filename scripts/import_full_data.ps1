param(
    [string]$Password = "qd1pXeYCa8TSrIwk8XdC3JnX8GbO"
)

$root    = Split-Path -Parent $PSScriptRoot   # scripts/ の親 = 实践/
$csv     = Join-Path $root "data\Crimes_-_2001_to_Present.csv"
$db      = "school_chicago_crime"
$user    = "school_app"
$host_   = "127.0.0.1"

# ── 1. 等待 CSV 下载完成 ─────────────────────────────────────────────────────
Write-Host "正在监控下载进度..."
$prevSize = -1
$stableCount = 0
while ($true) {
    if (-not (Test-Path $csv)) { Start-Sleep -Seconds 5; continue }
    $size = (Get-Item $csv).Length
    $mb   = [math]::Round($size / 1MB, 1)
    Write-Host "  已下载：${mb} MB"
    if ($size -eq $prevSize) {
        $stableCount++
        if ($stableCount -ge 3) { break }   # 连续 3 次大小不变 → 下载完成
    } else {
        $stableCount = 0
    }
    $prevSize = $size
    Start-Sleep -Seconds 20
}

$finalMB = [math]::Round((Get-Item $csv).Length / 1MB, 1)
Write-Host ""
Write-Host "下载完成！文件大小：${finalMB} MB"

# ── 2. 清空旧数据 ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "正在清空旧样本数据..."
mysql -h $host_ -P 3306 -u $user -p"$Password" $db -e "TRUNCATE TABLE crimes;" 2>&1 |
    Where-Object { $_ -notmatch "Warning.*insecure" }

# ── 3. 导入全量数据 ───────────────────────────────────────────────────────────
Write-Host ""
Write-Host "开始导入全量数据（约 770 万条，预计 15~30 分钟）..."
$start = Get-Date
$sqlContent = Get-Content (Join-Path $root "backend\sql\import_kaggle_crimes.sql") -Raw -Encoding UTF8
$sqlContent = $sqlContent -replace "LOAD DATA LOCAL INFILE 'data/Crimes_-_2001_to_Present.csv'",
    ("LOAD DATA LOCAL INFILE '" + ($csv -replace '\\','/') + "'")
$tmpSql = [System.IO.Path]::GetTempFileName() + ".sql"
[System.IO.File]::WriteAllText($tmpSql, $sqlContent, [System.Text.Encoding]::UTF8)

mysql --local-infile=1 -h $host_ -P 3306 -u $user -p"$Password" $db `
    --execute="SOURCE $tmpSql;" 2>&1 |
    Where-Object { $_ -notmatch "Warning.*insecure" }

Remove-Item $tmpSql -ErrorAction SilentlyContinue
$elapsed = [math]::Round(((Get-Date) - $start).TotalMinutes, 1)

# ── 4. 验证 ────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "导入完成，耗时 ${elapsed} 分钟。验证中..."
mysql -h $host_ -P 3306 -u $user -p"$Password" $db -e `
    "SELECT COUNT(*) AS total_rows, MIN(year) AS min_year, MAX(year) AS max_year FROM crimes;" 2>&1 |
    Where-Object { $_ -notmatch "Warning.*insecure" }
