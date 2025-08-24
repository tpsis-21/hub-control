# 🧪 Script de Teste de Recuperação de Desastres - Hub Control
# Versão: 1.0.0
# Data: 01/12/2024

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("test", "production")]
    [string]$Environment = "test",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("basic", "full", "custom")]
    [string]$TestType = "basic",
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false,
    
    [Parameter(Mandatory=$false)]
    [string[]]$TestScenarios = @(),
    
    [Parameter(Mandatory=$false)]
    [switch]$GenerateReport = $true,
    
    [Parameter(Mandatory=$false)]
    [string]$ReportFormat = "html" # html, json, markdown
)

# Configurações
$ErrorActionPreference = "Continue"
$VerbosePreference = "Continue"

# Cores para output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Cyan"
$Magenta = "Magenta"
$White = "White"

# Configurações por ambiente
$Config = @{
    test = @{
        PrimaryUrl = "https://test.hubcontrol.com"
        BackupUrl = "https://backup-test.hubcontrol.com"
        DatabaseUrl = $env:DATABASE_URL_TEST
        BackupLocation = "./backups/test"
        SlackWebhook = $env:SLACK_WEBHOOK_DR_TEST
        MaxDowntime = 300 # 5 minutos
        RTO = 900 # 15 minutos
        RPO = 3600 # 1 hora
    }
    production = @{
        PrimaryUrl = "https://hubcontrol.com"
        BackupUrl = "https://backup.hubcontrol.com"
        DatabaseUrl = $env:DATABASE_URL
        BackupLocation = "./backups/production"
        SlackWebhook = $env:SLACK_WEBHOOK_DR
        MaxDowntime = 60 # 1 minuto
        RTO = 300 # 5 minutos
        RPO = 900 # 15 minutos
    }
}

# Cenários de teste disponíveis
$AvailableScenarios = @{
    "database_failure" = @{
        Name = "Falha do Banco de Dados"
        Description = "Simula falha completa do banco de dados principal"
        Severity = "Critical"
        EstimatedDuration = 600 # 10 minutos
    }
    "web_server_failure" = @{
        Name = "Falha do Servidor Web"
        Description = "Simula falha do servidor web principal"
        Severity = "Critical"
        EstimatedDuration = 300 # 5 minutos
    }
    "network_partition" = @{
        Name = "Partição de Rede"
        Description = "Simula perda de conectividade de rede"
        Severity = "High"
        EstimatedDuration = 180 # 3 minutos
    }
    "storage_failure" = @{
        Name = "Falha de Armazenamento"
        Description = "Simula falha no sistema de armazenamento"
        Severity = "Critical"
        EstimatedDuration = 900 # 15 minutos
    }
    "backup_corruption" = @{
        Name = "Corrupção de Backup"
        Description = "Simula corrupção nos arquivos de backup"
        Severity = "High"
        EstimatedDuration = 1200 # 20 minutos
    }
    "dns_failure" = @{
        Name = "Falha de DNS"
        Description = "Simula falha na resolução DNS"
        Severity = "Medium"
        EstimatedDuration = 120 # 2 minutos
    }
    "ssl_certificate_expiry" = @{
        Name = "Expiração de Certificado SSL"
        Description = "Simula expiração do certificado SSL"
        Severity = "Medium"
        EstimatedDuration = 240 # 4 minutos
    }
    "high_load" = @{
        Name = "Alta Carga de Sistema"
        Description = "Simula alta carga que pode causar instabilidade"
        Severity = "Medium"
        EstimatedDuration = 300 # 5 minutos
    }
}

# Variáveis globais
$Global:TestResults = @{}
$Global:TestStartTime = $null
$Global:TestEndTime = $null
$Global:OriginalStates = @{}

# Função para log com timestamp
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [string]$Color = "White"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    Write-Host $logMessage -ForegroundColor $Color
    
    # Log para arquivo
    $logFile = "dr-test-$(Get-Date -Format 'yyyyMMdd').log"
    Add-Content -Path $logFile -Value $logMessage
}

# Função para enviar notificações
function Send-Notification {
    param(
        [string]$Message,
        [string]$Type = "info", # info, warning, error, success
        [hashtable]$Details = @{}
    )
    
    try {
        $webhook = $Config[$Environment].SlackWebhook
        if (-not $webhook) {
            Write-Log "Webhook não configurado para notificações" "WARNING" $Yellow
            return
        }
        
        $color = switch ($Type) {
            "info" { "#36a64f" }
            "warning" { "#ff9500" }
            "error" { "#ff0000" }
            "success" { "#00ff00" }
            default { "#36a64f" }
        }
        
        $emoji = switch ($Type) {
            "info" { "ℹ️" }
            "warning" { "⚠️" }
            "error" { "❌" }
            "success" { "✅" }
            default { "ℹ️" }
        }
        
        $fields = @()
        foreach ($key in $Details.Keys) {
            $fields += @{
                title = $key
                value = $Details[$key]
                short = $true
            }
        }
        
        $payload = @{
            text = "$emoji $Message"
            attachments = @(
                @{
                    color = $color
                    fields = $fields
                    footer = "Hub Control DR Test"
                    ts = [int][double]::Parse((Get-Date -UFormat %s))
                }
            )
        } | ConvertTo-Json -Depth 4
        
        Invoke-RestMethod -Uri $webhook -Method Post -Body $payload -ContentType "application/json" -TimeoutSec 10
        Write-Log "📱 Notificação enviada: $Type" "SUCCESS" $Green
    }
    catch {
        Write-Log "❌ Erro ao enviar notificação: $($_.Exception.Message)" "ERROR" $Red
    }
}

# Função para verificar pré-requisitos
function Test-Prerequisites {
    Write-Log "🔍 Verificando pré-requisitos..." "INFO" $Blue
    
    $prerequisites = @{
        Success = $true
        Issues = @()
    }
    
    # Verificar se estamos no ambiente correto
    if ($Environment -eq "production" -and -not $DryRun) {
        $prerequisites.Success = $false
        $prerequisites.Issues += "Testes em produção requerem modo DryRun"
    }
    
    # Verificar conectividade com serviços
    try {
        $primaryTest = Invoke-WebRequest -Uri $Config[$Environment].PrimaryUrl -TimeoutSec 10 -UseBasicParsing
        Write-Log "✅ Serviço principal acessível" "SUCCESS" $Green
    }
    catch {
        $prerequisites.Issues += "Serviço principal inacessível: $($_.Exception.Message)"
    }
    
    # Verificar se scripts de recuperação existem
    $requiredScripts = @(
        "./emergency-failover.ps1",
        "./backup-automation.ps1",
        "./monitoring-health-check.ps1"
    )
    
    foreach ($script in $requiredScripts) {
        if (-not (Test-Path $script)) {
            $prerequisites.Issues += "Script necessário não encontrado: $script"
        }
    }
    
    # Verificar variáveis de ambiente
    $requiredEnvVars = @(
        "DATABASE_URL",
        "SLACK_WEBHOOK_DR"
    )
    
    foreach ($envVar in $requiredEnvVars) {
        $value = if ($Environment -eq "test") { Get-Item "env:$($envVar)_TEST" -ErrorAction SilentlyContinue } else { Get-Item "env:$envVar" -ErrorAction SilentlyContinue }
        if (-not $value) {
            $prerequisites.Issues += "Variável de ambiente não configurada: $envVar"
        }
    }
    
    if ($prerequisites.Issues.Count -gt 0) {
        $prerequisites.Success = $false
        Write-Log "❌ Pré-requisitos não atendidos:" "ERROR" $Red
        foreach ($issue in $prerequisites.Issues) {
            Write-Log "  • $issue" "ERROR" $Red
        }
    } else {
        Write-Log "✅ Todos os pré-requisitos atendidos" "SUCCESS" $Green
    }
    
    return $prerequisites
}

# Função para capturar estado inicial
function Save-InitialState {
    Write-Log "💾 Capturando estado inicial do sistema..." "INFO" $Blue
    
    try {
        # Estado dos serviços
        $Global:OriginalStates.Services = @{}
        
        # Testar serviço principal
        try {
            $response = Invoke-WebRequest -Uri $Config[$Environment].PrimaryUrl -TimeoutSec 10 -UseBasicParsing
            $Global:OriginalStates.Services.Primary = @{
                Available = $true
                StatusCode = $response.StatusCode
                ResponseTime = 0 # Seria medido em implementação real
            }
        }
        catch {
            $Global:OriginalStates.Services.Primary = @{
                Available = $false
                Error = $_.Exception.Message
            }
        }
        
        # Estado do banco de dados
        $Global:OriginalStates.Database = @{
            ConnectionString = $Config[$Environment].DatabaseUrl
            Available = $true # Seria testado em implementação real
        }
        
        # Métricas do sistema
        $Global:OriginalStates.System = @{
            Timestamp = Get-Date
            CPU = (Get-WmiObject -Class Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
            Memory = @{
                Total = [math]::Round((Get-WmiObject -Class Win32_OperatingSystem).TotalVisibleMemorySize / 1KB, 2)
                Available = [math]::Round((Get-WmiObject -Class Win32_OperatingSystem).FreePhysicalMemory / 1KB, 2)
            }
        }
        
        Write-Log "✅ Estado inicial capturado com sucesso" "SUCCESS" $Green
        return $true
    }
    catch {
        Write-Log "❌ Erro ao capturar estado inicial: $($_.Exception.Message)" "ERROR" $Red
        return $false
    }
}

# Função para executar cenário de teste
function Invoke-TestScenario {
    param(
        [string]$ScenarioName
    )
    
    if (-not $AvailableScenarios.ContainsKey($ScenarioName)) {
        Write-Log "❌ Cenário desconhecido: $ScenarioName" "ERROR" $Red
        return $false
    }
    
    $scenario = $AvailableScenarios[$ScenarioName]
    Write-Log "🧪 INICIANDO TESTE: $($scenario.Name)" "INFO" $Magenta
    Write-Log "Descrição: $($scenario.Description)" "INFO" $Blue
    Write-Log "Severidade: $($scenario.Severity)" "INFO" $Blue
    Write-Log "Duração Estimada: $($scenario.EstimatedDuration) segundos" "INFO" $Blue
    
    $testResult = @{
        Scenario = $ScenarioName
        Name = $scenario.Name
        StartTime = Get-Date
        EndTime = $null
        Success = $false
        Steps = @()
        Metrics = @{}
        Issues = @()
        RecoveryTime = 0
    }
    
    try {
        # Notificar início do teste
        Send-Notification "Iniciando teste de DR: $($scenario.Name)" "info" @{
            "Cenário" = $ScenarioName
            "Ambiente" = $Environment
            "Modo" = if ($DryRun) { "Dry Run" } else { "Real" }
        }
        
        switch ($ScenarioName) {
            "database_failure" {
                $testResult = Test-DatabaseFailureScenario $testResult
            }
            "web_server_failure" {
                $testResult = Test-WebServerFailureScenario $testResult
            }
            "network_partition" {
                $testResult = Test-NetworkPartitionScenario $testResult
            }
            "storage_failure" {
                $testResult = Test-StorageFailureScenario $testResult
            }
            "backup_corruption" {
                $testResult = Test-BackupCorruptionScenario $testResult
            }
            "dns_failure" {
                $testResult = Test-DnsFailureScenario $testResult
            }
            "ssl_certificate_expiry" {
                $testResult = Test-SslCertificateExpiryScenario $testResult
            }
            "high_load" {
                $testResult = Test-HighLoadScenario $testResult
            }
            default {
                $testResult.Issues += "Cenário não implementado: $ScenarioName"
            }
        }
        
        $testResult.EndTime = Get-Date
        $testResult.RecoveryTime = ($testResult.EndTime - $testResult.StartTime).TotalSeconds
        
        # Verificar se atendeu aos objetivos de RTO/RPO
        $rto = $Config[$Environment].RTO
        $rpo = $Config[$Environment].RPO
        
        if ($testResult.RecoveryTime -le $rto) {
            $testResult.Steps += "✅ RTO atendido ($($testResult.RecoveryTime)s <= ${rto}s)"
        } else {
            $testResult.Issues += "❌ RTO não atendido ($($testResult.RecoveryTime)s > ${rto}s)"
        }
        
        # Determinar sucesso geral
        $testResult.Success = $testResult.Issues.Count -eq 0
        
        $status = if ($testResult.Success) { "SUCCESS" } else { "ERROR" }
        $color = if ($testResult.Success) { $Green } else { $Red }
        
        Write-Log "🏁 TESTE CONCLUÍDO: $($scenario.Name)" "$status" $color
        Write-Log "Tempo de Recuperação: $($testResult.RecoveryTime) segundos" "INFO" $Blue
        
        if ($testResult.Issues.Count -gt 0) {
            Write-Log "⚠️ Problemas identificados:" "WARNING" $Yellow
            foreach ($issue in $testResult.Issues) {
                Write-Log "  • $issue" "WARNING" $Yellow
            }
        }
        
        # Notificar resultado
        $notificationType = if ($testResult.Success) { "success" } else { "error" }
        Send-Notification "Teste de DR concluído: $($scenario.Name)" $notificationType @{
            "Resultado" = if ($testResult.Success) { "Sucesso" } else { "Falha" }
            "Tempo de Recuperação" = "$($testResult.RecoveryTime)s"
            "RTO" = "${rto}s"
            "Problemas" = $testResult.Issues.Count
        }
        
        return $testResult
    }
    catch {
        $testResult.EndTime = Get-Date
        $testResult.Issues += "Erro durante execução: $($_.Exception.Message)"
        $testResult.Success = $false
        
        Write-Log "❌ Erro durante teste $($scenario.Name): $($_.Exception.Message)" "ERROR" $Red
        
        Send-Notification "Erro no teste de DR: $($scenario.Name)" "error" @{
            "Erro" = $_.Exception.Message
        }
        
        return $testResult
    }
}

# Cenários de teste específicos
function Test-DatabaseFailureScenario {
    param([hashtable]$TestResult)
    
    Write-Log "💾 Testando cenário de falha do banco de dados..." "INFO" $Blue
    
    if ($DryRun) {
        Write-Log "🔍 [DRY RUN] Simulando falha do banco de dados" "INFO" $Yellow
        $TestResult.Steps += "[DRY RUN] Banco de dados marcado como indisponível"
        $TestResult.Steps += "[DRY RUN] Ativando procedimento de failover"
        $TestResult.Steps += "[DRY RUN] Redirecionando para banco de backup"
        $TestResult.Steps += "[DRY RUN] Verificando integridade dos dados"
        $TestResult.Steps += "[DRY RUN] Serviço restaurado com sucesso"
        
        # Simular tempo de recuperação
        Start-Sleep -Seconds 5
    } else {
        # Implementação real seria aqui
        $TestResult.Issues += "Teste real de falha de banco não implementado (requer ambiente isolado)"
    }
    
    return $TestResult
}

function Test-WebServerFailureScenario {
    param([hashtable]$TestResult)
    
    Write-Log "🌐 Testando cenário de falha do servidor web..." "INFO" $Blue
    
    if ($DryRun) {
        Write-Log "🔍 [DRY RUN] Simulando falha do servidor web" "INFO" $Yellow
        $TestResult.Steps += "[DRY RUN] Servidor web principal marcado como indisponível"
        $TestResult.Steps += "[DRY RUN] Ativando servidor de backup"
        $TestResult.Steps += "[DRY RUN] Atualizando DNS para apontar para backup"
        $TestResult.Steps += "[DRY RUN] Verificando funcionamento do backup"
        $TestResult.Steps += "[DRY RUN] Serviço restaurado com sucesso"
        
        # Simular tempo de recuperação
        Start-Sleep -Seconds 3
    } else {
        # Implementação real seria aqui
        $TestResult.Issues += "Teste real de falha de servidor não implementado (requer ambiente isolado)"
    }
    
    return $TestResult
}

function Test-NetworkPartitionScenario {
    param([hashtable]$TestResult)
    
    Write-Log "🌐 Testando cenário de partição de rede..." "INFO" $Blue
    
    if ($DryRun) {
        Write-Log "🔍 [DRY RUN] Simulando partição de rede" "INFO" $Yellow
        $TestResult.Steps += "[DRY RUN] Conectividade de rede interrompida"
        $TestResult.Steps += "[DRY RUN] Detectando perda de conectividade"
        $TestResult.Steps += "[DRY RUN] Ativando rotas alternativas"
        $TestResult.Steps += "[DRY RUN] Verificando conectividade restaurada"
        
        Start-Sleep -Seconds 2
    } else {
        $TestResult.Issues += "Teste real de partição de rede não implementado"
    }
    
    return $TestResult
}

function Test-StorageFailureScenario {
    param([hashtable]$TestResult)
    
    Write-Log "💿 Testando cenário de falha de armazenamento..." "INFO" $Blue
    
    if ($DryRun) {
        Write-Log "🔍 [DRY RUN] Simulando falha de armazenamento" "INFO" $Yellow
        $TestResult.Steps += "[DRY RUN] Sistema de armazenamento principal indisponível"
        $TestResult.Steps += "[DRY RUN] Ativando armazenamento de backup"
        $TestResult.Steps += "[DRY RUN] Restaurando dados do backup mais recente"
        $TestResult.Steps += "[DRY RUN] Verificando integridade dos dados restaurados"
        
        Start-Sleep -Seconds 8
    } else {
        $TestResult.Issues += "Teste real de falha de armazenamento não implementado"
    }
    
    return $TestResult
}

function Test-BackupCorruptionScenario {
    param([hashtable]$TestResult)
    
    Write-Log "🗂️ Testando cenário de corrupção de backup..." "INFO" $Blue
    
    if ($DryRun) {
        Write-Log "🔍 [DRY RUN] Simulando corrupção de backup" "INFO" $Yellow
        $TestResult.Steps += "[DRY RUN] Backup principal corrompido detectado"
        $TestResult.Steps += "[DRY RUN] Procurando backup alternativo válido"
        $TestResult.Steps += "[DRY RUN] Backup secundário encontrado e validado"
        $TestResult.Steps += "[DRY RUN] Restaurando do backup secundário"
        
        Start-Sleep -Seconds 10
    } else {
        $TestResult.Issues += "Teste real de corrupção de backup não implementado"
    }
    
    return $TestResult
}

function Test-DnsFailureScenario {
    param([hashtable]$TestResult)
    
    Write-Log "🌍 Testando cenário de falha de DNS..." "INFO" $Blue
    
    if ($DryRun) {
        Write-Log "🔍 [DRY RUN] Simulando falha de DNS" "INFO" $Yellow
        $TestResult.Steps += "[DRY RUN] Resolução DNS falhando"
        $TestResult.Steps += "[DRY RUN] Ativando DNS secundário"
        $TestResult.Steps += "[DRY RUN] Verificando resolução restaurada"
        
        Start-Sleep -Seconds 1
    } else {
        $TestResult.Issues += "Teste real de falha de DNS não implementado"
    }
    
    return $TestResult
}

function Test-SslCertificateExpiryScenario {
    param([hashtable]$TestResult)
    
    Write-Log "🔒 Testando cenário de expiração de certificado SSL..." "INFO" $Blue
    
    if ($DryRun) {
        Write-Log "🔍 [DRY RUN] Simulando expiração de certificado" "INFO" $Yellow
        $TestResult.Steps += "[DRY RUN] Certificado SSL expirado detectado"
        $TestResult.Steps += "[DRY RUN] Ativando certificado de backup"
        $TestResult.Steps += "[DRY RUN] Verificando novo certificado"
        
        Start-Sleep -Seconds 2
    } else {
        $TestResult.Issues += "Teste real de expiração de certificado não implementado"
    }
    
    return $TestResult
}

function Test-HighLoadScenario {
    param([hashtable]$TestResult)
    
    Write-Log "📊 Testando cenário de alta carga..." "INFO" $Blue
    
    if ($DryRun) {
        Write-Log "🔍 [DRY RUN] Simulando alta carga do sistema" "INFO" $Yellow
        $TestResult.Steps += "[DRY RUN] Alta carga detectada"
        $TestResult.Steps += "[DRY RUN] Ativando balanceamento de carga"
        $TestResult.Steps += "[DRY RUN] Escalando recursos automaticamente"
        $TestResult.Steps += "[DRY RUN] Sistema estabilizado"
        
        Start-Sleep -Seconds 3
    } else {
        $TestResult.Issues += "Teste real de alta carga não implementado"
    }
    
    return $TestResult
}

# Função para gerar relatório
function New-TestReport {
    param([hashtable]$Results)
    
    $reportData = @{
        TestSuite = "Hub Control - Disaster Recovery Test"
        Environment = $Environment
        TestType = $TestType
        DryRun = $DryRun
        StartTime = $Global:TestStartTime
        EndTime = $Global:TestEndTime
        Duration = if ($Global:TestEndTime -and $Global:TestStartTime) { 
            ($Global:TestEndTime - $Global:TestStartTime).TotalSeconds 
        } else { 0 }
        Results = $Results
        Summary = @{
            TotalTests = $Results.Count
            Passed = ($Results.Values | Where-Object { $_.Success }).Count
            Failed = ($Results.Values | Where-Object { -not $_.Success }).Count
            AverageRecoveryTime = if ($Results.Count -gt 0) { 
                ($Results.Values | Measure-Object -Property RecoveryTime -Average).Average 
            } else { 0 }
        }
    }
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    
    switch ($ReportFormat) {
        "json" {
            $jsonReport = $reportData | ConvertTo-Json -Depth 10
            $fileName = "dr-test-report-$timestamp.json"
            $jsonReport | Out-File -FilePath $fileName -Encoding UTF8
            Write-Log "📄 Relatório JSON salvo: $fileName" "SUCCESS" $Green
        }
        
        "markdown" {
            $mdReport = @"
# Hub Control - Relatório de Teste de Recuperação de Desastres

**Data:** $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')  
**Ambiente:** $Environment  
**Tipo de Teste:** $TestType  
**Modo:** $(if ($DryRun) { 'Dry Run' } else { 'Real' })  
**Duração Total:** $([math]::Round($reportData.Duration, 2)) segundos

## Resumo

- **Total de Testes:** $($reportData.Summary.TotalTests)
- **Sucessos:** $($reportData.Summary.Passed)
- **Falhas:** $($reportData.Summary.Failed)
- **Tempo Médio de Recuperação:** $([math]::Round($reportData.Summary.AverageRecoveryTime, 2)) segundos

## Resultados Detalhados

"@
            foreach ($testName in $Results.Keys) {
                $result = $Results[$testName]
                $status = if ($result.Success) { "✅ SUCESSO" } else { "❌ FALHA" }
                
                $mdReport += @"

### $($result.Name)

**Status:** $status  
**Tempo de Recuperação:** $([math]::Round($result.RecoveryTime, 2)) segundos  
**Início:** $($result.StartTime.ToString('HH:mm:ss'))  
**Fim:** $($result.EndTime.ToString('HH:mm:ss'))

#### Passos Executados
"@
                foreach ($step in $result.Steps) {
                    $mdReport += "`n- $step"
                }
                
                if ($result.Issues.Count -gt 0) {
                    $mdReport += "`n`n#### Problemas Identificados`n"
                    foreach ($issue in $result.Issues) {
                        $mdReport += "`n- ⚠️ $issue"
                    }
                }
            }
            
            $fileName = "dr-test-report-$timestamp.md"
            $mdReport | Out-File -FilePath $fileName -Encoding UTF8
            Write-Log "📄 Relatório Markdown salvo: $fileName" "SUCCESS" $Green
        }
        
        "html" {
            $htmlReport = @"
<!DOCTYPE html>
<html>
<head>
    <title>Hub Control - DR Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .summary { background: #e8f5e8; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .test-result { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { border-left: 5px solid #4CAF50; }
        .failure { border-left: 5px solid #f44336; }
        .steps { margin: 10px 0; }
        .step { margin: 5px 0; padding: 5px; background: #f9f9f9; }
        .issues { background: #fff3cd; padding: 10px; margin: 10px 0; border-radius: 3px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Hub Control - Relatório de Teste de Recuperação de Desastres</h1>
        <p><strong>Data:</strong> $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')</p>
        <p><strong>Ambiente:</strong> $Environment</p>
        <p><strong>Tipo:</strong> $TestType</p>
        <p><strong>Modo:</strong> $(if ($DryRun) { 'Dry Run' } else { 'Real' })</p>
        <p><strong>Duração:</strong> $([math]::Round($reportData.Duration, 2)) segundos</p>
    </div>
    
    <div class="summary">
        <h2>Resumo</h2>
        <table>
            <tr><th>Métrica</th><th>Valor</th></tr>
            <tr><td>Total de Testes</td><td>$($reportData.Summary.TotalTests)</td></tr>
            <tr><td>Sucessos</td><td>$($reportData.Summary.Passed)</td></tr>
            <tr><td>Falhas</td><td>$($reportData.Summary.Failed)</td></tr>
            <tr><td>Taxa de Sucesso</td><td>$([math]::Round(($reportData.Summary.Passed / $reportData.Summary.TotalTests) * 100, 1))%</td></tr>
            <tr><td>Tempo Médio de Recuperação</td><td>$([math]::Round($reportData.Summary.AverageRecoveryTime, 2)) segundos</td></tr>
        </table>
    </div>
    
    <h2>Resultados Detalhados</h2>
"@
            foreach ($testName in $Results.Keys) {
                $result = $Results[$testName]
                $cssClass = if ($result.Success) { "success" } else { "failure" }
                $status = if ($result.Success) { "✅ SUCESSO" } else { "❌ FALHA" }
                
                $htmlReport += @"
    <div class="test-result $cssClass">
        <h3>$($result.Name)</h3>
        <p><strong>Status:</strong> $status</p>
        <p><strong>Tempo de Recuperação:</strong> $([math]::Round($result.RecoveryTime, 2)) segundos</p>
        <p><strong>Período:</strong> $($result.StartTime.ToString('HH:mm:ss')) - $($result.EndTime.ToString('HH:mm:ss'))</p>
        
        <h4>Passos Executados</h4>
        <div class="steps">
"@
                foreach ($step in $result.Steps) {
                    $htmlReport += "            <div class=""step"">$step</div>`n"
                }
                
                $htmlReport += "        </div>`n"
                
                if ($result.Issues.Count -gt 0) {
                    $htmlReport += "        <div class=""issues"">`n            <h4>Problemas Identificados</h4>`n"
                    foreach ($issue in $result.Issues) {
                        $htmlReport += "            <p>⚠️ $issue</p>`n"
                    }
                    $htmlReport += "        </div>`n"
                }
                
                $htmlReport += "    </div>`n"
            }
            
            $htmlReport += @"
</body>
</html>
"@
            
            $fileName = "dr-test-report-$timestamp.html"
            $htmlReport | Out-File -FilePath $fileName -Encoding UTF8
            Write-Log "📄 Relatório HTML salvo: $fileName" "SUCCESS" $Green
        }
    }
}

# Função principal
function Start-DisasterRecoveryTest {
    Write-Log "🧪 INICIANDO TESTE DE RECUPERAÇÃO DE DESASTRES" "INFO" $Magenta
    Write-Log "═══════════════════════════════════════════════" "INFO" $White
    Write-Log "Ambiente: $Environment" "INFO" $Blue
    Write-Log "Tipo de Teste: $TestType" "INFO" $Blue
    Write-Log "Modo: $(if ($DryRun) { 'Dry Run' } else { 'Real' })" "INFO" $Blue
    
    $Global:TestStartTime = Get-Date
    
    try {
        # Verificar pré-requisitos
        $prereqCheck = Test-Prerequisites
        if (-not $prereqCheck.Success) {
            throw "Pré-requisitos não atendidos"
        }
        
        # Capturar estado inicial
        if (-not (Save-InitialState)) {
            throw "Falha ao capturar estado inicial"
        }
        
        # Determinar cenários a testar
        $scenariosToTest = @()
        
        if ($TestScenarios.Count -gt 0) {
            $scenariosToTest = $TestScenarios
        } else {
            switch ($TestType) {
                "basic" {
                    $scenariosToTest = @("web_server_failure", "dns_failure")
                }
                "full" {
                    $scenariosToTest = $AvailableScenarios.Keys
                }
                "custom" {
                    Write-Log "Cenários personalizados devem ser especificados via -TestScenarios" "ERROR" $Red
                    return
                }
            }
        }
        
        Write-Log "📋 Cenários a testar: $($scenariosToTest -join ', ')" "INFO" $Blue
        
        # Executar testes
        foreach ($scenario in $scenariosToTest) {
            if ($AvailableScenarios.ContainsKey($scenario)) {
                $result = Invoke-TestScenario $scenario
                $Global:TestResults[$scenario] = $result
            } else {
                Write-Log "⚠️ Cenário desconhecido ignorado: $scenario" "WARNING" $Yellow
            }
        }
        
        $Global:TestEndTime = Get-Date
        
        # Gerar relatório
        if ($GenerateReport) {
            New-TestReport $Global:TestResults
        }
        
        # Resumo final
        $totalTests = $Global:TestResults.Count
        $passedTests = ($Global:TestResults.Values | Where-Object { $_.Success }).Count
        $failedTests = $totalTests - $passedTests
        
        Write-Log "" "INFO" $White
        Write-Log "🏁 TESTE DE RECUPERAÇÃO DE DESASTRES CONCLUÍDO" "INFO" $Magenta
        Write-Log "═══════════════════════════════════════════════" "INFO" $White
        Write-Log "Total de Testes: $totalTests" "INFO" $Blue
        Write-Log "Sucessos: $passedTests" "SUCCESS" $Green
        Write-Log "Falhas: $failedTests" "ERROR" $Red
        Write-Log "Taxa de Sucesso: $([math]::Round(($passedTests / $totalTests) * 100, 1))%" "INFO" $Blue
        
        if ($failedTests -eq 0) {
            Write-Log "✅ Todos os testes passaram!" "SUCCESS" $Green
            Send-Notification "Teste de DR concluído com sucesso" "success" @{
                "Total" = $totalTests
                "Sucessos" = $passedTests
                "Taxa" = "$([math]::Round(($passedTests / $totalTests) * 100, 1))%"
            }
        } else {
            Write-Log "⚠️ Alguns testes falharam. Revisar procedimentos de DR." "WARNING" $Yellow
            Send-Notification "Teste de DR concluído com falhas" "warning" @{
                "Total" = $totalTests
                "Sucessos" = $passedTests
                "Falhas" = $failedTests
                "Taxa" = "$([math]::Round(($passedTests / $totalTests) * 100, 1))%"
            }
        }
    }
    catch {
        Write-Log "❌ Erro crítico durante teste de DR: $($_.Exception.Message)" "ERROR" $Red
        
        Send-Notification "Erro crítico no teste de DR" "error" @{
            "Erro" = $_.Exception.Message
        }
        
        exit 1
    }
}

# Validar parâmetros
if (-not $Config.ContainsKey($Environment)) {
    Write-Log "❌ Ambiente inválido: $Environment" "ERROR" $Red
    exit 1
}

if ($TestScenarios.Count -gt 0) {
    foreach ($scenario in $TestScenarios) {
        if (-not $AvailableScenarios.ContainsKey($scenario)) {
            Write-Log "❌ Cenário inválido: $scenario" "ERROR" $Red
            Write-Log "Cenários disponíveis: $($AvailableScenarios.Keys -join ', ')" "INFO" $Blue
            exit 1
        }
    }
}

# Executar teste
Start-DisasterRecoveryTest

Write-Log "Script de teste de DR finalizado" "INFO" $Blue