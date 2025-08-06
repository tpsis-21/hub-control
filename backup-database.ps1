# ==========================================
# SCRIPT DE BACKUP DO BANCO DE DADOS SUPABASE
# ==========================================

param(
    [string]$ProjectId = "",
    [string]$DatabasePassword = "",
    [string]$BackupPath = "C:\Backups\hub-control\database",
    [string]$BackupType = "full",  # full, schema, data, tables
    [string[]]$Tables = @(),
    [switch]$Compress = $true,
    [switch]$Verbose = $false
)

# Configurações
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LogFile = "$BackupPath\database_backup_log_$Timestamp.txt"

# Função para logging
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $LogEntry = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"
    Write-Host $LogEntry
    if (Test-Path (Split-Path $LogFile)) {
        Add-Content -Path $LogFile -Value $LogEntry
    }
}

# Função para verificar pré-requisitos
function Test-DatabasePrerequisites {
    Write-Log "Verificando pré-requisitos para backup do banco..."
    
    # Verificar se pg_dump está disponível
    try {
        $pgDumpVersion = pg_dump --version 2>$null
        if ($pgDumpVersion) {
            Write-Log "pg_dump encontrado: $pgDumpVersion"
        } else {
            Write-Log "pg_dump não encontrado. Instale PostgreSQL client tools" "ERROR"
            return $false
        }
    } catch {
        Write-Log "ERRO: pg_dump não está disponível. Instale PostgreSQL client tools" "ERROR"
        Write-Log "Download: https://www.postgresql.org/download/windows/" "INFO"
        return $false
    }
    
    # Verificar parâmetros obrigatórios
    if ([string]::IsNullOrEmpty($ProjectId)) {
        Write-Log "ERRO: ProjectId é obrigatório" "ERROR"
        Write-Log "Encontre seu Project ID no Supabase Dashboard > Settings > General" "INFO"
        return $false
    }
    
    if ([string]::IsNullOrEmpty($DatabasePassword)) {
        Write-Log "ERRO: DatabasePassword é obrigatório" "ERROR"
        Write-Log "Encontre sua senha no Supabase Dashboard > Settings > Database" "INFO"
        return $false
    }
    
    # Criar diretório de backup
    if (-not (Test-Path $BackupPath)) {
        New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
        Write-Log "Diretório de backup criado: $BackupPath"
    }
    
    Write-Log "Pré-requisitos verificados com sucesso"
    return $true
}

# Função para construir string de conexão
function Get-ConnectionString {
    $Host = "db.$ProjectId.supabase.co"
    $Port = "5432"
    $Database = "postgres"
    $Username = "postgres"
    
    return @{
        Host = $Host
        Port = $Port
        Database = $Database
        Username = $Username
        Password = $DatabasePassword
    }
}

# Função para testar conexão
function Test-DatabaseConnection {
    param([hashtable]$ConnectionInfo)
    
    Write-Log "Testando conexão com o banco de dados..."
    
    $env:PGPASSWORD = $ConnectionInfo.Password
    
    try {
        $TestQuery = "SELECT version();"
        $Result = psql -h $ConnectionInfo.Host -p $ConnectionInfo.Port -U $ConnectionInfo.Username -d $ConnectionInfo.Database -c $TestQuery 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Conexão estabelecida com sucesso"
            return $true
        } else {
            Write-Log "ERRO: Falha na conexão com o banco de dados" "ERROR"
            return $false
        }
    } catch {
        Write-Log "ERRO: Não foi possível conectar ao banco: $($_.Exception.Message)" "ERROR"
        return $false
    } finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# Função para listar tabelas
function Get-DatabaseTables {
    param([hashtable]$ConnectionInfo)
    
    Write-Log "Obtendo lista de tabelas..."
    
    $env:PGPASSWORD = $ConnectionInfo.Password
    
    try {
        $Query = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
        $Result = psql -h $ConnectionInfo.Host -p $ConnectionInfo.Port -U $ConnectionInfo.Username -d $ConnectionInfo.Database -t -c $Query 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            $TableList = $Result -split "`n" | Where-Object { $_.Trim() -ne "" } | ForEach-Object { $_.Trim() }
            Write-Log "Encontradas $($TableList.Count) tabelas"
            return $TableList
        } else {
            Write-Log "ERRO: Falha ao obter lista de tabelas" "ERROR"
            return @()
        }
    } catch {
        Write-Log "ERRO: $($_.Exception.Message)" "ERROR"
        return @()
    } finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# Função para backup completo
function Backup-FullDatabase {
    param([hashtable]$ConnectionInfo)
    
    Write-Log "Iniciando backup completo do banco de dados..."
    
    $BackupFile = "$BackupPath\full_backup_$Timestamp.sql"
    $env:PGPASSWORD = $ConnectionInfo.Password
    
    try {
        $Command = "pg_dump"
        $Arguments = @(
            "-h", $ConnectionInfo.Host,
            "-p", $ConnectionInfo.Port,
            "-U", $ConnectionInfo.Username,
            "-d", $ConnectionInfo.Database,
            "--verbose",
            "--no-password",
            "--format=plain",
            "--file=$BackupFile"
        )
        
        Write-Log "Executando: $Command $($Arguments -join ' ')"
        
        & $Command $Arguments
        
        if ($LASTEXITCODE -eq 0 -and (Test-Path $BackupFile)) {
            $FileSize = [math]::Round((Get-Item $BackupFile).Length / 1MB, 2)
            Write-Log "Backup completo criado com sucesso: $BackupFile ($FileSize MB)"
            return $BackupFile
        } else {
            Write-Log "ERRO: Falha no backup completo" "ERROR"
            return $null
        }
    } catch {
        Write-Log "ERRO: $($_.Exception.Message)" "ERROR"
        return $null
    } finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# Função para backup apenas do schema
function Backup-SchemaOnly {
    param([hashtable]$ConnectionInfo)
    
    Write-Log "Iniciando backup do schema..."
    
    $BackupFile = "$BackupPath\schema_backup_$Timestamp.sql"
    $env:PGPASSWORD = $ConnectionInfo.Password
    
    try {
        $Arguments = @(
            "-h", $ConnectionInfo.Host,
            "-p", $ConnectionInfo.Port,
            "-U", $ConnectionInfo.Username,
            "-d", $ConnectionInfo.Database,
            "--schema-only",
            "--verbose",
            "--no-password",
            "--file=$BackupFile"
        )
        
        & pg_dump $Arguments
        
        if ($LASTEXITCODE -eq 0 -and (Test-Path $BackupFile)) {
            Write-Log "Backup do schema criado com sucesso: $BackupFile"
            return $BackupFile
        } else {
            Write-Log "ERRO: Falha no backup do schema" "ERROR"
            return $null
        }
    } catch {
        Write-Log "ERRO: $($_.Exception.Message)" "ERROR"
        return $null
    } finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# Função para backup apenas dos dados
function Backup-DataOnly {
    param([hashtable]$ConnectionInfo)
    
    Write-Log "Iniciando backup dos dados..."
    
    $BackupFile = "$BackupPath\data_backup_$Timestamp.sql"
    $env:PGPASSWORD = $ConnectionInfo.Password
    
    try {
        $Arguments = @(
            "-h", $ConnectionInfo.Host,
            "-p", $ConnectionInfo.Port,
            "-U", $ConnectionInfo.Username,
            "-d", $ConnectionInfo.Database,
            "--data-only",
            "--verbose",
            "--no-password",
            "--file=$BackupFile"
        )
        
        & pg_dump $Arguments
        
        if ($LASTEXITCODE -eq 0 -and (Test-Path $BackupFile)) {
            Write-Log "Backup dos dados criado com sucesso: $BackupFile"
            return $BackupFile
        } else {
            Write-Log "ERRO: Falha no backup dos dados" "ERROR"
            return $null
        }
    } catch {
        Write-Log "ERRO: $($_.Exception.Message)" "ERROR"
        return $null
    } finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# Função para backup de tabelas específicas
function Backup-SpecificTables {
    param([hashtable]$ConnectionInfo, [string[]]$TableNames)
    
    Write-Log "Iniciando backup de tabelas específicas: $($TableNames -join ', ')..."
    
    $BackupFile = "$BackupPath\tables_backup_$Timestamp.sql"
    $env:PGPASSWORD = $ConnectionInfo.Password
    
    try {
        $Arguments = @(
            "-h", $ConnectionInfo.Host,
            "-p", $ConnectionInfo.Port,
            "-U", $ConnectionInfo.Username,
            "-d", $ConnectionInfo.Database,
            "--verbose",
            "--no-password",
            "--file=$BackupFile"
        )
        
        # Adicionar cada tabela
        foreach ($Table in $TableNames) {
            $Arguments += "--table=$Table"
        }
        
        & pg_dump $Arguments
        
        if ($LASTEXITCODE -eq 0 -and (Test-Path $BackupFile)) {
            Write-Log "Backup das tabelas criado com sucesso: $BackupFile"
            return $BackupFile
        } else {
            Write-Log "ERRO: Falha no backup das tabelas" "ERROR"
            return $null
        }
    } catch {
        Write-Log "ERRO: $($_.Exception.Message)" "ERROR"
        return $null
    } finally {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# Função para compactar backup
function Compress-DatabaseBackup {
    param([string]$BackupFile)
    
    if ($Compress -and $BackupFile -and (Test-Path $BackupFile)) {
        Write-Log "Compactando backup..."
        
        $ZipFile = $BackupFile -replace '\.sql$', '.zip'
        
        try {
            Compress-Archive -Path $BackupFile -DestinationPath $ZipFile -Force
            
            if (Test-Path $ZipFile) {
                $OriginalSize = [math]::Round((Get-Item $BackupFile).Length / 1MB, 2)
                $CompressedSize = [math]::Round((Get-Item $ZipFile).Length / 1MB, 2)
                $CompressionRatio = [math]::Round((1 - ($CompressedSize / $OriginalSize)) * 100, 1)
                
                Write-Log "Backup compactado: $ZipFile"
                Write-Log "Tamanho original: $OriginalSize MB, Compactado: $CompressedSize MB"
                Write-Log "Taxa de compressão: $CompressionRatio%"
                
                # Remover arquivo original
                Remove-Item $BackupFile -Force
                
                return $ZipFile
            }
        } catch {
            Write-Log "ERRO na compactação: $($_.Exception.Message)" "ERROR"
        }
    }
    
    return $BackupFile
}

# Função para gerar relatório de backup
function Generate-DatabaseBackupReport {
    param([string]$BackupFile, [hashtable]$ConnectionInfo, [string[]]$TableList)
    
    $ReportFile = "$BackupPath\database_backup_report_$Timestamp.txt"
    
    $Report = @"
RELATÓRIO DE BACKUP DO BANCO DE DADOS
====================================

Data/Hora: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')
Tipo de Backup: $BackupType
Projeto Supabase: $ProjectId
Host: $($ConnectionInfo.Host)

ARQUIVO DE BACKUP:
-----------------
Localização: $BackupFile
Tamanho: $([math]::Round((Get-Item $BackupFile -ErrorAction SilentlyContinue).Length / 1MB, 2)) MB
Compactado: $(if ($Compress) { 'Sim' } else { 'Não' })

TABELAS NO BANCO:
----------------
$($TableList -join "`n")

TOTAL DE TABELAS: $($TableList.Count)

COMANDO DE RESTAURAÇÃO:
----------------------
psql -h $($ConnectionInfo.Host) -p $($ConnectionInfo.Port) -U $($ConnectionInfo.Username) -d $($ConnectionInfo.Database) -f $BackupFile

PRÓXIMOS PASSOS:
---------------
1. Verificar integridade do backup
2. Testar restauração em ambiente de desenvolvimento
3. Armazenar backup em local seguro
4. Agendar próximo backup

STATUS: CONCLUÍDO COM SUCESSO ✅
"@
    
    $Report | Out-File -FilePath $ReportFile -Encoding UTF8
    Write-Log "Relatório salvo em: $ReportFile"
}

# FUNÇÃO PRINCIPAL
function Start-DatabaseBackup {
    Write-Log "=== INICIANDO BACKUP DO BANCO DE DADOS SUPABASE ==="
    Write-Log "Projeto: $ProjectId"
    Write-Log "Tipo: $BackupType"
    Write-Log "Destino: $BackupPath"
    
    # Verificar pré-requisitos
    if (-not (Test-DatabasePrerequisites)) {
        Write-Log "Backup cancelado devido a falha nos pré-requisitos" "ERROR"
        return
    }
    
    # Obter informações de conexão
    $ConnectionInfo = Get-ConnectionString
    
    # Testar conexão
    if (-not (Test-DatabaseConnection -ConnectionInfo $ConnectionInfo)) {
        Write-Log "Backup cancelado devido a falha na conexão" "ERROR"
        return
    }
    
    # Obter lista de tabelas
    $TableList = Get-DatabaseTables -ConnectionInfo $ConnectionInfo
    
    try {
        $BackupFile = $null
        
        # Executar backup baseado no tipo
        switch ($BackupType.ToLower()) {
            "full" {
                $BackupFile = Backup-FullDatabase -ConnectionInfo $ConnectionInfo
            }
            "schema" {
                $BackupFile = Backup-SchemaOnly -ConnectionInfo $ConnectionInfo
            }
            "data" {
                $BackupFile = Backup-DataOnly -ConnectionInfo $ConnectionInfo
            }
            "tables" {
                if ($Tables.Count -eq 0) {
                    Write-Log "ERRO: Nenhuma tabela especificada para backup" "ERROR"
                    return
                }
                $BackupFile = Backup-SpecificTables -ConnectionInfo $ConnectionInfo -TableNames $Tables
            }
            default {
                Write-Log "Tipo de backup inválido: $BackupType" "ERROR"
                return
            }
        }
        
        if ($BackupFile) {
            # Compactar se solicitado
            $FinalFile = Compress-DatabaseBackup -BackupFile $BackupFile
            
            # Gerar relatório
            Generate-DatabaseBackupReport -BackupFile $FinalFile -ConnectionInfo $ConnectionInfo -TableList $TableList
            
            Write-Log "=== BACKUP DO BANCO DE DADOS CONCLUÍDO COM SUCESSO ==="
            Write-Log "Arquivo final: $FinalFile"
            
            # Mostrar resumo
            Write-Host "`n🎉 BACKUP DO BANCO CONCLUÍDO!" -ForegroundColor Green
            Write-Host "📁 Arquivo: $FinalFile" -ForegroundColor Cyan
            Write-Host "📊 Tabelas: $($TableList.Count)" -ForegroundColor Cyan
            Write-Host "📋 Log: $LogFile" -ForegroundColor Cyan
        } else {
            Write-Log "ERRO: Backup não foi criado" "ERROR"
        }
        
    } catch {
        Write-Log "ERRO CRÍTICO durante o backup: $($_.Exception.Message)" "ERROR"
        Write-Host "`n❌ BACKUP DO BANCO FALHOU!" -ForegroundColor Red
        Write-Host "📋 Verifique o log: $LogFile" -ForegroundColor Yellow
    }
}

# Mostrar ajuda se parâmetros obrigatórios não foram fornecidos
if ([string]::IsNullOrEmpty($ProjectId) -or [string]::IsNullOrEmpty($DatabasePassword)) {
    Write-Host "`n📚 BACKUP DO BANCO DE DADOS SUPABASE" -ForegroundColor Yellow
    Write-Host "=========================================" -ForegroundColor Yellow
    Write-Host "`nUso:" -ForegroundColor White
    Write-Host ".\backup-database.ps1 -ProjectId 'seu-project-id' -DatabasePassword 'sua-senha'" -ForegroundColor Cyan
    Write-Host "`nParâmetros:" -ForegroundColor White
    Write-Host "  -ProjectId        : ID do projeto Supabase (obrigatório)" -ForegroundColor Gray
    Write-Host "  -DatabasePassword : Senha do banco de dados (obrigatório)" -ForegroundColor Gray
    Write-Host "  -BackupType       : Tipo de backup (full, schema, data, tables)" -ForegroundColor Gray
    Write-Host "  -Tables           : Lista de tabelas para backup (apenas com -BackupType tables)" -ForegroundColor Gray
    Write-Host "  -BackupPath       : Caminho para salvar o backup" -ForegroundColor Gray
    Write-Host "  -Compress         : Compactar o backup (padrão: true)" -ForegroundColor Gray
    Write-Host "  -Verbose          : Mostrar informações detalhadas" -ForegroundColor Gray
    Write-Host "`nExemplos:" -ForegroundColor White
    Write-Host "  .\backup-database.ps1 -ProjectId 'abc123' -DatabasePassword 'senha123'" -ForegroundColor Cyan
    Write-Host "  .\backup-database.ps1 -ProjectId 'abc123' -DatabasePassword 'senha123' -BackupType 'schema'" -ForegroundColor Cyan
    Write-Host "  .\backup-database.ps1 -ProjectId 'abc123' -DatabasePassword 'senha123' -BackupType 'tables' -Tables @('profiles', 'audit_logs')" -ForegroundColor Cyan
    Write-Host "`n📖 Para mais informações, consulte: BACKUP_BACKEND_GUIDE.md" -ForegroundColor Yellow
} else {
    # EXECUTAR BACKUP
    Start-DatabaseBackup
}

Write-Host "`n📚 Para instruções completas de backup, consulte: BACKUP_BACKEND_GUIDE.md" -ForegroundColor Yellow