param(
  [string]$BaseUrl = "http://localhost:8000"
)

$ErrorActionPreference = "Stop"

function Assert-Ok($name, $condition) {
  if (-not $condition) {
    throw "Smoke test failed: $name"
  }
  Write-Host "[OK] $name"
}

$health = Invoke-RestMethod -Method GET -Uri "$BaseUrl/healthz" -TimeoutSec 15
Assert-Ok "healthz status ok/degraded" ($health.status -in @("ok", "degraded"))
Assert-Ok "healthz has request_id" (-not [string]::IsNullOrWhiteSpace($health.request_id))
Assert-Ok "healthz database ok" ($health.dependencies.database.ok -eq $true)

$monthly = Invoke-RestMethod -Method GET -Uri "$BaseUrl/api/v1/analytics/trend/monthly?year=2024" -TimeoutSec 30
Assert-Ok "monthly has meta" ($null -ne $monthly.meta)
Assert-Ok "monthly dimension month" (($monthly.meta.dimension -join ",") -eq "month")

$types = Invoke-RestMethod -Method GET -Uri "$BaseUrl/api/v1/analytics/types/proportion?year=2024&limit=10&sort=desc" -TimeoutSec 30
Assert-Ok "types has data list" ($types.data.Count -ge 0)

Write-Host "Smoke tests passed."

