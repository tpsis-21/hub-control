# ==========================================
# SCRIPT AUTOMATIZADO DE BACKUP DO HUB CONTROL
# ==========================================

param(
    [string]$BackupType = "complete",  # complete, database, files, config
    [string]$BackupPath = "C:\Backups\hub-control",
    [switch]$Compress = $true,
    [switch]$Verbose = $false
)

# Configurações
$ProjectPath = "C:\Users\pc-tp\Documents\hub-control"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFolder = "$BackupPath\backup_$Timestamp"
$LogFile = "$BackupPath\backup_log_$Timestamp.txt"

# Função para logging
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $LogEntry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"
    Write-Host $LogEntry
    Add-Content -Path $LogFile -Value $LogEntry
}

# Função para verificar pré-requisitos
function Test-Prerequisites {
    Write-Log "Verificando pré-requisitos..."
    
    # Verificar se o projeto existe
    if (-not (Test-Path $ProjectPath)) {
        Write-Log "ERRO: Diretório do projeto não encontrado: $ProjectPath" "ERROR"
        return $false
    }
    
    # Verificar se o diretório de backup existe
    if (-not (Test-Path $BackupPath)) {
        Write-Log "Criando diretório de backup: $BackupPath"
        New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    }
    
    # Verificar espaço em disco
    $Drive = (Get-Item $BackupPath).PSDrive
    $FreeSpace = [math]::Round($Drive.Free / 1GB, 2)
    if ($FreeSpace -lt 1) {
        Write-Log "AVISO: Pouco espaço em disco: ${FreeSpace}GB disponível" "WARNING"
    }
    
    Write-Log "Pré-requisitos verificados com sucesso"
    return $true
}

# Função para backup dos arquivos do projeto
function Backup-ProjectFiles {
    Write-Log "Iniciando backup dos arquivos do projeto..."
    
    $FilesBackupPath = "$BackupFolder\files"
    New-Item -ItemType Directory -Path $FilesBackupPath -Force | Out-Null
    
    # Lista de itens para backup
    $ItemsToBackup = @(
        "src",
        "public",
        "supabase",
        "components.json",
        "package.json",
        "package-lock.json",
        "next.config.js",
        "next.config.ts",
        "tailwind.config.ts",
        "tsconfig.json",
        "eslint.config.js",
        "jest.config.js",
        "postcss.config.js",
        "postcss.config.mjs",
        "*.md",
        "*.sql",
        "*.cjs"
    )
    
    $BackedUpItems = @()
    $SkippedItems = @()
    
    foreach ($Item in $ItemsToBackup) {
        $SourcePath = Join-Path $ProjectPath $Item
        
        if ($Item -like "*.*") {
            # Para padrões com wildcards
            $Files = Get-ChildItem -Path $ProjectPath -Filter $Item -ErrorAction SilentlyContinue
            foreach ($File in $Files) {
                try {
                    Copy-Item -Path $File.FullName -Destination $FilesBackupPath -Force
                    $BackedUpItems += $File.Name
                    if ($Verbose) { Write-Log "Copiado: $($File.Name)" }
                } catch {
                    Write-Log "ERRO ao copiar $($File.Name): $($_.Exception.Message)" "ERROR"
                    $SkippedItems += $File.Name
                }
            }
        } else {
            # Para diretórios e arquivos específicos
            if (Test-Path $SourcePath) {
                try {
                    Copy-Item -Path $SourcePath -Destination $FilesBackupPath -Recurse -Force
                    $BackedUpItems += $Item
                    if ($Verbose) { Write-Log "Copiado: $Item" }
                } catch {
                    Write-Log "ERRO ao copiar $Item: $($_.Exception.Message)" "ERROR"
                    $SkippedItems += $Item
                }
            } else {
                $SkippedItems += $Item
                if ($Verbose) { Write-Log "Não encontrado: $Item" "WARNING" }
            }
        }
    }
    
    Write-Log "Backup de arquivos concluído. Itens copiados: $($BackedUpItems.Count), Ignorados: $($SkippedItems.Count)"
    return @{ "Success" = $BackedUpItems; "Skipped" = $SkippedItems }
}

# Função para backup das configurações
function Backup-Configuration {
    Write-Log "Iniciando backup das configurações..."
    
    $ConfigBackupPath = "$BackupFolder\config"
    New-Item -ItemType Directory -Path $ConfigBackupPath -Force | Out-Null
    
    # Informações do projeto
    $PackageJson = Get-Content "$ProjectPath\package.json" -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
    
    # Informações do Git
    $GitInfo = @{}
    try {
        Set-Location $ProjectPath
        $GitInfo.Commit = git rev-parse HEAD 2>$null
        $GitInfo.Branch = git branch --show-current 2>$null
        $GitInfo.Status = git status --porcelain 2>$null
    } catch {
        $GitInfo.Error = "Git não disponível"
    }
    
    # Configuração do backup
    $BackupConfig = @{
        timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
        version = "1.0.0"
        environment = $env:NODE_ENV ?? "development"
        machine = @{
            name = $env:COMPUTERNAME
            user = $env:USERNAME
            os = [System.Environment]::OSVersion.VersionString
            powershell = $PSVersionTable.PSVersion.ToString()
        }
        project = @{
            name = $PackageJson.name ?? "hub-control"
            version = $PackageJson.version ?? "unknown"
            path = $ProjectPath
            dependencies_count = ($PackageJson.dependencies | Get-Member -MemberType NoteProperty).Count
            dev_dependencies_count = ($PackageJson.devDependencies | Get-Member -MemberType NoteProperty).Count
        }
        git = $GitInfo
        backup = @{
            type = $BackupType
            path = $BackupFolder
            compressed = $Compress
        }
    }
    
    # Salvar configuração
    $ConfigJson = $BackupConfig | ConvertTo-Json -Depth 10
    $ConfigJson | Out-File -FilePath "$ConfigBackupPath\backup_config.json" -Encoding UTF8
    
    # Backup de arquivos de configuração específicos
    $ConfigFiles = @(
        ".env.local",
        ".env.example",
        ".firebaserc",
        ".gitignore",
        "apphosting.yaml"
    )
    
    foreach ($ConfigFile in $ConfigFiles) {
        $SourcePath = Join-Path $ProjectPath $ConfigFile
        if (Test-Path $SourcePath) {
            Copy-Item -Path $SourcePath -Destination $ConfigBackupPath -Force
            if ($Verbose) { Write-Log "Config copiado: $ConfigFile" }
        }
    }
    
    Write-Log "Backup de configurações concluído"
    return $BackupConfig
}

# Função para gerar relatório de backup
function Generate-BackupReport {
    param(
        [hashtable]$FilesResult,
        [hashtable]$ConfigResult
    )
    
    Write-Log "Gerando relatório de backup..."
    
    $ReportPath = "$BackupFolder\backup_report.txt"
    
    $Report = @"
RELATÓRIO DE BACKUP - HUB CONTROL
=====================================

Data/Hora: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')
Tipo de Backup: $BackupType
Diretório: $BackupFolder

RESUMO:
-------
Arquivos copiados: $($FilesResult.Success.Count)
Arquivos ignorados: $($FilesResult.Skipped.Count)
Tamanho total: $(Get-BackupSize)

ARQUIVOS COPIADOS:
-----------------
$($FilesResult.Success -join "`n")

ARQUIVOS IGNORADOS:
------------------
$($FilesResult.Skipped -join "`n")

CONFIGURAÇÃO:
------------
Projeto: $($ConfigResult.project.name) v$($ConfigResult.project.version)
Commit: $($ConfigResult.git.Commit)
Branch: $($ConfigResult.git.Branch)
Máquina: $($ConfigResult.machine.name)
Usuário: $($ConfigResult.machine.user)

PRÓXIMOS PASSOS:
---------------
1. Verificar integridade do backup
2. Testar restauração (se necessário)
3. Agendar próximo backup
4. Limpar backups antigos

STATUS: CONCLUÍDO COM SUCESSO ✅
"@
    
    $Report | Out-File -FilePath $ReportPath -Encoding UTF8
    Write-Log "Relatório salvo em: $ReportPath"
}

# Função para obter tamanho do backup
function Get-BackupSize {
    if (Test-Path $BackupFolder) {
        $Size = (Get-ChildItem $BackupFolder -Recurse | Measure-Object -Property Length -Sum).Sum
        return [math]::Round($Size / 1MB, 2).ToString() + " MB"
    }
    return "0 MB"
}

# Função para compactar backup
function Compress-Backup {
    if ($Compress) {
        Write-Log "Compactando backup..."
        
        $ZipPath = "$BackupPath\hub-control_backup_$Timestamp.zip"
        
        try {
            Compress-Archive -Path $BackupFolder -DestinationPath $ZipPath -Force
            
            # Verificar se a compactação foi bem-sucedida
            if (Test-Path $ZipPath) {
                $OriginalSize = (Get-ChildItem $BackupFolder -Recurse | Measure-Object -Property Length -Sum).Sum
                $CompressedSize = (Get-Item $ZipPath).Length
                $CompressionRatio = [math]::Round((1 - ($CompressedSize / $OriginalSize)) * 100, 1)
                
                Write-Log "Backup compactado com sucesso: $ZipPath"
                Write-Log "Taxa de compressão: $CompressionRatio%"
                
                # Remover pasta original após compactação
                Remove-Item $BackupFolder -Recurse -Force
                Write-Log "Pasta temporária removida"
                
                return $ZipPath
            }
        } catch {
            Write-Log "ERRO na compactação: $($_.Exception.Message)" "ERROR"
        }
    }
    return $BackupFolder
}

# Função para limpeza de backups antigos
function Clean-OldBackups {
    param([int]$DaysToKeep = 30)
    
    Write-Log "Limpando backups antigos (mais de $DaysToKeep dias)..."
    
    $CutoffDate = (Get-Date).AddDays(-$DaysToKeep)
    $OldBackups = Get-ChildItem $BackupPath -Filter "*backup*" | Where-Object { $_.CreationTime -lt $CutoffDate }
    
    foreach ($OldBackup in $OldBackups) {
        try {
            Remove-Item $OldBackup.FullName -Recurse -Force
            Write-Log "Removido backup antigo: $($OldBackup.Name)"
        } catch {
            Write-Log "ERRO ao remover $($OldBackup.Name): $($_.Exception.Message)" "ERROR"
        }
    }
    
    Write-Log "Limpeza de backups antigos concluída"
}

# FUNÇÃO PRINCIPAL
function Start-Backup {
    Write-Log "=== INICIANDO BACKUP DO HUB CONTROL ==="
    Write-Log "Tipo: $BackupType"
    Write-Log "Destino: $BackupFolder"
    
    # Verificar pré-requisitos
    if (-not (Test-Prerequisites)) {
        Write-Log "Backup cancelado devido a falha nos pré-requisitos" "ERROR"
        return
    }
    
    # Criar diretório de backup
    New-Item -ItemType Directory -Path $BackupFolder -Force | Out-Null
    
    try {
        # Executar backup baseado no tipo
        $FilesResult = @{ "Success" = @(); "Skipped" = @() }
        $ConfigResult = @{}
        
        switch ($BackupType.ToLower()) {
            "complete" {
                $FilesResult = Backup-ProjectFiles
                $ConfigResult = Backup-Configuration
            }
            "files" {
                $FilesResult = Backup-ProjectFiles
            }
            "config" {
                $ConfigResult = Backup-Configuration
            }
            "database" {
                Write-Log "Backup de banco de dados deve ser feito via Supabase Dashboard" "WARNING"
                Write-Log "Consulte o BACKUP_BACKEND_GUIDE.md para instruções detalhadas"
            }
            default {
                Write-Log "Tipo de backup inválido: $BackupType" "ERROR"
                return
            }
        }
        
        # Gerar relatório
        Generate-BackupReport -FilesResult $FilesResult -ConfigResult $ConfigResult
        
        # Compactar se solicitado
        $FinalPath = Compress-Backup
        
        # Limpeza de backups antigos
        Clean-OldBackups
        
        Write-Log "=== BACKUP CONCLUÍDO COM SUCESSO ==="
        Write-Log "Localização final: $FinalPath"
        Write-Log "Tamanho: $(Get-BackupSize)"
        
        # Mostrar resumo
        Write-Host "`n🎉 BACKUP CONCLUÍDO!" -ForegroundColor Green
        Write-Host "📁 Local: $FinalPath" -ForegroundColor Cyan
        Write-Host "📊 Tamanho: $(Get-BackupSize)" -ForegroundColor Cyan
        Write-Host "📋 Log: $LogFile" -ForegroundColor Cyan
        
    } catch {
        Write-Log "ERRO CRÍTICO durante o backup: $($_.Exception.Message)" "ERROR"
        Write-Host "`n❌ BACKUP FALHOU!" -ForegroundColor Red
        Write-Host "📋 Verifique o log: $LogFile" -ForegroundColor Yellow
    }
}

# EXECUTAR BACKUP
Start-Backup

# Retornar ao diretório original
Set-Location $ProjectPath

Write-Host "`n📚 Para mais informações, consulte: BACKUP_BACKEND_GUIDE.md" -ForegroundColor Yellow