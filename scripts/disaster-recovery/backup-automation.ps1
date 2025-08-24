# 💾 Script de Backup Automatizado - Hub Control
# Versão: 1.0.0
# Data: 01/12/2024

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("incremental", "full", "differential", "verify")]
    [string]$BackupType,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("test", "production")]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [switch]$Compress = $true,
    
    [Parameter(Mandatory=$false)]
    [switch]$Encrypt = $true,
    
    [Parameter(Mandatory=$false)]
    [int]$RetentionDays = 30
)

# Configurações
$ErrorActionPreference = "Stop"
$VerbosePreference = "Continue"

# Cores para output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Cyan"
$Magenta = "Magenta"

# Configurações por ambiente
$Config = @{
    test = @{
        DatabaseUrl = $env:DATABASE_URL_TEST
        BackupPath = "C:\Backups\HubControl\Test"
        S3Bucket = "hubcontrol-backups-test"
        SlackWebhook = $env:SLACK_WEBHOOK_TEST
        MaxBackupSize = "5GB"
    }
    production = @{
        DatabaseUrl = $env:DATABASE_URL
        BackupPath = "C:\Backups\HubControl\Production"
        S3Bucket = "hubcontrol-backups-prod"
        SlackWebhook = $env:SLACK_WEBHOOK_BACKUP
        MaxBackupSize = "50GB"
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
    $logFile = "backup-$(Get-Date -Format 'yyyyMMdd').log"
    $logPath = Join-Path $Config[$Environment].BackupPath "logs" $logFile
    
    # Criar diretório se não existir
    $logDir = Split-Path $logPath -Parent
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    
    Add-Content -Path $logPath -Value $logMessage
}

# Função para enviar notificação Slack
function Send-SlackNotification {
    param(
        [string]$Message,
        [string]$Color = "good",
        [hashtable]$Fields = @{}
    )
    
    if (-not $Config[$Environment].SlackWebhook) {
        Write-Log "Webhook do Slack não configurado" "WARNING" $Yellow
        return
    }
    
    try {
        $attachmentFields = @()
        foreach ($key in $Fields.Keys) {
            $attachmentFields += @{
                title = $key
                value = $Fields[$key]
                short = $true
            }
        }
        
        $payload = @{
            text = $Message
            attachments = @(
                @{
                    color = $Color
                    fields = $attachmentFields + @(
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
        } | ConvertTo-Json -Depth 4
        
        Invoke-RestMethod -Uri $Config[$Environment].SlackWebhook -Method Post -Body $payload -ContentType "application/json"
        Write-Log "📱 Notificação Slack enviada" "SUCCESS" $Green
    }
    catch {
        Write-Log "❌ Erro ao enviar notificação Slack: $($_.Exception.Message)" "ERROR" $Red
    }
}

# Função para criar backup do banco de dados
function Backup-Database {
    param(
        [string]$BackupPath,
        [string]$BackupType
    )
    
    try {
        Write-Log "Iniciando backup do banco de dados ($BackupType)..." "INFO" $Blue
        
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backupFileName = "hubcontrol_db_${BackupType}_${timestamp}.sql"
        $backupFilePath = Join-Path $BackupPath "database" $backupFileName
        
        # Criar diretório se não existir
        $backupDir = Split-Path $backupFilePath -Parent
        if (-not (Test-Path $backupDir)) {
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        }
        
        # Extrair informações da connection string
        $dbUrl = $Config[$Environment].DatabaseUrl
        if (-not $dbUrl) {
            throw "URL do banco de dados não configurada"
        }
        
        # Parse da URL do PostgreSQL (formato: postgresql://user:pass@host:port/db)
        if ($dbUrl -match "postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)") {
            $dbUser = $matches[1]
            $dbPass = $matches[2]
            $dbHost = $matches[3]
            $dbPort = $matches[4]
            $dbName = $matches[5]
        } else {
            throw "Formato de URL do banco inválido"
        }
        
        # Configurar variáveis de ambiente para pg_dump
        $env:PGPASSWORD = $dbPass
        
        # Comando pg_dump baseado no tipo de backup
        $pgDumpArgs = @(
            "-h", $dbHost,
            "-p", $dbPort,
            "-U", $dbUser,
            "-d", $dbName,
            "--verbose",
            "--no-password",
            "-f", $backupFilePath
        )
        
        switch ($BackupType) {
            "full" {
                $pgDumpArgs += @("--clean", "--create", "--if-exists")
            }
            "incremental" {
                # Para incremental, usar WAL shipping ou logical replication
                # Por simplicidade, fazemos um dump completo com timestamp
                $pgDumpArgs += @("--data-only")
            }
            "differential" {
                # Backup diferencial baseado em modificações
                $pgDumpArgs += @("--data-only")
            }
        }
        
        # Executar pg_dump
        Write-Log "Executando pg_dump..." "INFO" $Blue
        $startTime = Get-Date
        
        & pg_dump @pgDumpArgs
        
        if ($LASTEXITCODE -ne 0) {
            throw "pg_dump falhou com código de saída $LASTEXITCODE"
        }
        
        $endTime = Get-Date
        $duration = $endTime - $startTime
        
        # Limpar variável de ambiente
        Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
        
        # Verificar se arquivo foi criado
        if (-not (Test-Path $backupFilePath)) {
            throw "Arquivo de backup não foi criado"
        }
        
        $fileSize = (Get-Item $backupFilePath).Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
        
        Write-Log "✅ Backup do banco concluído: $backupFileName ($fileSizeMB MB)" "SUCCESS" $Green
        Write-Log "⏱️ Duração: $($duration.ToString('hh\:mm\:ss'))" "INFO" $Blue
        
        return @{
            FilePath = $backupFilePath
            FileName = $backupFileName
            SizeMB = $fileSizeMB
            Duration = $duration
        }
    }
    catch {
        Write-Log "❌ Erro no backup do banco: $($_.Exception.Message)" "ERROR" $Red
        throw
    }
}

# Função para backup de arquivos
function Backup-Files {
    param(
        [string]$BackupPath,
        [string]$BackupType
    )
    
    try {
        Write-Log "Iniciando backup de arquivos ($BackupType)..." "INFO" $Blue
        
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backupFileName = "hubcontrol_files_${BackupType}_${timestamp}.zip"
        $backupFilePath = Join-Path $BackupPath "files" $backupFileName
        
        # Criar diretório se não existir
        $backupDir = Split-Path $backupFilePath -Parent
        if (-not (Test-Path $backupDir)) {
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        }
        
        # Diretórios para backup
        $sourceDirectories = @(
            "uploads",
            "documents",
            "exports",
            "logs",
            "config"
        )
        
        $startTime = Get-Date
        
        # Criar arquivo ZIP
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $zip = [System.IO.Compression.ZipFile]::Open($backupFilePath, 'Create')
        
        try {
            foreach ($dir in $sourceDirectories) {
                $sourcePath = Join-Path (Get-Location) $dir
                
                if (Test-Path $sourcePath) {
                    Write-Log "Adicionando diretório: $dir" "INFO" $Blue
                    
                    Get-ChildItem -Path $sourcePath -Recurse -File | ForEach-Object {
                        $relativePath = $_.FullName.Substring((Get-Location).Path.Length + 1)
                        $entry = $zip.CreateEntry($relativePath)
                        $entryStream = $entry.Open()
                        $fileStream = $_.OpenRead()
                        $fileStream.CopyTo($entryStream)
                        $fileStream.Close()
                        $entryStream.Close()
                    }
                } else {
                    Write-Log "Diretório não encontrado: $dir" "WARNING" $Yellow
                }
            }
        }
        finally {
            $zip.Dispose()
        }
        
        $endTime = Get-Date
        $duration = $endTime - $startTime
        
        # Verificar se arquivo foi criado
        if (-not (Test-Path $backupFilePath)) {
            throw "Arquivo de backup não foi criado"
        }
        
        $fileSize = (Get-Item $backupFilePath).Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
        
        Write-Log "✅ Backup de arquivos concluído: $backupFileName ($fileSizeMB MB)" "SUCCESS" $Green
        Write-Log "⏱️ Duração: $($duration.ToString('hh\:mm\:ss'))" "INFO" $Blue
        
        return @{
            FilePath = $backupFilePath
            FileName = $backupFileName
            SizeMB = $fileSizeMB
            Duration = $duration
        }
    }
    catch {
        Write-Log "❌ Erro no backup de arquivos: $($_.Exception.Message)" "ERROR" $Red
        throw
    }
}

# Função para criptografar backup
function Encrypt-Backup {
    param(
        [string]$FilePath
    )
    
    if (-not $Encrypt) {
        return $FilePath
    }
    
    try {
        Write-Log "Criptografando backup..." "INFO" $Blue
        
        $encryptedPath = "$FilePath.enc"
        $password = $env:BACKUP_ENCRYPTION_KEY
        
        if (-not $password) {
            Write-Log "Chave de criptografia não configurada" "WARNING" $Yellow
            return $FilePath
        }
        
        # Usar OpenSSL para criptografia (se disponível)
        if (Get-Command openssl -ErrorAction SilentlyContinue) {
            & openssl enc -aes-256-cbc -salt -in $FilePath -out $encryptedPath -k $password
            
            if ($LASTEXITCODE -eq 0) {
                Remove-Item $FilePath -Force
                Write-Log "✅ Backup criptografado" "SUCCESS" $Green
                return $encryptedPath
            }
        }
        
        Write-Log "OpenSSL não disponível, backup não criptografado" "WARNING" $Yellow
        return $FilePath
    }
    catch {
        Write-Log "❌ Erro na criptografia: $($_.Exception.Message)" "ERROR" $Red
        return $FilePath
    }
}

# Função para comprimir backup
function Compress-Backup {
    param(
        [string]$FilePath
    )
    
    if (-not $Compress -or $FilePath.EndsWith(".zip")) {
        return $FilePath
    }
    
    try {
        Write-Log "Comprimindo backup..." "INFO" $Blue
        
        $compressedPath = "$FilePath.gz"
        
        # Usar 7-Zip se disponível
        if (Get-Command 7z -ErrorAction SilentlyContinue) {
            & 7z a -tgzip $compressedPath $FilePath
            
            if ($LASTEXITCODE -eq 0) {
                Remove-Item $FilePath -Force
                
                $originalSize = (Get-Item $FilePath -ErrorAction SilentlyContinue).Length
                $compressedSize = (Get-Item $compressedPath).Length
                $compressionRatio = [math]::Round((1 - ($compressedSize / $originalSize)) * 100, 1)
                
                Write-Log "✅ Backup comprimido ($compressionRatio% redução)" "SUCCESS" $Green
                return $compressedPath
            }
        }
        
        Write-Log "7-Zip não disponível, backup não comprimido" "WARNING" $Yellow
        return $FilePath
    }
    catch {
        Write-Log "❌ Erro na compressão: $($_.Exception.Message)" "ERROR" $Red
        return $FilePath
    }
}

# Função para upload para S3
function Upload-ToS3 {
    param(
        [string]$FilePath,
        [string]$S3Key
    )
    
    try {
        Write-Log "Enviando backup para S3..." "INFO" $Blue
        
        $bucket = $Config[$Environment].S3Bucket
        
        if (-not $bucket) {
            Write-Log "Bucket S3 não configurado" "WARNING" $Yellow
            return
        }
        
        # Verificar se AWS CLI está disponível
        if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
            Write-Log "AWS CLI não encontrado" "WARNING" $Yellow
            return
        }
        
        $startTime = Get-Date
        
        # Upload com multipart para arquivos grandes
        & aws s3 cp $FilePath "s3://$bucket/$S3Key" --storage-class STANDARD_IA
        
        if ($LASTEXITCODE -eq 0) {
            $endTime = Get-Date
            $duration = $endTime - $startTime
            
            Write-Log "✅ Upload para S3 concluído" "SUCCESS" $Green
            Write-Log "⏱️ Duração do upload: $($duration.ToString('hh\:mm\:ss'))" "INFO" $Blue
            
            return "s3://$bucket/$S3Key"
        } else {
            throw "Upload para S3 falhou"
        }
    }
    catch {
        Write-Log "❌ Erro no upload para S3: $($_.Exception.Message)" "ERROR" $Red
        throw
    }
}

# Função para verificar integridade do backup
function Test-BackupIntegrity {
    param(
        [string]$FilePath
    )
    
    try {
        Write-Log "Verificando integridade do backup..." "INFO" $Blue
        
        # Verificar se arquivo existe
        if (-not (Test-Path $FilePath)) {
            throw "Arquivo de backup não encontrado: $FilePath"
        }
        
        # Verificar tamanho mínimo
        $fileSize = (Get-Item $FilePath).Length
        if ($fileSize -lt 1KB) {
            throw "Arquivo de backup muito pequeno: $fileSize bytes"
        }
        
        # Verificar integridade baseado na extensão
        $extension = [System.IO.Path]::GetExtension($FilePath).ToLower()
        
        switch ($extension) {
            ".zip" {
                # Testar arquivo ZIP
                Add-Type -AssemblyName System.IO.Compression.FileSystem
                try {
                    $zip = [System.IO.Compression.ZipFile]::OpenRead($FilePath)
                    $entryCount = $zip.Entries.Count
                    $zip.Dispose()
                    
                    if ($entryCount -eq 0) {
                        throw "Arquivo ZIP está vazio"
                    }
                    
                    Write-Log "✅ Arquivo ZIP válido ($entryCount entradas)" "SUCCESS" $Green
                }
                catch {
                    throw "Arquivo ZIP corrompido: $($_.Exception.Message)"
                }
            }
            ".sql" {
                # Verificar arquivo SQL
                $content = Get-Content $FilePath -TotalCount 10
                if ($content -notmatch "(CREATE|INSERT|COPY|--)") {
                    throw "Arquivo SQL não parece válido"
                }
                
                Write-Log "✅ Arquivo SQL válido" "SUCCESS" $Green
            }
            ".gz" {
                # Testar arquivo GZIP
                if (Get-Command 7z -ErrorAction SilentlyContinue) {
                    & 7z t $FilePath | Out-Null
                    if ($LASTEXITCODE -ne 0) {
                        throw "Arquivo GZIP corrompido"
                    }
                    
                    Write-Log "✅ Arquivo GZIP válido" "SUCCESS" $Green
                }
            }
            ".enc" {
                # Para arquivos criptografados, apenas verificar tamanho
                Write-Log "✅ Arquivo criptografado (verificação básica)" "SUCCESS" $Green
            }
            default {
                Write-Log "⚠️ Tipo de arquivo não reconhecido para verificação" "WARNING" $Yellow
            }
        }
        
        return $true
    }
    catch {
        Write-Log "❌ Falha na verificação de integridade: $($_.Exception.Message)" "ERROR" $Red
        return $false
    }
}

# Função para limpeza de backups antigos
function Remove-OldBackups {
    param(
        [string]$BackupPath,
        [int]$RetentionDays
    )
    
    try {
        Write-Log "Limpando backups antigos (retenção: $RetentionDays dias)..." "INFO" $Blue
        
        $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
        $removedCount = 0
        $freedSpace = 0
        
        Get-ChildItem -Path $BackupPath -Recurse -File | Where-Object {
            $_.LastWriteTime -lt $cutoffDate
        } | ForEach-Object {
            $freedSpace += $_.Length
            Remove-Item $_.FullName -Force
            $removedCount++
            Write-Log "Removido: $($_.Name)" "INFO" $Blue
        }
        
        $freedSpaceMB = [math]::Round($freedSpace / 1MB, 2)
        
        if ($removedCount -gt 0) {
            Write-Log "✅ Limpeza concluída: $removedCount arquivos removidos ($freedSpaceMB MB liberados)" "SUCCESS" $Green
        } else {
            Write-Log "ℹ️ Nenhum backup antigo encontrado" "INFO" $Blue
        }
    }
    catch {
        Write-Log "❌ Erro na limpeza de backups: $($_.Exception.Message)" "ERROR" $Red
    }
}

# Função principal de backup
function Start-Backup {
    Write-Log "🚀 INICIANDO PROCESSO DE BACKUP" "INFO" $Magenta
    Write-Log "Tipo: $BackupType" "INFO" $Blue
    Write-Log "Ambiente: $Environment" "INFO" $Blue
    Write-Log "Compressão: $Compress" "INFO" $Blue
    Write-Log "Criptografia: $Encrypt" "INFO" $Blue
    
    $backupPath = $Config[$Environment].BackupPath
    $overallStartTime = Get-Date
    $backupResults = @()
    
    try {
        # Criar diretório de backup se não existir
        if (-not (Test-Path $backupPath)) {
            New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
            Write-Log "Diretório de backup criado: $backupPath" "INFO" $Blue
        }
        
        # Backup do banco de dados
        Write-Log "📊 Iniciando backup do banco de dados..." "INFO" $Blue
        $dbBackup = Backup-Database $backupPath $BackupType
        
        # Processar backup do banco
        $dbBackup.FilePath = Compress-Backup $dbBackup.FilePath
        $dbBackup.FilePath = Encrypt-Backup $dbBackup.FilePath
        
        # Verificar integridade
        if (Test-BackupIntegrity $dbBackup.FilePath) {
            $dbBackup.Integrity = "OK"
        } else {
            $dbBackup.Integrity = "FAILED"
            throw "Falha na verificação de integridade do backup do banco"
        }
        
        # Upload para S3
        $s3Key = "database/$(Split-Path $dbBackup.FilePath -Leaf)"
        $dbBackup.S3Location = Upload-ToS3 $dbBackup.FilePath $s3Key
        
        $backupResults += $dbBackup
        
        # Backup de arquivos
        Write-Log "📁 Iniciando backup de arquivos..." "INFO" $Blue
        $filesBackup = Backup-Files $backupPath $BackupType
        
        # Processar backup de arquivos
        $filesBackup.FilePath = Encrypt-Backup $filesBackup.FilePath
        
        # Verificar integridade
        if (Test-BackupIntegrity $filesBackup.FilePath) {
            $filesBackup.Integrity = "OK"
        } else {
            $filesBackup.Integrity = "FAILED"
            Write-Log "⚠️ Falha na verificação de integridade do backup de arquivos" "WARNING" $Yellow
        }
        
        # Upload para S3
        $s3Key = "files/$(Split-Path $filesBackup.FilePath -Leaf)"
        $filesBackup.S3Location = Upload-ToS3 $filesBackup.FilePath $s3Key
        
        $backupResults += $filesBackup
        
        # Limpeza de backups antigos
        Remove-OldBackups $backupPath $RetentionDays
        
        $overallEndTime = Get-Date
        $totalDuration = $overallEndTime - $overallStartTime
        $totalSize = ($backupResults | Measure-Object -Property SizeMB -Sum).Sum
        
        Write-Log "✅ BACKUP CONCLUÍDO COM SUCESSO" "SUCCESS" $Green
        Write-Log "⏱️ Duração total: $($totalDuration.ToString('hh\:mm\:ss'))" "INFO" $Blue
        Write-Log "📦 Tamanho total: $totalSize MB" "INFO" $Blue
        
        # Notificação de sucesso
        $fields = @{
            "Tipo" = $BackupType.ToUpper()
            "Duração" = $totalDuration.ToString('hh\:mm\:ss')
            "Tamanho" = "$totalSize MB"
            "Arquivos" = $backupResults.Count
        }
        
        Send-SlackNotification "✅ Backup concluído com sucesso ($Environment)" "good" $fields
        
        return $backupResults
    }
    catch {
        $overallEndTime = Get-Date
        $totalDuration = $overallEndTime - $overallStartTime
        
        Write-Log "❌ FALHA NO BACKUP: $($_.Exception.Message)" "ERROR" $Red
        Write-Log "⏱️ Duração até falha: $($totalDuration.ToString('hh\:mm\:ss'))" "INFO" $Blue
        
        # Notificação de falha
        $fields = @{
            "Tipo" = $BackupType.ToUpper()
            "Erro" = $_.Exception.Message
            "Duração" = $totalDuration.ToString('hh\:mm\:ss')
        }
        
        Send-SlackNotification "❌ Falha no backup ($Environment)" "danger" $fields
        
        throw
    }
}

# Função para verificar backups existentes
function Test-ExistingBackups {
    Write-Log "🔍 VERIFICANDO BACKUPS EXISTENTES" "INFO" $Magenta
    
    $backupPath = $Config[$Environment].BackupPath
    
    if (-not (Test-Path $backupPath)) {
        Write-Log "❌ Diretório de backup não encontrado: $backupPath" "ERROR" $Red
        return
    }
    
    $backupFiles = Get-ChildItem -Path $backupPath -Recurse -File | Sort-Object LastWriteTime -Descending
    
    if ($backupFiles.Count -eq 0) {
        Write-Log "⚠️ Nenhum backup encontrado" "WARNING" $Yellow
        return
    }
    
    Write-Log "📋 Backups encontrados: $($backupFiles.Count)" "INFO" $Blue
    
    $validBackups = 0
    $corruptedBackups = 0
    $totalSize = 0
    
    foreach ($file in $backupFiles | Select-Object -First 10) {
        Write-Log "Verificando: $($file.Name)" "INFO" $Blue
        
        if (Test-BackupIntegrity $file.FullName) {
            $validBackups++
            Write-Log "  ✅ Válido" "SUCCESS" $Green
        } else {
            $corruptedBackups++
            Write-Log "  ❌ Corrompido" "ERROR" $Red
        }
        
        $totalSize += $file.Length
    }
    
    $totalSizeMB = [math]::Round($totalSize / 1MB, 2)
    
    Write-Log "📊 Resumo da verificação:" "INFO" $Blue
    Write-Log "  ✅ Backups válidos: $validBackups" "SUCCESS" $Green
    Write-Log "  ❌ Backups corrompidos: $corruptedBackups" "ERROR" $Red
    Write-Log "  📦 Tamanho total verificado: $totalSizeMB MB" "INFO" $Blue
    
    # Notificação
    $fields = @{
        "Total" = $backupFiles.Count
        "Válidos" = $validBackups
        "Corrompidos" = $corruptedBackups
        "Tamanho" = "$totalSizeMB MB"
    }
    
    $color = if ($corruptedBackups -eq 0) { "good" } else { "warning" }
    Send-SlackNotification "🔍 Verificação de backups concluída ($Environment)" $color $fields
}

# Validar parâmetros
if (-not $Config.ContainsKey($Environment)) {
    Write-Log "❌ Ambiente inválido: $Environment" "ERROR" $Red
    exit 1
}

# Executar ação baseada no tipo
try {
    switch ($BackupType) {
        "verify" {
            Test-ExistingBackups
        }
        default {
            $results = Start-Backup
            
            # Exibir resumo
            Write-Log "📋 RESUMO DO BACKUP:" "INFO" $Magenta
            foreach ($result in $results) {
                Write-Log "  📄 $($result.FileName)" "INFO" $Blue
                Write-Log "    📦 Tamanho: $($result.SizeMB) MB" "INFO" $Blue
                Write-Log "    ⏱️ Duração: $($result.Duration.ToString('hh\:mm\:ss'))" "INFO" $Blue
                Write-Log "    🔍 Integridade: $($result.Integrity)" "INFO" $Blue
                if ($result.S3Location) {
                    Write-Log "    ☁️ S3: $($result.S3Location)" "INFO" $Blue
                }
            }
        }
    }
}
catch {
    Write-Log "❌ Erro crítico: $($_.Exception.Message)" "ERROR" $Red
    exit 1
}

Write-Log "Script de backup finalizado" "INFO" $Blue