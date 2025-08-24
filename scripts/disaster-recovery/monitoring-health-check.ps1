# 📊 Script de Monitoramento e Health Check - Hub Control
# Versão: 1.0.0
# Data: 01/12/2024

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("test", "production")]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [int]$IntervalSeconds = 300, # 5 minutos
    
    [Parameter(Mandatory=$false)]
    [switch]$ContinuousMode = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$DetailedReport = $false,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputFormat = "console" # console, json, html
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
        ApiEndpoints = @(
            "/api/health",
            "/api/auth/status",
            "/api/clients",
            "/api/payments/status"
        )
        SlackWebhook = $env:SLACK_WEBHOOK_MONITORING_TEST
        AlertThresholds = @{
            ResponseTime = 5000 # ms
            ErrorRate = 5 # %
            CpuUsage = 80 # %
            MemoryUsage = 85 # %
            DiskUsage = 90 # %
        }
    }
    production = @{
        PrimaryUrl = "https://hubcontrol.com"
        BackupUrl = "https://backup.hubcontrol.com"
        DatabaseUrl = $env:DATABASE_URL
        ApiEndpoints = @(
            "/api/health",
            "/api/auth/status",
            "/api/clients",
            "/api/payments/status",
            "/api/notifications/status",
            "/api/reports/status"
        )
        SlackWebhook = $env:SLACK_WEBHOOK_MONITORING
        AlertThresholds = @{
            ResponseTime = 3000 # ms
            ErrorRate = 2 # %
            CpuUsage = 70 # %
            MemoryUsage = 80 # %
            DiskUsage = 85 # %
        }
    }
}

# Variáveis globais para tracking
$Global:HealthHistory = @()
$Global:AlertsSent = @{}
$Global:LastHealthCheck = $null

# Função para log com timestamp
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [string]$Color = "White"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    if ($OutputFormat -eq "console") {
        Write-Host $logMessage -ForegroundColor $Color
    }
    
    # Log para arquivo
    $logFile = "monitoring-$(Get-Date -Format 'yyyyMMdd').log"
    Add-Content -Path $logFile -Value $logMessage
}

# Função para enviar alertas
function Send-Alert {
    param(
        [string]$AlertType,
        [string]$Message,
        [string]$Severity = "warning", # info, warning, critical
        [hashtable]$Details = @{}
    )
    
    # Evitar spam de alertas
    $alertKey = "$AlertType-$Severity"
    $now = Get-Date
    
    if ($Global:AlertsSent.ContainsKey($alertKey)) {
        $lastAlert = $Global:AlertsSent[$alertKey]
        $timeDiff = $now - $lastAlert
        
        # Cooldown de 15 minutos para alertas similares
        if ($timeDiff.TotalMinutes -lt 15) {
            Write-Log "Alerta suprimido (cooldown): $AlertType" "DEBUG" $Yellow
            return
        }
    }
    
    $Global:AlertsSent[$alertKey] = $now
    
    try {
        $webhook = $Config[$Environment].SlackWebhook
        if (-not $webhook) {
            Write-Log "Webhook não configurado para alertas" "WARNING" $Yellow
            return
        }
        
        # Definir cor baseada na severidade
        $color = switch ($Severity) {
            "info" { "good" }
            "warning" { "warning" }
            "critical" { "danger" }
            default { "warning" }
        }
        
        # Definir emoji baseado no tipo
        $emoji = switch ($AlertType) {
            "system_down" { "🚨" }
            "high_response_time" { "⏱️" }
            "high_error_rate" { "❌" }
            "resource_usage" { "📊" }
            "database_issue" { "💾" }
            "backup_failure" { "💿" }
            default { "⚠️" }
        }
        
        # Preparar campos de detalhes
        $fields = @()
        foreach ($key in $Details.Keys) {
            $fields += @{
                title = $key
                value = $Details[$key]
                short = $true
            }
        }
        
        $fields += @(
            @{
                title = "Ambiente"
                value = $Environment.ToUpper()
                short = $true
            },
            @{
                title = "Timestamp"
                value = $now.ToString("yyyy-MM-dd HH:mm:ss")
                short = $true
            }
        )
        
        $payload = @{
            text = "$emoji $Message"
            attachments = @(
                @{
                    color = $color
                    fields = $fields
                    footer = "Hub Control Monitoring"
                    ts = [int][double]::Parse((Get-Date -UFormat %s))
                }
            )
        } | ConvertTo-Json -Depth 4
        
        Invoke-RestMethod -Uri $webhook -Method Post -Body $payload -ContentType "application/json" -TimeoutSec 10
        Write-Log "📱 Alerta enviado: $AlertType ($Severity)" "SUCCESS" $Green
    }
    catch {
        Write-Log "❌ Erro ao enviar alerta: $($_.Exception.Message)" "ERROR" $Red
    }
}

# Função para testar endpoint HTTP
function Test-HttpEndpoint {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 30
    )
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSeconds -UseBasicParsing
        
        $stopwatch.Stop()
        $responseTime = $stopwatch.ElapsedMilliseconds
        
        return @{
            Success = $true
            StatusCode = $response.StatusCode
            ResponseTime = $responseTime
            ContentLength = $response.Content.Length
            Error = $null
        }
    }
    catch {
        $stopwatch.Stop()
        
        return @{
            Success = $false
            StatusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode } else { 0 }
            ResponseTime = $stopwatch.ElapsedMilliseconds
            ContentLength = 0
            Error = $_.Exception.Message
        }
    }
}

# Função para testar conectividade do banco
function Test-DatabaseConnectivity {
    try {
        $dbUrl = $Config[$Environment].DatabaseUrl
        if (-not $dbUrl) {
            return @{
                Success = $false
                Error = "URL do banco não configurada"
                ResponseTime = 0
            }
        }
        
        # Parse da URL do PostgreSQL
        if ($dbUrl -match "postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)") {
            $dbHost = $matches[3]
            $dbPort = $matches[4]
        } else {
            return @{
                Success = $false
                Error = "Formato de URL inválido"
                ResponseTime = 0
            }
        }
        
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        # Testar conectividade TCP
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.Connect($dbHost, $dbPort)
        $tcpClient.Close()
        
        $stopwatch.Stop()
        
        return @{
            Success = $true
            Error = $null
            ResponseTime = $stopwatch.ElapsedMilliseconds
        }
    }
    catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
            ResponseTime = 0
        }
    }
}

# Função para obter métricas do sistema
function Get-SystemMetrics {
    try {
        # CPU Usage
        $cpu = Get-WmiObject -Class Win32_Processor | Measure-Object -Property LoadPercentage -Average
        $cpuUsage = [math]::Round($cpu.Average, 2)
        
        # Memory Usage
        $memory = Get-WmiObject -Class Win32_OperatingSystem
        $totalMemory = [math]::Round($memory.TotalVisibleMemorySize / 1KB, 2)
        $freeMemory = [math]::Round($memory.FreePhysicalMemory / 1KB, 2)
        $usedMemory = $totalMemory - $freeMemory
        $memoryUsage = [math]::Round(($usedMemory / $totalMemory) * 100, 2)
        
        # Disk Usage (C: drive)
        $disk = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
        $diskUsage = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 2)
        
        # Network Statistics
        $networkAdapters = Get-WmiObject -Class Win32_PerfRawData_Tcpip_NetworkInterface | Where-Object { $_.Name -notlike "*Loopback*" -and $_.Name -notlike "*isatap*" }
        $totalBytesReceived = ($networkAdapters | Measure-Object -Property BytesReceivedPerSec -Sum).Sum
        $totalBytesSent = ($networkAdapters | Measure-Object -Property BytesSentPerSec -Sum).Sum
        
        return @{
            Success = $true
            CPU = $cpuUsage
            Memory = @{
                Usage = $memoryUsage
                Total = $totalMemory
                Used = $usedMemory
                Free = $freeMemory
            }
            Disk = @{
                Usage = $diskUsage
                Total = [math]::Round($disk.Size / 1GB, 2)
                Free = [math]::Round($disk.FreeSpace / 1GB, 2)
            }
            Network = @{
                BytesReceived = $totalBytesReceived
                BytesSent = $totalBytesSent
            }
            Error = $null
        }
    }
    catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

# Função para verificar processos críticos
function Test-CriticalProcesses {
    $criticalProcesses = @(
        "node", # Node.js para aplicação
        "postgres", # PostgreSQL (se local)
        "nginx", # Nginx (se usado)
        "redis" # Redis (se usado)
    )
    
    $processStatus = @{}
    
    foreach ($processName in $criticalProcesses) {
        $processes = Get-Process -Name $processName -ErrorAction SilentlyContinue
        
        if ($processes) {
            $processStatus[$processName] = @{
                Running = $true
                Count = $processes.Count
                Memory = [math]::Round(($processes | Measure-Object -Property WorkingSet -Sum).Sum / 1MB, 2)
            }
        } else {
            $processStatus[$processName] = @{
                Running = $false
                Count = 0
                Memory = 0
            }
        }
    }
    
    return $processStatus
}

# Função para verificar certificados SSL
function Test-SslCertificates {
    param([string]$Url)
    
    try {
        $uri = [System.Uri]$Url
        $hostname = $uri.Host
        $port = if ($uri.Port -eq -1) { 443 } else { $uri.Port }
        
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.Connect($hostname, $port)
        
        $sslStream = New-Object System.Net.Security.SslStream($tcpClient.GetStream())
        $sslStream.AuthenticateAsClient($hostname)
        
        $cert = $sslStream.RemoteCertificate
        $cert2 = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($cert)
        
        $daysUntilExpiry = ($cert2.NotAfter - (Get-Date)).Days
        
        $sslStream.Close()
        $tcpClient.Close()
        
        return @{
            Success = $true
            Subject = $cert2.Subject
            Issuer = $cert2.Issuer
            NotBefore = $cert2.NotBefore
            NotAfter = $cert2.NotAfter
            DaysUntilExpiry = $daysUntilExpiry
            IsValid = $daysUntilExpiry -gt 0
            Error = $null
        }
    }
    catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

# Função principal de health check
function Start-HealthCheck {
    Write-Log "🏥 INICIANDO HEALTH CHECK" "INFO" $Magenta
    Write-Log "Ambiente: $Environment" "INFO" $Blue
    
    $healthReport = @{
        Timestamp = Get-Date
        Environment = $Environment
        Overall = @{
            Status = "HEALTHY"
            Score = 100
            Issues = @()
        }
        Services = @{}
        Infrastructure = @{}
        Security = @{}
    }
    
    try {
        # Testar serviços principais
        Write-Log "🌐 Testando serviços web..." "INFO" $Blue
        
        $primaryUrl = $Config[$Environment].PrimaryUrl
        $backupUrl = $Config[$Environment].BackupUrl
        
        # Teste do serviço principal
        $primaryTest = Test-HttpEndpoint $primaryUrl
        $healthReport.Services.Primary = $primaryTest
        
        if (-not $primaryTest.Success) {
            $healthReport.Overall.Status = "CRITICAL"
            $healthReport.Overall.Score -= 50
            $healthReport.Overall.Issues += "Serviço principal indisponível"
            
            Send-Alert "system_down" "Serviço principal indisponível" "critical" @{
                "URL" = $primaryUrl
                "Erro" = $primaryTest.Error
                "Código" = $primaryTest.StatusCode
            }
        } elseif ($primaryTest.ResponseTime -gt $Config[$Environment].AlertThresholds.ResponseTime) {
            $healthReport.Overall.Score -= 10
            $healthReport.Overall.Issues += "Tempo de resposta elevado no serviço principal"
            
            Send-Alert "high_response_time" "Tempo de resposta elevado" "warning" @{
                "URL" = $primaryUrl
                "Tempo" = "$($primaryTest.ResponseTime)ms"
                "Limite" = "$($Config[$Environment].AlertThresholds.ResponseTime)ms"
            }
        }
        
        # Teste do serviço de backup
        $backupTest = Test-HttpEndpoint $backupUrl
        $healthReport.Services.Backup = $backupTest
        
        if (-not $backupTest.Success) {
            $healthReport.Overall.Score -= 20
            $healthReport.Overall.Issues += "Serviço de backup indisponível"
            
            Send-Alert "system_down" "Serviço de backup indisponível" "warning" @{
                "URL" = $backupUrl
                "Erro" = $backupTest.Error
            }
        }
        
        # Testar endpoints da API
        Write-Log "🔌 Testando endpoints da API..." "INFO" $Blue
        $healthReport.Services.Endpoints = @{}
        
        foreach ($endpoint in $Config[$Environment].ApiEndpoints) {
            $fullUrl = $primaryUrl + $endpoint
            $endpointTest = Test-HttpEndpoint $fullUrl
            $healthReport.Services.Endpoints[$endpoint] = $endpointTest
            
            if (-not $endpointTest.Success) {
                $healthReport.Overall.Score -= 5
                $healthReport.Overall.Issues += "Endpoint $endpoint indisponível"
            }
        }
        
        # Testar banco de dados
        Write-Log "💾 Testando conectividade do banco..." "INFO" $Blue
        $dbTest = Test-DatabaseConnectivity
        $healthReport.Infrastructure.Database = $dbTest
        
        if (-not $dbTest.Success) {
            $healthReport.Overall.Status = "CRITICAL"
            $healthReport.Overall.Score -= 30
            $healthReport.Overall.Issues += "Banco de dados inacessível"
            
            Send-Alert "database_issue" "Banco de dados inacessível" "critical" @{
                "Erro" = $dbTest.Error
            }
        }
        
        # Obter métricas do sistema
        Write-Log "📊 Coletando métricas do sistema..." "INFO" $Blue
        $systemMetrics = Get-SystemMetrics
        $healthReport.Infrastructure.System = $systemMetrics
        
        if ($systemMetrics.Success) {
            $thresholds = $Config[$Environment].AlertThresholds
            
            # Verificar CPU
            if ($systemMetrics.CPU -gt $thresholds.CpuUsage) {
                $healthReport.Overall.Score -= 10
                $healthReport.Overall.Issues += "Uso de CPU elevado ($($systemMetrics.CPU)%)"
                
                Send-Alert "resource_usage" "Uso de CPU elevado" "warning" @{
                    "CPU" = "$($systemMetrics.CPU)%"
                    "Limite" = "$($thresholds.CpuUsage)%"
                }
            }
            
            # Verificar Memória
            if ($systemMetrics.Memory.Usage -gt $thresholds.MemoryUsage) {
                $healthReport.Overall.Score -= 10
                $healthReport.Overall.Issues += "Uso de memória elevado ($($systemMetrics.Memory.Usage)%)"
                
                Send-Alert "resource_usage" "Uso de memória elevado" "warning" @{
                    "Memória" = "$($systemMetrics.Memory.Usage)%"
                    "Limite" = "$($thresholds.MemoryUsage)%"
                }
            }
            
            # Verificar Disco
            if ($systemMetrics.Disk.Usage -gt $thresholds.DiskUsage) {
                $healthReport.Overall.Score -= 15
                $healthReport.Overall.Issues += "Uso de disco elevado ($($systemMetrics.Disk.Usage)%)"
                
                Send-Alert "resource_usage" "Uso de disco elevado" "critical" @{
                    "Disco" = "$($systemMetrics.Disk.Usage)%"
                    "Limite" = "$($thresholds.DiskUsage)%"
                }
            }
        }
        
        # Verificar processos críticos
        Write-Log "⚙️ Verificando processos críticos..." "INFO" $Blue
        $processStatus = Test-CriticalProcesses
        $healthReport.Infrastructure.Processes = $processStatus
        
        foreach ($processName in $processStatus.Keys) {
            if (-not $processStatus[$processName].Running) {
                $healthReport.Overall.Score -= 5
                $healthReport.Overall.Issues += "Processo $processName não está rodando"
            }
        }
        
        # Verificar certificados SSL
        Write-Log "🔒 Verificando certificados SSL..." "INFO" $Blue
        $sslTest = Test-SslCertificates $primaryUrl
        $healthReport.Security.SSL = $sslTest
        
        if ($sslTest.Success) {
            if ($sslTest.DaysUntilExpiry -lt 30) {
                $healthReport.Overall.Score -= 5
                $healthReport.Overall.Issues += "Certificado SSL expira em $($sslTest.DaysUntilExpiry) dias"
                
                $severity = if ($sslTest.DaysUntilExpiry -lt 7) { "critical" } else { "warning" }
                Send-Alert "ssl_expiry" "Certificado SSL próximo do vencimento" $severity @{
                    "Dias" = $sslTest.DaysUntilExpiry
                    "Vencimento" = $sslTest.NotAfter.ToString("yyyy-MM-dd")
                }
            }
        } else {
            $healthReport.Overall.Score -= 10
            $healthReport.Overall.Issues += "Erro na verificação do certificado SSL"
        }
        
        # Determinar status geral
        if ($healthReport.Overall.Score -ge 90) {
            $healthReport.Overall.Status = "HEALTHY"
        } elseif ($healthReport.Overall.Score -ge 70) {
            $healthReport.Overall.Status = "WARNING"
        } elseif ($healthReport.Overall.Score -ge 50) {
            $healthReport.Overall.Status = "DEGRADED"
        } else {
            $healthReport.Overall.Status = "CRITICAL"
        }
        
        # Adicionar ao histórico
        $Global:HealthHistory += $healthReport
        if ($Global:HealthHistory.Count -gt 100) {
            $Global:HealthHistory = $Global:HealthHistory[-100..-1]
        }
        
        $Global:LastHealthCheck = $healthReport
        
        # Exibir resultado
        $statusColor = switch ($healthReport.Overall.Status) {
            "HEALTHY" { $Green }
            "WARNING" { $Yellow }
            "DEGRADED" { $Yellow }
            "CRITICAL" { $Red }
        }
        
        Write-Log "🏥 Health Check Concluído" "INFO" $Blue
        Write-Log "Status: $($healthReport.Overall.Status) (Score: $($healthReport.Overall.Score)/100)" "INFO" $statusColor
        
        if ($healthReport.Overall.Issues.Count -gt 0) {
            Write-Log "⚠️ Problemas identificados:" "WARNING" $Yellow
            foreach ($issue in $healthReport.Overall.Issues) {
                Write-Log "  • $issue" "WARNING" $Yellow
            }
        }
        
        return $healthReport
    }
    catch {
        Write-Log "❌ Erro durante health check: $($_.Exception.Message)" "ERROR" $Red
        
        Send-Alert "monitoring_error" "Erro no sistema de monitoramento" "critical" @{
            "Erro" = $_.Exception.Message
        }
        
        throw
    }
}

# Função para gerar relatório detalhado
function New-DetailedReport {
    param([hashtable]$HealthReport)
    
    if ($OutputFormat -eq "json") {
        return $HealthReport | ConvertTo-Json -Depth 10
    }
    
    if ($OutputFormat -eq "html") {
        $html = @"
<!DOCTYPE html>
<html>
<head>
    <title>Hub Control - Health Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .status-healthy { color: green; }
        .status-warning { color: orange; }
        .status-critical { color: red; }
        .metric { margin: 10px 0; }
        .section { margin: 20px 0; border: 1px solid #ccc; padding: 15px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Hub Control - Health Report</h1>
    <p><strong>Timestamp:</strong> $($HealthReport.Timestamp)</p>
    <p><strong>Environment:</strong> $($HealthReport.Environment)</p>
    <p><strong>Overall Status:</strong> <span class="status-$($HealthReport.Overall.Status.ToLower())">$($HealthReport.Overall.Status)</span></p>
    <p><strong>Health Score:</strong> $($HealthReport.Overall.Score)/100</p>
    
    <div class="section">
        <h2>Services</h2>
        <table>
            <tr><th>Service</th><th>Status</th><th>Response Time</th><th>Details</th></tr>
            <tr><td>Primary</td><td>$($HealthReport.Services.Primary.Success)</td><td>$($HealthReport.Services.Primary.ResponseTime)ms</td><td>$($HealthReport.Services.Primary.Error)</td></tr>
            <tr><td>Backup</td><td>$($HealthReport.Services.Backup.Success)</td><td>$($HealthReport.Services.Backup.ResponseTime)ms</td><td>$($HealthReport.Services.Backup.Error)</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h2>System Metrics</h2>
        <div class="metric"><strong>CPU Usage:</strong> $($HealthReport.Infrastructure.System.CPU)%</div>
        <div class="metric"><strong>Memory Usage:</strong> $($HealthReport.Infrastructure.System.Memory.Usage)%</div>
        <div class="metric"><strong>Disk Usage:</strong> $($HealthReport.Infrastructure.System.Disk.Usage)%</div>
    </div>
</body>
</html>
"@
        return $html
    }
    
    # Console output (default)
    Write-Log "📋 RELATÓRIO DETALHADO" "INFO" $Magenta
    Write-Log "═══════════════════════" "INFO" $White
    Write-Log "Timestamp: $($HealthReport.Timestamp)" "INFO" $Blue
    Write-Log "Ambiente: $($HealthReport.Environment)" "INFO" $Blue
    Write-Log "Status Geral: $($HealthReport.Overall.Status)" "INFO" $Blue
    Write-Log "Score: $($HealthReport.Overall.Score)/100" "INFO" $Blue
    Write-Log "" "INFO" $White
    
    if ($HealthReport.Services.Primary) {
        Write-Log "🌐 SERVIÇO PRINCIPAL" "INFO" $Blue
        Write-Log "Status: $($HealthReport.Services.Primary.Success)" "INFO" $Blue
        Write-Log "Tempo de Resposta: $($HealthReport.Services.Primary.ResponseTime)ms" "INFO" $Blue
        if ($HealthReport.Services.Primary.Error) {
            Write-Log "Erro: $($HealthReport.Services.Primary.Error)" "ERROR" $Red
        }
        Write-Log "" "INFO" $White
    }
    
    if ($HealthReport.Infrastructure.System.Success) {
        Write-Log "📊 MÉTRICAS DO SISTEMA" "INFO" $Blue
        Write-Log "CPU: $($HealthReport.Infrastructure.System.CPU)%" "INFO" $Blue
        Write-Log "Memória: $($HealthReport.Infrastructure.System.Memory.Usage)%" "INFO" $Blue
        Write-Log "Disco: $($HealthReport.Infrastructure.System.Disk.Usage)%" "INFO" $Blue
        Write-Log "" "INFO" $White
    }
    
    if ($HealthReport.Overall.Issues.Count -gt 0) {
        Write-Log "⚠️ PROBLEMAS IDENTIFICADOS" "WARNING" $Yellow
        foreach ($issue in $HealthReport.Overall.Issues) {
            Write-Log "• $issue" "WARNING" $Yellow
        }
    }
}

# Função para modo contínuo
function Start-ContinuousMonitoring {
    Write-Log "🔄 INICIANDO MONITORAMENTO CONTÍNUO" "INFO" $Magenta
    Write-Log "Intervalo: $IntervalSeconds segundos" "INFO" $Blue
    Write-Log "Pressione Ctrl+C para parar" "INFO" $Blue
    
    try {
        while ($true) {
            $healthReport = Start-HealthCheck
            
            if ($DetailedReport) {
                New-DetailedReport $healthReport
            }
            
            Write-Log "⏳ Aguardando próximo check em $IntervalSeconds segundos..." "INFO" $Blue
            Start-Sleep -Seconds $IntervalSeconds
        }
    }
    catch [System.Management.Automation.PipelineStoppedException] {
        Write-Log "🛑 Monitoramento interrompido pelo usuário" "INFO" $Yellow
    }
    catch {
        Write-Log "❌ Erro no monitoramento contínuo: $($_.Exception.Message)" "ERROR" $Red
        throw
    }
}

# Validar parâmetros
if (-not $Config.ContainsKey($Environment)) {
    Write-Log "❌ Ambiente inválido: $Environment" "ERROR" $Red
    exit 1
}

# Executar monitoramento
try {
    if ($ContinuousMode) {
        Start-ContinuousMonitoring
    } else {
        $healthReport = Start-HealthCheck
        
        if ($DetailedReport) {
            $report = New-DetailedReport $healthReport
            
            if ($OutputFormat -eq "json" -or $OutputFormat -eq "html") {
                $outputFile = "health-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').$OutputFormat"
                $report | Out-File -FilePath $outputFile -Encoding UTF8
                Write-Log "📄 Relatório salvo: $outputFile" "SUCCESS" $Green
            }
        }
    }
}
catch {
    Write-Log "❌ Erro crítico no monitoramento: $($_.Exception.Message)" "ERROR" $Red
    exit 1
}

Write-Log "Script de monitoramento finalizado" "INFO" $Blue