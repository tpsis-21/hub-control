# Verifica endpoint de webhook Gates2b após deploy (GET público).
# Uso: .\scripts\verificar-gates2b-deploy.ps1 -BaseUrl "https://hub.seudominio.com"

param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl
)

$ErrorActionPreference = 'Stop'
$base = $BaseUrl.TrimEnd('/')
$webhookUrl = "$base/api/gates2b/webhook"

Write-Host "Hub base: $base"
Write-Host "Webhook:  $webhookUrl"
Write-Host ""

try {
  $r = Invoke-WebRequest -Uri $webhookUrl -Method GET -UseBasicParsing
  Write-Host "GET webhook: $($r.StatusCode)" -ForegroundColor Green
  Write-Host $r.Content
} catch {
  Write-Host "GET webhook falhou: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "  1. Defina GATES2B_WEBHOOK_SECRET no servidor (producao)"
Write-Host "  2. Cadastre no painel Gates2b: $webhookUrl"
Write-Host "  3. Mantenha a URL do n8n (legado) na mesma lista"
Write-Host "  4. Veja docs/GATES2B_CONFIGURAR_APOS_DEPLOY.md"
