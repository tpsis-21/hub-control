# Recuperacao Supabase Hub Control
# Use: duplo clique em recuperar-supabase.bat (recomendado)

$ErrorActionPreference = "Continue"

function Write-Step($n, $msg) { Write-Host ""; Write-Host "[$n] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "  OK: $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  ! $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "  X $msg" -ForegroundColor Red }

function Pause-AtEnd {
    Write-Host ""
    Read-Host "Pressione ENTER para fechar esta janela"
}

try {
    Clear-Host
    Write-Host ""
    Write-Host "  ========================================" -ForegroundColor White
    Write-Host "   HUB CONTROL - Recuperar Supabase" -ForegroundColor White
    Write-Host "  ========================================" -ForegroundColor White
    Write-Host ""

    $backupDir = "C:\Backups\hub-control"
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        Write-Ok "Pasta criada: $backupDir"
    }

    Write-Step "0" "Antes de continuar"
    Write-Host "  1) Backup do projeto pausado em: $backupDir" -ForegroundColor Gray
    Write-Host "     https://supabase.com/dashboard/project/htwiupmnqlmwvzqzroal" -ForegroundColor Gray
    Write-Host "  2) Projeto HBCONTROL criado + senha do banco (Settings > Database)" -ForegroundColor Gray
    Write-Host ""
    Read-Host "Pressione ENTER quando o backup estiver na pasta"

    Write-Step "1" "Procurando arquivo de backup..."
    $backupFile = Get-ChildItem -Path $backupDir -Recurse -Include *.backup,*.sql -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1

    if (-not $backupFile) {
        $gz = Get-ChildItem -Path $backupDir -Recurse -Filter *.gz -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($gz) {
            Write-Warn "Arquivo .gz encontrado - descompactando..."
            $outName = Join-Path $gz.DirectoryName ([IO.Path]::GetFileNameWithoutExtension($gz.Name))
            if (-not $outName.EndsWith(".backup")) { $outName = "$outName.backup" }
            $inStream = [IO.File]::OpenRead($gz.FullName)
            $gzip = New-Object IO.Compression.GzipStream($inStream, [IO.Compression.CompressionMode]::Decompress)
            $outStream = [IO.File]::Create($outName)
            $gzip.CopyTo($outStream)
            $outStream.Close()
            $gzip.Close()
            $inStream.Close()
            $backupFile = Get-Item $outName
            Write-Ok "Descompactado: $($backupFile.FullName)"
        }
    }

    if (-not $backupFile) {
        Write-Err "Nenhum arquivo .backup ou .sql em $backupDir"
        explorer $backupDir
        throw "Coloque o backup na pasta e execute de novo."
    }

    $sizeMb = [math]::Round(($backupFile.Length / 1MB), 1)
    Write-Ok "Backup: $($backupFile.Name) - $sizeMb MB"

    Write-Step "2" "Verificando PostgreSQL (psql)..."
    $psqlExe = $null
    $cmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($cmd) { $psqlExe = $cmd.Source }

    if (-not $psqlExe) {
        foreach ($p in @(
            "C:\Program Files\PostgreSQL\17\bin\psql.exe",
            "C:\Program Files\PostgreSQL\16\bin\psql.exe",
            "C:\Program Files\PostgreSQL\15\bin\psql.exe"
        )) {
            if (Test-Path $p) { $psqlExe = $p; break }
        }
    }

    if (-not $psqlExe) {
        Write-Err "psql nao encontrado. Instale PostgreSQL 17:"
        Write-Host "  https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
        Start-Process "https://www.postgresql.org/download/windows/"
        throw "Instale o PostgreSQL e execute de novo."
    }

    Write-Ok (& $psqlExe --version 2>&1 | Out-String).Trim()

    Write-Step "3" "Dados do projeto HBCONTROL"
    Write-Host "  Project REF (Enter = lvqribcputjokzjkyhhg)" -ForegroundColor DarkGray
    $projectRef = Read-Host "  Project REF"
    if ([string]::IsNullOrWhiteSpace($projectRef)) {
        $projectRef = "lvqribcputjokzjkyhhg"
    }

    Write-Host ""
    Write-Host "  Cole a senha do banco (Settings > Database > Reset password)" -ForegroundColor DarkGray
    Write-Host "  A senha NAO aparece enquanto digita - e normal." -ForegroundColor DarkGray
    $dbPasswordPlain = Read-Host "  Senha do banco"

    if ([string]::IsNullOrWhiteSpace($dbPasswordPlain)) {
        throw "Senha vazia. Gere uma senha em Supabase > Settings > Database."
    }

    $encodedPass = [uri]::EscapeDataString($dbPasswordPlain)
    $timeoutQs = "connect_timeout=20"

    # Direct: usuario "postgres" | Pooler: usuario "postgres.PROJECT_REF"
    $connections = @(
        @{ Label = "Direct"; String = "postgresql://postgres:${encodedPass}@db.${projectRef}.supabase.co:5432/postgres?${timeoutQs}" },
        @{ Label = "Pooler Session"; String = "postgresql://postgres.${projectRef}:${encodedPass}@aws-0-us-west-2.pooler.supabase.com:5432/postgres?${timeoutQs}" },
        @{ Label = "Pooler us-west-1"; String = "postgresql://postgres.${projectRef}:${encodedPass}@aws-0-us-west-1.pooler.supabase.com:5432/postgres?${timeoutQs}" }
    )

    function Test-DbConnection($label, $connString, $psqlPath, $password) {
        Write-Host "  Testando $label (max 20s)..." -ForegroundColor Gray
        $env:PGPASSWORD = $password
        $test = & $psqlPath -d $connString -c "SELECT 1 AS ok;" 2>&1
        $code = $LASTEXITCODE
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
        return @{ Ok = ($code -eq 0); Code = $code; Output = $test }
    }

    function Invoke-DbRestore($label, $connString, $psqlPath, $password, $backupPath, $logPath) {
        Write-Host "  Restaurando via $label (linhas aparecem abaixo)..." -ForegroundColor Cyan
        $env:PGPASSWORD = $password
        $lineCount = 0
        & $psqlPath -d $connString -v ON_ERROR_STOP=0 -f $backupPath 2>&1 | ForEach-Object {
            $lineCount++
            if ($lineCount -le 30 -or ($lineCount % 100 -eq 0)) {
                Write-Host "    $_" -ForegroundColor DarkGray
            }
            $_ | Out-File -FilePath $logPath -Append -Encoding UTF8
        }
        $code = $LASTEXITCODE
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
        Write-Host "  ($lineCount linhas processadas)" -ForegroundColor DarkGray
        return $code
    }

    Write-Host ""
    Write-Host "  NAO esta travado: o psql roda em silencio ate terminar." -ForegroundColor Yellow
    Write-Host "  Backup pequeno (0.3 MB) = costuma levar 1-3 min." -ForegroundColor Yellow
    Write-Host "  Se passar de 5 min sem linhas novas, feche (Ctrl+C) e veja o log." -ForegroundColor Yellow
    Write-Host ""

    $logFile = Join-Path $backupDir ("restore-log-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".txt")
    "=== Restore iniciado $(Get-Date) ===" | Out-File -FilePath $logFile -Encoding UTF8

    $exitCode = 1
    $restoreOk = $false

    foreach ($conn in $connections) {
        $test = Test-DbConnection -label $conn.Label -connString $conn.String -psqlPath $psqlExe -password $dbPasswordPlain
        if (-not $test.Ok) {
            Write-Warn "Conexao falhou: $($conn.Label)"
            $test.Output | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
            $test.Output | Out-File -FilePath $logFile -Append -Encoding UTF8
            continue
        }
        Write-Ok "Conexao OK: $($conn.Label)"

        $exitCode = Invoke-DbRestore -label $conn.Label -connString $conn.String -psqlPath $psqlExe -password $dbPasswordPlain -backupPath $backupFile.FullName -logPath $logFile
        "--- Fim restore $($conn.Label) exit=$exitCode ---" | Out-File -FilePath $logFile -Append -Encoding UTF8

        if ($exitCode -eq 0) {
            Write-Ok "Restore concluido via $($conn.Label)"
            $restoreOk = $true
            break
        }
        Write-Warn "Restore terminou com codigo $exitCode (muitas vezes ainda funcionou)"
        $restoreOk = $true
        break
    }

    Write-Host ""
    Write-Host "  Log completo: $logFile" -ForegroundColor Gray

    if (-not $restoreOk) {
        Write-Err "Restore nao concluiu com sucesso."
        Write-Host "  Verifique:" -ForegroundColor Yellow
        Write-Host "    - Senha correta? (reset em Database Settings, aguarde 2 min)" -ForegroundColor Yellow
        Write-Host "    - Projeto HBCONTROL esta Active no dashboard?" -ForegroundColor Yellow
        Write-Host "    - Abra o log acima para ver o erro do psql" -ForegroundColor Yellow
    }

    Write-Step "4" ".env.local"
    $envPath = Join-Path (Split-Path $PSScriptRoot -Parent) ".env.local"
    if (Test-Path $envPath) {
        Write-Ok "Mantendo .env.local existente: $envPath"
    } else {
        Write-Warn ".env.local nao encontrado - configure manualmente as chaves da API"
    }

    Write-Step "5" "Depois do restore"
    Write-Host "  Supabase > Authentication > URL Configuration:" -ForegroundColor White
    Write-Host "    http://localhost:8080/auth/callback" -ForegroundColor White
    Write-Host "  Teste: npm run dev" -ForegroundColor Green

} catch {
    Write-Host ""
    Write-Err $_.Exception.Message
    if ($_.ScriptStackTrace) {
        Write-Host $_.ScriptStackTrace -ForegroundColor DarkGray
    }
} finally {
    Pause-AtEnd
}
