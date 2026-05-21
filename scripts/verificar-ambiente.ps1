# Verificação rápida pós-restore / após atualizar .env.local
# Uso: powershell -File scripts/verificar-ambiente.ps1

$ErrorActionPreference = "Stop"
$baseUrl = if ($env:NEXT_PUBLIC_APP_URL) { $env:NEXT_PUBLIC_APP_URL.TrimEnd('/') } else { "http://localhost:8080" }

Write-Host ""
Write-Host "  Hub Control — verificação de ambiente" -ForegroundColor Cyan
Write-Host "  Base: $baseUrl" -ForegroundColor DarkGray
Write-Host ""

function Test-Endpoint {
  param([string]$Path, [string]$Label)
  $url = "$baseUrl$Path"
  try {
    $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
    if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 300) {
      Write-Host "  [OK] $Label ($($res.StatusCode))" -ForegroundColor Green
      return $true
    }
    Write-Host "  [!!] $Label — HTTP $($res.StatusCode)" -ForegroundColor Yellow
    return $false
  } catch {
    Write-Host "  [X] $Label — $($_.Exception.Message)" -ForegroundColor Red
    return $false
  }
}

$envFile = Join-Path $PSScriptRoot ".." ".env.local" | Resolve-Path -ErrorAction SilentlyContinue
if ($envFile) {
  $required = @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY"
  )
  $content = Get-Content $envFile -Raw
  foreach ($key in $required) {
    if ($content -match "(?m)^$key=.+") {
      Write-Host "  [OK] .env.local → $key" -ForegroundColor Green
    } else {
      Write-Host "  [X] .env.local → $key ausente ou vazio" -ForegroundColor Red
    }
  }
} else {
  Write-Host "  [X] .env.local não encontrado" -ForegroundColor Red
}

Write-Host ""
Write-Host "  Servidor (rode npm run dev antes):" -ForegroundColor Cyan
Test-Endpoint "/api/health" "GET /api/health" | Out-Null
Test-Endpoint "/api/status" "GET /api/status" | Out-Null

Write-Host ""
Write-Host "  Testes automatizados:" -ForegroundColor Cyan
Push-Location (Join-Path $PSScriptRoot "..")
npm run test:integration 2>&1 | Select-Object -Last 5
Pop-Location

Write-Host ""
Write-Host "  Próximo: login em $baseUrl/login" -ForegroundColor DarkGray
Write-Host ""
