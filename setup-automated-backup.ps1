# ==========================================
# CONFIGURAÇÃO DE BACKUP AUTOMÁTICO
# ==========================================

param(
    [string]$ProjectId = "",
    [string]$DatabasePassword = "",
    [string]$BackupPath = "C:\Backups\hub-control",
    [string]$Schedule = "daily",  # daily, weekly, monthly
    [string]$Time = "02:00",      # Horário para execução (HH:mm)
    [switch]$EnableEmailNotification = $false,
    [string]$EmailTo = "",
    [string]$EmailFrom = "",
    [string]$SmtpServer = "",
    [switch]$SetupOnly = $false,
    [switch]$RemoveSchedule = $false
)

# Configurações
$ScriptPath = $PSScriptRoot
$TaskName = "HubControl-AutoBackup"
$LogPath = "$BackupPath\automation\logs"
$ConfigPath = "$BackupPath\automation\config"

# Função para logging
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $LogEntry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"
    Write-Host $LogEntry
    
    if (-not (Test-Path $LogPath)) {
        New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
    }
    
    $LogFile = "$LogPath\automation_setup_$(Get-Date -Format 'yyyyMMdd').log"
    Add-Content -Path $LogFile -Value $LogEntry
}

# Função para verificar privilégios de administrador
function Test-AdminPrivileges {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Função para criar configuração de backup
function New-BackupConfiguration {
    Write-Log "Criando configuração de backup automático..."
    
    if (-not (Test-Path $ConfigPath)) {
        New-Item -ItemType Directory -Path $ConfigPath -Force | Out-Null
    }
    
    $Config = @{
        ProjectId = $ProjectId
        DatabasePassword = $DatabasePassword
        BackupPath = $BackupPath
        Schedule = $Schedule
        Time = $Time
        EnableEmailNotification = $EnableEmailNotification
        EmailTo = $EmailTo
        EmailFrom = $EmailFrom
        SmtpServer = $SmtpServer
        CreatedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        LastModified = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    }
    
    $ConfigFile = "$ConfigPath\backup-config.json"
    $Config | ConvertTo-Json -Depth 3 | Out-File -FilePath $ConfigFile -Encoding UTF8
    
    Write-Log "Configuração salva em: $ConfigFile"
    return $ConfigFile
}

# Função para criar script de execução automática
function New-AutomationScript {
    Write-Log "Criando script de automação..."
    
    $AutomationScript = @'
# ==========================================
# SCRIPT DE EXECUÇÃO AUTOMÁTICA DE BACKUP
# ==========================================

param(
    [string]$ConfigFile = ""
)

# Configurações
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptPath
$LogPath = "$ScriptPath\..\logs"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# Função para logging
function Write-AutoLog {
    param([string]$Message, [string]$Level = "INFO")
    $LogEntry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"
    Write-Host $LogEntry
    
    if (-not (Test-Path $LogPath)) {
        New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
    }
    
    $LogFile = "$LogPath\auto_backup_$Timestamp.log"
    Add-Content -Path $LogFile -Value $LogEntry
}

# Função para enviar notificação por email
function Send-BackupNotification {
    param(
        [string]$Status,
        [string]$Details,
        [hashtable]$Config
    )
    
    if (-not $Config.EnableEmailNotification -or [string]::IsNullOrEmpty($Config.EmailTo)) {
        return
    }
    
    try {
        $Subject = "Hub Control - Backup $Status - $(Get-Date -Format 'dd/MM/yyyy HH:mm')"
        $Body = @"
<html>
<body>
<h2>🔄 Relatório de Backup Automático - Hub Control</h2>
<p><strong>Status:</strong> $Status</p>
<p><strong>Data/Hora:</strong> $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')</p>
<p><strong>Projeto:</strong> $($Config.ProjectId)</p>
<p><strong>Detalhes:</strong></p>
<pre>$Details</pre>
<hr>
<p><em>Este é um email automático do sistema de backup do Hub Control.</em></p>
</body>
</html>
"@
        
        Send-MailMessage -To $Config.EmailTo -From $Config.EmailFrom -Subject $Subject -Body $Body -BodyAsHtml -SmtpServer $Config.SmtpServer
        Write-AutoLog "Notificação por email enviada para: $($Config.EmailTo)"
    } catch {
        Write-AutoLog "ERRO ao enviar email: $($_.Exception.Message)" "ERROR"
    }
}

# Função principal de backup automático
function Start-AutomatedBackup {
    Write-AutoLog "=== INICIANDO BACKUP AUTOMÁTICO ==="
    
    try {
        # Carregar configuração
        if ([string]::IsNullOrEmpty($ConfigFile)) {
            $ConfigFile = "$ScriptPath\..\config\backup-config.json"
        }
        
        if (-not (Test-Path $ConfigFile)) {
            throw "Arquivo de configuração não encontrado: $ConfigFile"
        }
        
        $Config = Get-Content $ConfigFile | ConvertFrom-Json
        Write-AutoLog "Configuração carregada: $ConfigFile"
        
        # Executar backup do banco de dados
        Write-AutoLog "Executando backup do banco de dados..."
        $DatabaseBackupScript = "$ProjectRoot\backup-database.ps1"
        
        if (Test-Path $DatabaseBackupScript) {
            $DbResult = & $DatabaseBackupScript -ProjectId $Config.ProjectId -DatabasePassword $Config.DatabasePassword -BackupPath $Config.BackupPath -BackupType "full" -Compress
            Write-AutoLog "Backup do banco de dados concluído"
        } else {
            Write-AutoLog "Script de backup do banco não encontrado: $DatabaseBackupScript" "WARNING"
        }
        
        # Executar backup dos arquivos
        Write-AutoLog "Executando backup dos arquivos..."
        $FileBackupScript = "$ProjectRoot\backup-script.ps1"
        
        if (Test-Path $FileBackupScript) {
            $FileResult = & $FileBackupScript -BackupType "completo" -BackupPath $Config.BackupPath
            Write-AutoLog "Backup dos arquivos concluído"
        } else {
            Write-AutoLog "Script de backup de arquivos não encontrado: $FileBackupScript" "WARNING"
        }
        
        # Limpeza de backups antigos (manter últimos 7 dias)
        Write-AutoLog "Executando limpeza de backups antigos..."
        $CutoffDate = (Get-Date).AddDays(-7)
        $OldBackups = Get-ChildItem -Path $Config.BackupPath -Recurse -File | Where-Object { $_.CreationTime -lt $CutoffDate }
        
        foreach ($OldBackup in $OldBackups) {
            Remove-Item $OldBackup.FullName -Force
            Write-AutoLog "Backup antigo removido: $($OldBackup.Name)"
        }
        
        $Status = "SUCESSO ✅"
        $Details = "Backup automático executado com sucesso.`nBackups antigos limpos: $($OldBackups.Count) arquivos"
        
        Write-AutoLog "=== BACKUP AUTOMÁTICO CONCLUÍDO COM SUCESSO ==="
        
        # Enviar notificação
        Send-BackupNotification -Status $Status -Details $Details -Config $Config
        
    } catch {
        $Status = "ERRO ❌"
        $Details = "Erro durante o backup automático: $($_.Exception.Message)"
        
        Write-AutoLog "ERRO CRÍTICO: $($_.Exception.Message)" "ERROR"
        Write-AutoLog "=== BACKUP AUTOMÁTICO FALHOU ==="
        
        # Enviar notificação de erro
        if ($Config) {
            Send-BackupNotification -Status $Status -Details $Details -Config $Config
        }
    }
}

# Executar backup
Start-AutomatedBackup
'@
    
    $AutomationFile = "$BackupPath\automation\run-automated-backup.ps1"
    
    if (-not (Test-Path (Split-Path $AutomationFile))) {
        New-Item -ItemType Directory -Path (Split-Path $AutomationFile) -Force | Out-Null
    }
    
    $AutomationScript | Out-File -FilePath $AutomationFile -Encoding UTF8
    
    Write-Log "Script de automação criado: $AutomationFile"
    return $AutomationFile
}

# Função para criar tarefa agendada
function New-ScheduledBackupTask {
    param([string]$AutomationScript)
    
    Write-Log "Criando tarefa agendada: $TaskName"
    
    try {
        # Remover tarefa existente se houver
        $ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        if ($ExistingTask) {
            Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
            Write-Log "Tarefa existente removida"
        }
        
        # Configurar trigger baseado no agendamento
        switch ($Schedule.ToLower()) {
            "daily" {
                $Trigger = New-ScheduledTaskTrigger -Daily -At $Time
                Write-Log "Agendamento diário configurado para: $Time"
            }
            "weekly" {
                $Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At $Time
                Write-Log "Agendamento semanal configurado para domingos às: $Time"
            }
            "monthly" {
                $Trigger = New-ScheduledTaskTrigger -Weekly -WeeksInterval 4 -DaysOfWeek Sunday -At $Time
                Write-Log "Agendamento mensal configurado para primeiro domingo do mês às: $Time"
            }
            default {
                throw "Agendamento inválido: $Schedule. Use: daily, weekly, monthly"
            }
        }
        
        # Configurar ação
        $Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$AutomationScript`""
        
        # Configurar configurações da tarefa
        $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable
        
        # Configurar principal (executar como SYSTEM)
        $Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
        
        # Registrar tarefa
        Register-ScheduledTask -TaskName $TaskName -Trigger $Trigger -Action $Action -Settings $Settings -Principal $Principal -Description "Backup automático do Hub Control"
        
        Write-Log "Tarefa agendada criada com sucesso: $TaskName"
        
        # Verificar se a tarefa foi criada
        $CreatedTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        if ($CreatedTask) {
            Write-Log "Status da tarefa: $($CreatedTask.State)"
            return $true
        } else {
            throw "Falha ao verificar a criação da tarefa"
        }
        
    } catch {
        Write-Log "ERRO ao criar tarefa agendada: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Função para remover agendamento
function Remove-ScheduledBackupTask {
    Write-Log "Removendo tarefa agendada: $TaskName"
    
    try {
        $ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        if ($ExistingTask) {
            Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
            Write-Log "Tarefa agendada removida com sucesso"
            return $true
        } else {
            Write-Log "Tarefa agendada não encontrada" "WARNING"
            return $false
        }
    } catch {
        Write-Log "ERRO ao remover tarefa agendada: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Função para testar configuração
function Test-BackupConfiguration {
    Write-Log "Testando configuração de backup..."
    
    $Issues = @()
    
    # Verificar parâmetros obrigatórios
    if ([string]::IsNullOrEmpty($ProjectId)) {
        $Issues += "ProjectId é obrigatório"
    }
    
    if ([string]::IsNullOrEmpty($DatabasePassword)) {
        $Issues += "DatabasePassword é obrigatório"
    }
    
    # Verificar se os scripts de backup existem
    $DatabaseScript = "$ScriptPath\backup-database.ps1"
    $FileScript = "$ScriptPath\backup-script.ps1"
    
    if (-not (Test-Path $DatabaseScript)) {
        $Issues += "Script de backup do banco não encontrado: $DatabaseScript"
    }
    
    if (-not (Test-Path $FileScript)) {
        $Issues += "Script de backup de arquivos não encontrado: $FileScript"
    }
    
    # Verificar diretório de backup
    if (-not (Test-Path $BackupPath)) {
        try {
            New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
            Write-Log "Diretório de backup criado: $BackupPath"
        } catch {
            $Issues += "Não foi possível criar diretório de backup: $BackupPath"
        }
    }
    
    # Verificar configuração de email
    if ($EnableEmailNotification) {
        if ([string]::IsNullOrEmpty($EmailTo)) {
            $Issues += "EmailTo é obrigatório quando notificação por email está habilitada"
        }
        if ([string]::IsNullOrEmpty($EmailFrom)) {
            $Issues += "EmailFrom é obrigatório quando notificação por email está habilitada"
        }
        if ([string]::IsNullOrEmpty($SmtpServer)) {
            $Issues += "SmtpServer é obrigatório quando notificação por email está habilitada"
        }
    }
    
    if ($Issues.Count -gt 0) {
        Write-Log "Problemas encontrados na configuração:" "ERROR"
        foreach ($Issue in $Issues) {
            Write-Log "  - $Issue" "ERROR"
        }
        return $false
    }
    
    Write-Log "Configuração validada com sucesso"
    return $true
}

# Função para mostrar status do agendamento
function Show-BackupScheduleStatus {
    Write-Log "Verificando status do agendamento..."
    
    $Task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    
    if ($Task) {
        Write-Host "`n📅 STATUS DO AGENDAMENTO" -ForegroundColor Yellow
        Write-Host "========================" -ForegroundColor Yellow
        Write-Host "Nome da Tarefa: $($Task.TaskName)" -ForegroundColor Cyan
        Write-Host "Status: $($Task.State)" -ForegroundColor Cyan
        Write-Host "Descrição: $($Task.Description)" -ForegroundColor Cyan
        
        $TaskInfo = Get-ScheduledTaskInfo -TaskName $TaskName
        Write-Host "Última Execução: $($TaskInfo.LastRunTime)" -ForegroundColor Cyan
        Write-Host "Próxima Execução: $($TaskInfo.NextRunTime)" -ForegroundColor Cyan
        Write-Host "Último Resultado: $($TaskInfo.LastTaskResult)" -ForegroundColor Cyan
        
        return $true
    } else {
        Write-Host "`n❌ AGENDAMENTO NÃO CONFIGURADO" -ForegroundColor Red
        Write-Host "Execute este script novamente para configurar o backup automático." -ForegroundColor Yellow
        return $false
    }
}

# FUNÇÃO PRINCIPAL
function Start-AutomatedBackupSetup {
    Write-Log "=== CONFIGURAÇÃO DE BACKUP AUTOMÁTICO ==="
    
    # Verificar privilégios de administrador
    if (-not (Test-AdminPrivileges)) {
        Write-Host "`n❌ ERRO: Este script requer privilégios de administrador" -ForegroundColor Red
        Write-Host "Execute o PowerShell como Administrador e tente novamente." -ForegroundColor Yellow
        return
    }
    
    # Remover agendamento se solicitado
    if ($RemoveSchedule) {
        Remove-ScheduledBackupTask
        Write-Host "`n✅ Agendamento removido com sucesso!" -ForegroundColor Green
        return
    }
    
    # Mostrar status se apenas consulta
    if ($SetupOnly) {
        Show-BackupScheduleStatus
        return
    }
    
    # Validar configuração
    if (-not (Test-BackupConfiguration)) {
        Write-Host "`n❌ CONFIGURAÇÃO INVÁLIDA" -ForegroundColor Red
        Write-Host "Corrija os problemas listados acima e tente novamente." -ForegroundColor Yellow
        return
    }
    
    try {
        # Criar configuração
        $ConfigFile = New-BackupConfiguration
        
        # Criar script de automação
        $AutomationScript = New-AutomationScript
        
        # Criar tarefa agendada
        $TaskCreated = New-ScheduledBackupTask -AutomationScript $AutomationScript
        
        if ($TaskCreated) {
            Write-Host "`n🎉 BACKUP AUTOMÁTICO CONFIGURADO COM SUCESSO!" -ForegroundColor Green
            Write-Host "📅 Agendamento: $Schedule às $Time" -ForegroundColor Cyan
            Write-Host "📁 Destino: $BackupPath" -ForegroundColor Cyan
            Write-Host "📧 Email: $(if ($EnableEmailNotification) { 'Habilitado' } else { 'Desabilitado' })" -ForegroundColor Cyan
            Write-Host "📋 Configuração: $ConfigFile" -ForegroundColor Cyan
            Write-Host "🤖 Script: $AutomationScript" -ForegroundColor Cyan
            
            Write-Host "`n📚 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
            Write-Host "1. Verifique o status: .\setup-automated-backup.ps1 -SetupOnly" -ForegroundColor Gray
            Write-Host "2. Teste manualmente: .\backup-script.ps1" -ForegroundColor Gray
            Write-Host "3. Monitore os logs em: $LogPath" -ForegroundColor Gray
            
            # Mostrar status
            Show-BackupScheduleStatus
        } else {
            Write-Host "`n❌ FALHA NA CONFIGURAÇÃO DO AGENDAMENTO" -ForegroundColor Red
        }
        
    } catch {
        Write-Log "ERRO CRÍTICO: $($_.Exception.Message)" "ERROR"
        Write-Host "`n❌ ERRO DURANTE A CONFIGURAÇÃO" -ForegroundColor Red
        Write-Host "Detalhes: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Mostrar ajuda se parâmetros obrigatórios não foram fornecidos
if (([string]::IsNullOrEmpty($ProjectId) -or [string]::IsNullOrEmpty($DatabasePassword)) -and -not $SetupOnly -and -not $RemoveSchedule) {
    Write-Host "`n🤖 CONFIGURAÇÃO DE BACKUP AUTOMÁTICO" -ForegroundColor Yellow
    Write-Host "=====================================" -ForegroundColor Yellow
    Write-Host "`n⚠️  EXECUTE COMO ADMINISTRADOR" -ForegroundColor Red
    Write-Host "`nUso:" -ForegroundColor White
    Write-Host ".\setup-automated-backup.ps1 -ProjectId 'seu-project-id' -DatabasePassword 'sua-senha'" -ForegroundColor Cyan
    Write-Host "`nParâmetros:" -ForegroundColor White
    Write-Host "  -ProjectId                : ID do projeto Supabase (obrigatório)" -ForegroundColor Gray
    Write-Host "  -DatabasePassword         : Senha do banco de dados (obrigatório)" -ForegroundColor Gray
    Write-Host "  -Schedule                 : Frequência (daily, weekly, monthly)" -ForegroundColor Gray
    Write-Host "  -Time                     : Horário de execução (HH:mm)" -ForegroundColor Gray
    Write-Host "  -BackupPath               : Caminho para salvar backups" -ForegroundColor Gray
    Write-Host "  -EnableEmailNotification  : Habilitar notificações por email" -ForegroundColor Gray
    Write-Host "  -EmailTo                  : Email de destino" -ForegroundColor Gray
    Write-Host "  -EmailFrom                : Email de origem" -ForegroundColor Gray
    Write-Host "  -SmtpServer               : Servidor SMTP" -ForegroundColor Gray
    Write-Host "  -SetupOnly                : Apenas mostrar status" -ForegroundColor Gray
    Write-Host "  -RemoveSchedule           : Remover agendamento" -ForegroundColor Gray
    Write-Host "`nExemplos:" -ForegroundColor White
    Write-Host "  .\setup-automated-backup.ps1 -ProjectId 'abc123' -DatabasePassword 'senha123'" -ForegroundColor Cyan
    Write-Host "  .\setup-automated-backup.ps1 -ProjectId 'abc123' -DatabasePassword 'senha123' -Schedule 'weekly' -Time '03:00'" -ForegroundColor Cyan
    Write-Host "  .\setup-automated-backup.ps1 -SetupOnly" -ForegroundColor Cyan
    Write-Host "  .\setup-automated-backup.ps1 -RemoveSchedule" -ForegroundColor Cyan
} else {
    # EXECUTAR CONFIGURAÇÃO
    Start-AutomatedBackupSetup
}

Write-Host "`n📚 Para mais informações, consulte: BACKUP_BACKEND_GUIDE.md" -ForegroundColor Yellow