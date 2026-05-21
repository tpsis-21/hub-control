# 🔧 Configuração dos Scripts de Recuperação de Desastres
# Hub Control - Arquivo de Exemplo
# 
# INSTRUÇÕES:
# 1. Copie este arquivo para 'config.ps1'
# 2. Preencha as variáveis com os valores do seu ambiente
# 3. Mantenha este arquivo seguro (não commite no git)

# ============================================================================
# 🌐 CONFIGURAÇÕES DE AMBIENTE
# ============================================================================

# URLs dos serviços
$script:PRIMARY_URL = "https://hubcontrol.com"
$script:BACKUP_URL = "https://backup.hubcontrol.com"
$script:TEST_URL = "https://test.hubcontrol.com"

# Endpoints de verificação de saúde
$script:HEALTH_ENDPOINTS = @{
    "api" = "/api/health"
    "web" = "/health"
    "database" = "/api/health/database"
    "cache" = "/api/health/cache"
}

# ============================================================================
# 💾 CONFIGURAÇÕES DE BANCO DE DADOS
# ============================================================================

$script:DATABASE_CONFIG = @{
    "production" = @{
        "host" = "prod-db.hubcontrol.com"
        "port" = "5432"
        "database" = "hubcontrol"
        "username" = "hubcontrol_user"
        "password" = "CHANGE_ME_PROD_PASSWORD"
        "ssl" = $true
    }
    "test" = @{
        "host" = "test-db.hubcontrol.com"
        "port" = "5432"
        "database" = "hubcontrol_test"
        "username" = "hubcontrol_test_user"
        "password" = "CHANGE_ME_TEST_PASSWORD"
        "ssl" = $true
    }
}

# ============================================================================
# 📱 CONFIGURAÇÕES DE NOTIFICAÇÃO
# ============================================================================

# Slack Webhooks
$script:SLACK_CONFIG = @{
    "production" = @{
        "monitoring" = "https://hooks.slack.com/services/CHANGE_ME_PROD_MONITORING"
        "disaster_recovery" = "https://hooks.slack.com/services/CHANGE_ME_PROD_DR"
        "alerts" = "https://hooks.slack.com/services/CHANGE_ME_PROD_ALERTS"
    }
    "test" = @{
        "monitoring" = "https://hooks.slack.com/services/CHANGE_ME_TEST_MONITORING"
        "disaster_recovery" = "https://hooks.slack.com/services/CHANGE_ME_TEST_DR"
        "alerts" = "https://hooks.slack.com/services/CHANGE_ME_TEST_ALERTS"
    }
}

# Configurações de E-mail (SMTP)
$script:EMAIL_CONFIG = @{
    "smtp_host" = "smtp.gmail.com"
    "smtp_port" = 587
    "smtp_user" = "alerts@hubcontrol.com"
    "smtp_password" = "CHANGE_ME_EMAIL_APP_PASSWORD"
    "from_email" = "alerts@hubcontrol.com"
    "from_name" = "Hub Control Alerts"
    "to_emails" = @(
        "admin@hubcontrol.com",
        "devops@hubcontrol.com"
    )
    "use_ssl" = $true
}

# ============================================================================
# ☁️ CONFIGURAÇÕES DE CLOUD (AWS)
# ============================================================================

$script:AWS_CONFIG = @{
    "access_key_id" = "AKIA_CHANGE_ME_ACCESS_KEY"
    "secret_access_key" = "CHANGE_ME_SECRET_ACCESS_KEY"
    "region" = "us-east-1"
    "s3_bucket" = "hubcontrol-backups"
    "s3_backup_prefix" = "disaster-recovery"
    "ec2_backup_instance_id" = "i-CHANGE_ME_BACKUP_INSTANCE"
    "rds_backup_identifier" = "hubcontrol-backup-db"
}

# ============================================================================
# 🌐 CONFIGURAÇÕES DE DNS (Cloudflare)
# ============================================================================

$script:CLOUDFLARE_CONFIG = @{
    "api_token" = "CHANGE_ME_CLOUDFLARE_API_TOKEN"
    "zone_id" = "CHANGE_ME_CLOUDFLARE_ZONE_ID"
    "domain" = "hubcontrol.com"
    "records" = @{
        "main" = @{
            "name" = "hubcontrol.com"
            "primary_ip" = "203.0.113.1"
            "backup_ip" = "203.0.113.2"
        }
        "api" = @{
            "name" = "api.hubcontrol.com"
            "primary_ip" = "203.0.113.3"
            "backup_ip" = "203.0.113.4"
        }
    }
}

# ============================================================================
# 💾 CONFIGURAÇÕES DE BACKUP
# ============================================================================

$script:BACKUP_CONFIG = @{
    "local_backup_path" = "C:\HubControl\Backups"
    "retention_days" = @{
        "incremental" = 7
        "differential" = 30
        "full" = 90
    }
    "compression_level" = 6  # 1-9 (9 = máxima compressão)
    "encryption_enabled" = $true
    "encryption_password" = "CHANGE_ME_BACKUP_ENCRYPTION_PASSWORD"
    "max_backup_size_gb" = 50
    "parallel_jobs" = 4
    "verify_after_backup" = $true
}

# ============================================================================
# 📊 CONFIGURAÇÕES DE MONITORAMENTO
# ============================================================================

$script:MONITORING_CONFIG = @{
    "check_interval_seconds" = 300  # 5 minutos
    "timeout_seconds" = 30
    "max_retries" = 3
    "alert_thresholds" = @{
        "response_time_ms" = 5000
        "cpu_percent" = 80
        "memory_percent" = 85
        "disk_percent" = 90
        "error_rate_percent" = 5
    }
    "ssl_certificate_warning_days" = 30
    "continuous_mode_enabled" = $true
    "detailed_logging" = $true
}

# ============================================================================
# 🧪 CONFIGURAÇÕES DE TESTE DE DR
# ============================================================================

$script:DR_TEST_CONFIG = @{
    "test_environment_url" = "https://test.hubcontrol.com"
    "test_database_name" = "hubcontrol_dr_test"
    "max_test_duration_minutes" = 60
    "cleanup_after_test" = $true
    "generate_reports" = $true
    "report_formats" = @("html", "json", "markdown")
    "test_scenarios" = @(
        "database_failure",
        "web_server_failure",
        "network_partition",
        "storage_failure",
        "backup_corruption",
        "dns_failure",
        "ssl_certificate_expiry",
        "high_load"
    )
}

# ============================================================================
# 🚨 CONFIGURAÇÕES DE EMERGÊNCIA
# ============================================================================

$script:EMERGENCY_CONFIG = @{
    "auto_failover_enabled" = $false  # CUIDADO: Só habilite após testes!
    "failover_timeout_minutes" = 10
    "rollback_enabled" = $true
    "emergency_contacts" = @(
        @{
            "name" = "Administrador Principal"
            "email" = "admin@hubcontrol.com"
            "phone" = "+55 11 99999-9999"
            "role" = "primary"
        },
        @{
            "name" = "DevOps Lead"
            "email" = "devops@hubcontrol.com"
            "phone" = "+55 11 88888-8888"
            "role" = "technical"
        },
        @{
            "name" = "CTO"
            "email" = "cto@hubcontrol.com"
            "phone" = "+55 11 77777-7777"
            "role" = "executive"
        }
    )
}

# ============================================================================
# 🔒 CONFIGURAÇÕES DE SEGURANÇA
# ============================================================================

$script:SECURITY_CONFIG = @{
    "log_sensitive_data" = $false
    "encrypt_logs" = $true
    "log_retention_days" = 90
    "audit_enabled" = $true
    "require_approval_for_production" = $true
    "allowed_ip_ranges" = @(
        "10.0.0.0/8",
        "172.16.0.0/12",
        "192.168.0.0/16"
    )
}

# ============================================================================
# 📁 CONFIGURAÇÕES DE DIRETÓRIOS
# ============================================================================

$script:DIRECTORY_CONFIG = @{
    "logs" = "C:\HubControl\Logs\DisasterRecovery"
    "reports" = "C:\HubControl\Reports\DisasterRecovery"
    "temp" = "C:\HubControl\Temp\DisasterRecovery"
    "scripts" = "C:\HubControl\Scripts\DisasterRecovery"
    "backups" = "C:\HubControl\Backups"
    "restore" = "C:\HubControl\Restore"
}

# ============================================================================
# 🔧 FUNÇÕES AUXILIARES DE CONFIGURAÇÃO
# ============================================================================

# Função para validar configurações
function Test-Configuration {
    param(
        [string]$Environment = "test"
    )
    
    $errors = @()
    
    # Validar URLs
    if (-not $script:PRIMARY_URL -or $script:PRIMARY_URL -eq "https://hubcontrol.com") {
        $errors += "PRIMARY_URL não configurada"
    }
    
    # Validar banco de dados
    if (-not $script:DATABASE_CONFIG[$Environment]) {
        $errors += "Configuração de banco para ambiente '$Environment' não encontrada"
    }
    
    # Validar Slack
    if ($script:SLACK_CONFIG[$Environment].monitoring -like "*CHANGE_ME*") {
        $errors += "Webhook do Slack não configurado para ambiente '$Environment'"
    }
    
    # Validar AWS
    if ($script:AWS_CONFIG.access_key_id -like "*CHANGE_ME*") {
        $errors += "Credenciais AWS não configuradas"
    }
    
    # Validar Cloudflare
    if ($script:CLOUDFLARE_CONFIG.api_token -like "*CHANGE_ME*") {
        $errors += "Token do Cloudflare não configurado"
    }
    
    if ($errors.Count -gt 0) {
        Write-Host "❌ Erros de configuração encontrados:" -ForegroundColor Red
        $errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
        return $false
    } else {
        Write-Host "✅ Configuração válida para ambiente '$Environment'" -ForegroundColor Green
        return $true
    }
}

# Função para criar diretórios necessários
function Initialize-Directories {
    $script:DIRECTORY_CONFIG.Values | ForEach-Object {
        if (-not (Test-Path $_)) {
            New-Item -Path $_ -ItemType Directory -Force | Out-Null
            Write-Host "📁 Diretório criado: $_" -ForegroundColor Green
        }
    }
}

# Função para obter string de conexão do banco
function Get-DatabaseConnectionString {
    param(
        [string]$Environment = "test"
    )
    
    $config = $script:DATABASE_CONFIG[$Environment]
    if (-not $config) {
        throw "Configuração de banco não encontrada para ambiente: $Environment"
    }
    
    $sslMode = if ($config.ssl) { "require" } else { "disable" }
    return "Host=$($config.host);Port=$($config.port);Database=$($config.database);Username=$($config.username);Password=$($config.password);SSL Mode=$sslMode"
}

# Função para obter webhook do Slack
function Get-SlackWebhook {
    param(
        [string]$Environment = "test",
        [string]$Channel = "monitoring"
    )
    
    $webhook = $script:SLACK_CONFIG[$Environment][$Channel]
    if (-not $webhook -or $webhook -like "*CHANGE_ME*") {
        Write-Warning "Webhook do Slack não configurado para $Environment/$Channel"
        return $null
    }
    
    return $webhook
}

# ============================================================================
# 📋 INSTRUÇÕES DE CONFIGURAÇÃO
# ============================================================================

<#
.SYNOPSIS
Arquivo de configuração para scripts de recuperação de desastres do Hub Control

.DESCRIPTION
Este arquivo contém todas as configurações necessárias para executar os scripts
de recuperação de desastres, backup, monitoramento e testes.

.NOTES
PASSOS PARA CONFIGURAÇÃO:

1. COPIAR ARQUIVO:
   Copy-Item config.example.ps1 config.ps1

2. EDITAR CONFIGURAÇÕES:
   - Substitua todos os valores "CHANGE_ME_*" pelos valores reais
   - Configure URLs dos seus ambientes
   - Configure credenciais de banco de dados
   - Configure webhooks do Slack
   - Configure credenciais AWS
   - Configure token do Cloudflare

3. TESTAR CONFIGURAÇÃO:
   . .\config.ps1
   Test-Configuration -Environment "test"

4. INICIALIZAR DIRETÓRIOS:
   Initialize-Directories

5. TESTAR CONECTIVIDADE:
   .\monitoring-health-check.ps1 -Environment test

6. EXECUTAR TESTE DE DR:
   .\disaster-recovery-test.ps1 -Environment test -TestType basic -DryRun

SEGURANÇA:
- Mantenha este arquivo seguro
- Não commite no controle de versão
- Use senhas fortes
- Habilite 2FA onde possível
- Revise permissões regularmente

SUPORTE:
- Documentação: docs/GUIA_HUB_CONTROL.md
- Troubleshooting: docs/TROUBLESHOOTING.md
- Contato: devops@hubcontrol.com
#>

# ============================================================================
# 🔚 FIM DA CONFIGURAÇÃO
# ============================================================================

Write-Host "📋 Arquivo de configuração carregado" -ForegroundColor Cyan
Write-Host "💡 Execute 'Test-Configuration' para validar as configurações" -ForegroundColor Yellow