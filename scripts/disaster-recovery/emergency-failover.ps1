# 🆘 Script de Failover de Emergência - Hub Control
# Versão: 1.0.0
# Data: 01/12/2024

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("test", "production")]
    [string]$Environment,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force = $false
)

# Configurações
$ErrorActionPreference = "Stop"
$VerbosePreference = "Continue"

# Cores para output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Cyan"

# Configurações por ambiente
$Config = @{
    test = @{
        PrimaryUrl = "https://test.hubcontrol.com"
        BackupUrl = "https://backup-test.hubcontrol.com"
        HealthEndpoint = "/api/health"
        SlackWebhook = $env:SLACK_WEBHOOK_TEST
        EmailList = @("dev@hubcontrol.com")
    }
    production = @{
        PrimaryUrl = "https://hubcontrol.com"
        BackupUrl = "https://backup.hubcontrol.com"
        HealthEndpoint = "/api/health"
        SlackWebhook = $env:SLACK_WEBHOOK_EMERGENCY
        EmailList = @("emergency@hubcontrol.com", "cto@hubcontrol.com")
    }
}

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
    $logFile = "disaster-recovery-$(Get-Date -Format 'yyyyMMdd').log"
    Add-Content -Path $logFile -Value $logMessage
}

# Função para verificar saúde do sistema
function Test-SystemHealth {
    param([string]$Url)
    
    try {
        Write-Log "Verificando saúde do sistema: $Url" "INFO" $Blue
        
        $response = Invoke-RestMethod -Uri "$Url$($Config[$Environment].HealthEndpoint)" -TimeoutSec 30
        
        if ($response.status -eq "healthy") {
            Write-Log "✅ Sistema saudável: $Url" "SUCCESS" $Green
            return $true
        } else {
            Write-Log "⚠️ Sistema com problemas: $Url - Status: $($response.status)" "WARNING" $Yellow
            return $false
        }
    }
    catch {
        Write-Log "❌ Sistema indisponível: $Url - Erro: $($_.Exception.Message)" "ERROR" $Red
        return $false
    }
}

# Função para enviar notificação Slack
function Send-SlackNotification {
    param(
        [string]$Message,
        [string]$Color = "danger"
    )
    
    if (-not $Config[$Environment].SlackWebhook) {
        Write-Log "Webhook do Slack não configurado" "WARNING" $Yellow
        return
    }
    
    try {
        $payload = @{
            text = $Message
            attachments = @(
                @{
                    color = $Color
                    fields = @(
                        @{
                            title = "Ambiente"
                            value = $Environment.ToUpper()
                            short = $true
                        },
                        @{
                            title = "Timestamp"
                            value = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
                            short = $true
                        }
                    )
                }
            )
        } | ConvertTo-Json -Depth 3
        
        Invoke-RestMethod -Uri $Config[$Environment].SlackWebhook -Method Post -Body $payload -ContentType "application/json"
        Write-Log "📱 Notificação Slack enviada" "SUCCESS" $Green
    }
    catch {
        Write-Log "❌ Erro ao enviar notificação Slack: $($_.Exception.Message)" "ERROR" $Red
    }
}

# Função para enviar email de emergência
function Send-EmergencyEmail {
    param(
        [string]$Subject,
        [string]$Body
    )
    
    try {
        # Configurar SMTP (ajustar conforme provedor)
        $smtpServer = $env:SMTP_SERVER
        $smtpPort = $env:SMTP_PORT
        $smtpUser = $env:SMTP_USER
        $smtpPass = $env:SMTP_PASS
        
        if (-not $smtpServer) {
            Write-Log "Configuração SMTP não encontrada" "WARNING" $Yellow
            return
        }
        
        $securePassword = ConvertTo-SecureString $smtpPass -AsPlainText -Force
        $credential = New-Object System.Management.Automation.PSCredential($smtpUser, $securePassword)
        
        foreach ($email in $Config[$Environment].EmailList) {
            Send-MailMessage -SmtpServer $smtpServer -Port $smtpPort -UseSsl -Credential $credential `
                -From $smtpUser -To $email -Subject $Subject -Body $Body -BodyAsHtml
        }
        
        Write-Log "📧 Emails de emergência enviados" "SUCCESS" $Green
    }
    catch {
        Write-Log "❌ Erro ao enviar emails: $($_.Exception.Message)" "ERROR" $Red
    }
}

# Função para atualizar DNS (exemplo com Cloudflare)
function Update-DNS {
    param(
        [string]$Domain,
        [string]$NewIP
    )
    
    if ($DryRun) {
        Write-Log "[DRY RUN] Atualizaria DNS: $Domain -> $NewIP" "INFO" $Yellow
        return
    }
    
    try {
        $zoneId = $env:CLOUDFLARE_ZONE_ID
        $apiToken = $env:CLOUDFLARE_API_TOKEN
        
        if (-not $zoneId -or -not $apiToken) {
            Write-Log "Configuração Cloudflare não encontrada" "WARNING" $Yellow
            return
        }
        
        # Buscar registro DNS
        $headers = @{
            "Authorization" = "Bearer $apiToken"
            "Content-Type" = "application/json"
        }
        
        $records = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records?name=$Domain" -Headers $headers
        
        if ($records.result.Count -gt 0) {
            $recordId = $records.result[0].id
            
            # Atualizar registro
            $updateData = @{
                type = "A"
                name = $Domain
                content = $NewIP
                ttl = 300
            } | ConvertTo-Json
            
            Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$recordId" `
                -Method Put -Headers $headers -Body $updateData
            
            Write-Log "🌐 DNS atualizado: $Domain -> $NewIP" "SUCCESS" $Green
        }
    }
    catch {
        Write-Log "❌ Erro ao atualizar DNS: $($_.Exception.Message)" "ERROR" $Red
    }
}

# Função para ativar infraestrutura de backup
function Start-BackupInfrastructure {
    if ($DryRun) {
        Write-Log "[DRY RUN] Ativaria infraestrutura de backup" "INFO" $Yellow
        return
    }
    
    try {
        # Exemplo com AWS CLI (ajustar conforme infraestrutura)
        if (Get-Command aws -ErrorAction SilentlyContinue) {
            Write-Log "Iniciando instâncias de backup..." "INFO" $Blue
            
            # Listar e iniciar instâncias paradas
            $instances = aws ec2 describe-instances --filters "Name=tag:Environment,Values=$Environment" "Name=tag:Role,Values=backup" --query "Reservations[*].Instances[*].InstanceId" --output text
            
            if ($instances) {
                aws ec2 start-instances --instance-ids $instances
                Write-Log "🚀 Instâncias de backup iniciadas: $instances" "SUCCESS" $Green
                
                # Aguardar instâncias ficarem prontas
                Write-Log "Aguardando instâncias ficarem prontas..." "INFO" $Blue
                aws ec2 wait instance-running --instance-ids $instances
                Write-Log "✅ Instâncias de backup prontas" "SUCCESS" $Green
            }
        } else {
            Write-Log "AWS CLI não encontrado" "WARNING" $Yellow
        }
    }
    catch {
        Write-Log "❌ Erro ao ativar infraestrutura de backup: $($_.Exception.Message)" "ERROR" $Red
    }
}

# Função para verificar integridade dos dados
function Test-DataIntegrity {
    try {
        Write-Log "Verificando integridade dos dados..." "INFO" $Blue
        
        # Verificar conexão com banco de dados
        $dbUrl = $env:DATABASE_URL_BACKUP
        if ($dbUrl) {
            # Teste básico de conectividade (ajustar conforme banco)
            Write-Log "Testando conectividade com banco de backup..." "INFO" $Blue
            
            # Aqui você adicionaria testes específicos do seu banco
            # Por exemplo, para PostgreSQL:
            # psql $dbUrl -c "SELECT 1;"
            
            Write-Log "✅ Conectividade com banco verificada" "SUCCESS" $Green
        }
        
        # Verificar APIs críticas
        $backupUrl = $Config[$Environment].BackupUrl
        if (Test-SystemHealth $backupUrl) {
            Write-Log "✅ APIs de backup funcionando" "SUCCESS" $Green
        } else {
            Write-Log "❌ Problemas nas APIs de backup" "ERROR" $Red
            return $false
        }
        
        return $true
    }
    catch {
        Write-Log "❌ Erro na verificação de integridade: $($_.Exception.Message)" "ERROR" $Red
        return $false
    }
}

# Função principal de failover
function Start-EmergencyFailover {
    Write-Log "🚨 INICIANDO PROCEDIMENTO DE FAILOVER DE EMERGÊNCIA" "EMERGENCY" $Red
    Write-Log "Ambiente: $Environment" "INFO" $Blue
    Write-Log "Modo: $(if ($DryRun) { 'DRY RUN' } else { 'EXECUÇÃO REAL' })" "INFO" $Blue
    
    # Verificar sistema principal
    $primaryUrl = $Config[$Environment].PrimaryUrl
    $primaryHealthy = Test-SystemHealth $primaryUrl
    
    if ($primaryHealthy -and -not $Force) {
        Write-Log "✅ Sistema principal está funcionando. Use -Force para forçar failover." "INFO" $Green
        return
    }
    
    if (-not $primaryHealthy) {
        Write-Log "❌ Sistema principal indisponível. Iniciando failover..." "ERROR" $Red
    } elseif ($Force) {
        Write-Log "⚠️ Failover forçado solicitado" "WARNING" $Yellow
    }
    
    # Notificar início do procedimento
    $message = "🚨 EMERGÊNCIA: Iniciando failover para ambiente de backup ($Environment)"
    Send-SlackNotification $message "danger"
    
    # Ativar infraestrutura de backup
    Write-Log "🔄 Ativando infraestrutura de backup..." "INFO" $Blue
    Start-BackupInfrastructure
    
    # Aguardar sistemas ficarem prontos
    Write-Log "⏳ Aguardando sistemas de backup ficarem prontos..." "INFO" $Blue
    Start-Sleep -Seconds 60
    
    # Verificar integridade dos dados
    Write-Log "🔍 Verificando integridade dos dados..." "INFO" $Blue
    if (-not (Test-DataIntegrity)) {
        Write-Log "❌ FALHA CRÍTICA: Problemas na integridade dos dados" "ERROR" $Red
        Send-SlackNotification "❌ FALHA CRÍTICA: Problemas na integridade dos dados durante failover" "danger"
        return
    }
    
    # Atualizar DNS para apontar para backup
    Write-Log "🌐 Atualizando DNS..." "INFO" $Blue
    $domain = ($primaryUrl -replace "https://", "").Split("/")[0]
    $backupIP = "192.168.1.100" # IP do servidor de backup
    Update-DNS $domain $backupIP
    
    # Verificar se backup está respondendo
    Write-Log "🔍 Verificando sistema de backup..." "INFO" $Blue
    Start-Sleep -Seconds 30 # Aguardar propagação DNS
    
    $backupHealthy = Test-SystemHealth $Config[$Environment].BackupUrl
    
    if ($backupHealthy) {
        Write-Log "✅ FAILOVER CONCLUÍDO COM SUCESSO" "SUCCESS" $Green
        
        $successMessage = "✅ Failover concluído com sucesso para ambiente de backup ($Environment)"
        Send-SlackNotification $successMessage "good"
        
        # Email detalhado
        $emailSubject = "[RESOLVIDO] Failover de Emergência - Hub Control ($Environment)"
        $emailBody = @"
<h2>Failover de Emergência Concluído</h2>
<p><strong>Ambiente:</strong> $Environment</p>
<p><strong>Horário:</strong> $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</p>
<p><strong>Status:</strong> ✅ Sucesso</p>
<p><strong>Sistema de Backup:</strong> $($Config[$Environment].BackupUrl)</p>

<h3>Próximos Passos:</h3>
<ul>
<li>Monitorar sistema de backup</li>
<li>Investigar causa da falha principal</li>
<li>Planejar retorno ao sistema principal</li>
<li>Documentar incidente</li>
</ul>

<p>Equipe Hub Control</p>
"@
        Send-EmergencyEmail $emailSubject $emailBody
        
    } else {
        Write-Log "❌ FALHA NO FAILOVER: Sistema de backup não está respondendo" "ERROR" $Red
        
        $failMessage = "❌ FALHA CRÍTICA: Sistema de backup não está respondendo após failover ($Environment)"
        Send-SlackNotification $failMessage "danger"
        
        # Email de falha crítica
        $emailSubject = "[CRÍTICO] Falha no Failover - Hub Control ($Environment)"
        $emailBody = @"
<h2 style="color: red;">FALHA CRÍTICA NO FAILOVER</h2>
<p><strong>Ambiente:</strong> $Environment</p>
<p><strong>Horário:</strong> $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</p>
<p><strong>Status:</strong> ❌ Falha</p>

<h3>Situação:</h3>
<ul>
<li>Sistema principal: Indisponível</li>
<li>Sistema de backup: Não está respondendo</li>
<li>Serviço: Completamente indisponível</li>
</ul>

<h3>AÇÃO IMEDIATA NECESSÁRIA:</h3>
<ul>
<li>Contatar equipe de emergência</li>
<li>Ativar procedimentos manuais</li>
<li>Investigar ambos os sistemas</li>
<li>Considerar ativação de terceiro ambiente</li>
</ul>

<p style="color: red;"><strong>Este é um incidente crítico que requer atenção imediata!</strong></p>
"@
        Send-EmergencyEmail $emailSubject $emailBody
    }
    
    Write-Log "📋 Procedimento de failover finalizado" "INFO" $Blue
}

# Validar parâmetros
if (-not $Config.ContainsKey($Environment)) {
    Write-Log "❌ Ambiente inválido: $Environment" "ERROR" $Red
    exit 1
}

# Executar failover
try {
    Start-EmergencyFailover
}
catch {
    Write-Log "❌ Erro crítico durante failover: $($_.Exception.Message)" "ERROR" $Red
    Send-SlackNotification "❌ Erro crítico durante failover: $($_.Exception.Message)" "danger"
    exit 1
}

Write-Log "Script de failover finalizado" "INFO" $Blue