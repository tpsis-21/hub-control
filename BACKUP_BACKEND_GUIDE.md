# 💾 Guia Completo de Backup do Backend

## 📋 Visão Geral

Este guia fornece instruções detalhadas para realizar backup completo do backend do Hub Control, incluindo banco de dados Supabase, arquivos do projeto, configurações e procedimentos de restauração.

## 🎯 Tipos de Backup

### 1. 🗄️ Backup do Banco de Dados (Supabase)
### 2. 📁 Backup dos Arquivos do Projeto
### 3. ⚙️ Backup das Configurações
### 4. 🔐 Backup das Chaves e Secrets
### 5. 📊 Backup dos Logs e Métricas

---

## 🗄️ 1. BACKUP DO BANCO DE DADOS SUPABASE

### Método 1: Backup Automático do Supabase (Recomendado)

#### Via Dashboard Supabase:
1. Acesse o **Supabase Dashboard**
2. Vá para **Settings** > **Database**
3. Na seção **Backups**, clique em **Create Backup**
4. Escolha o tipo:
   - **Point-in-time**: Para backup específico
   - **Scheduled**: Para backup automático

#### Configurar Backup Automático:
```sql
-- Verificar configurações de backup
SELECT 
    name,
    setting,
    short_desc
FROM pg_settings 
WHERE name LIKE '%backup%' OR name LIKE '%archive%';
```

### Método 2: Backup Manual via SQL

#### Script de Backup Completo:
```sql
-- ==========================================
-- BACKUP COMPLETO DO BANCO DE DADOS
-- ==========================================

-- 1. Backup das tabelas principais
COPY profiles TO '/tmp/backup_profiles.csv' WITH CSV HEADER;
COPY user_settings TO '/tmp/backup_user_settings.csv' WITH CSV HEADER;
COPY system_config TO '/tmp/backup_system_config.csv' WITH CSV HEADER;
COPY audit_logs TO '/tmp/backup_audit_logs.csv' WITH CSV HEADER;
COPY financial_transactions TO '/tmp/backup_financial_transactions.csv' WITH CSV HEADER;
COPY in_app_notifications TO '/tmp/backup_notifications.csv' WITH CSV HEADER;
COPY payments TO '/tmp/backup_payments.csv' WITH CSV HEADER;

-- 2. Backup da estrutura do banco
SELECT 
    'CREATE TABLE ' || table_name || ' (' ||
    string_agg(
        column_name || ' ' || data_type ||
        CASE 
            WHEN character_maximum_length IS NOT NULL 
            THEN '(' || character_maximum_length || ')'
            ELSE ''
        END ||
        CASE 
            WHEN is_nullable = 'NO' THEN ' NOT NULL'
            ELSE ''
        END,
        ', '
    ) || ');' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

-- 3. Backup das políticas RLS
SELECT 
    'CREATE POLICY ' || policyname || ' ON ' || tablename ||
    ' FOR ' || cmd ||
    CASE WHEN roles IS NOT NULL THEN ' TO ' || array_to_string(roles, ', ') ELSE '' END ||
    CASE WHEN qual IS NOT NULL THEN ' USING (' || qual || ')' ELSE '' END ||
    CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END ||
    ';' as policy_statement
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. Backup das funções
SELECT 
    'CREATE OR REPLACE FUNCTION ' || routine_name || '(' ||
    COALESCE(parameter_style, '') || ') RETURNS ' ||
    COALESCE(data_type, 'void') || ' AS $$ ' ||
    routine_definition || ' $$ LANGUAGE ' ||
    external_language || ';' as function_statement
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

### Método 3: Backup via pg_dump (Avançado)

```bash
# Backup completo com estrutura e dados
pg_dump -h your-supabase-host -U postgres -d your-database-name > backup_complete.sql

# Backup apenas da estrutura
pg_dump -h your-supabase-host -U postgres -d your-database-name --schema-only > backup_schema.sql

# Backup apenas dos dados
pg_dump -h your-supabase-host -U postgres -d your-database-name --data-only > backup_data.sql

# Backup comprimido
pg_dump -h your-supabase-host -U postgres -d your-database-name | gzip > backup_complete.sql.gz
```

---

## 📁 2. BACKUP DOS ARQUIVOS DO PROJETO

### Script PowerShell para Backup Automático:

```powershell
# ==========================================
# SCRIPT DE BACKUP DO PROJETO
# ==========================================

# Configurações
$projectPath = "C:\Users\pc-tp\Documents\hub-control"
$backupPath = "C:\Backups\hub-control"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFolder = "$backupPath\backup_$timestamp"

# Criar diretório de backup
New-Item -ItemType Directory -Path $backupFolder -Force

# Arquivos e pastas para backup
$itemsToBackup = @(
    "src",
    "public",
    "components.json",
    "package.json",
    "package-lock.json",
    "next.config.js",
    "tailwind.config.ts",
    "tsconfig.json",
    "*.md",
    "*.sql",
    "*.cjs",
    "supabase"
)

# Copiar arquivos
foreach ($item in $itemsToBackup) {
    $sourcePath = Join-Path $projectPath $item
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $backupFolder -Recurse -Force
        Write-Host "✅ Copiado: $item"
    } else {
        Write-Host "⚠️ Não encontrado: $item"
    }
}

# Criar arquivo de informações do backup
$backupInfo = @"
BACKUP INFORMATION
==================
Data: $(Get-Date)
Versão: $(git rev-parse HEAD 2>$null)
Branch: $(git branch --show-current 2>$null)
Usuário: $env:USERNAME
Máquina: $env:COMPUTERNAME
Tamanho: $(Get-ChildItem $backupFolder -Recurse | Measure-Object -Property Length -Sum | Select-Object -ExpandProperty Sum) bytes
"@

$backupInfo | Out-File -FilePath "$backupFolder\backup_info.txt"

# Compactar backup
Compress-Archive -Path $backupFolder -DestinationPath "$backupPath\hub-control_backup_$timestamp.zip"

Write-Host "🎉 Backup concluído: hub-control_backup_$timestamp.zip"
```

### Backup Manual Seletivo:

```bash
# Criar estrutura de backup
mkdir -p backup/$(date +%Y%m%d_%H%M%S)
cd backup/$(date +%Y%m%d_%H%M%S)

# Copiar arquivos essenciais
cp -r ../../src .
cp -r ../../public .
cp -r ../../supabase .
cp ../../package*.json .
cp ../../*.config.* .
cp ../../*.md .
cp ../../*.sql .
cp ../../*.cjs .

# Criar arquivo de informações
echo "Backup criado em: $(date)" > backup_info.txt
echo "Commit: $(git rev-parse HEAD)" >> backup_info.txt
echo "Branch: $(git branch --show-current)" >> backup_info.txt

# Compactar
tar -czf ../hub-control-backup-$(date +%Y%m%d_%H%M%S).tar.gz .
```

---

## ⚙️ 3. BACKUP DAS CONFIGURAÇÕES

### Arquivo de Configurações para Backup:

```json
{
  "backup_config": {
    "timestamp": "2024-12-23T10:30:00Z",
    "version": "1.0.0",
    "environment": "production",
    "supabase": {
      "project_id": "your-project-id",
      "url": "https://your-project.supabase.co",
      "region": "us-east-1"
    },
    "database": {
      "tables_count": 15,
      "rls_policies": 25,
      "functions": 8,
      "triggers": 12
    },
    "application": {
      "next_version": "14.0.0",
      "node_version": "18.17.0",
      "dependencies_count": 45
    },
    "security": {
      "rls_coverage": "61%",
      "mfa_coverage": "0%",
      "audit_enabled": true,
      "alerts_enabled": true
    }
  }
}
```

### Script para Backup de Configurações:

```javascript
// backup-config.js
const fs = require('fs');
const path = require('path');

const backupConfig = {
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'development',
  
  // Configurações do projeto
  project: {
    name: 'hub-control',
    version: require('./package.json').version,
    dependencies: Object.keys(require('./package.json').dependencies || {}),
    devDependencies: Object.keys(require('./package.json').devDependencies || {})
  },
  
  // Configurações do Supabase
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT_SET'
  },
  
  // Configurações do Next.js
  nextjs: {
    config: fs.existsSync('./next.config.js') ? 'EXISTS' : 'NOT_EXISTS',
    typescript: fs.existsSync('./tsconfig.json') ? 'EXISTS' : 'NOT_EXISTS',
    tailwind: fs.existsSync('./tailwind.config.ts') ? 'EXISTS' : 'NOT_EXISTS'
  }
};

// Salvar backup de configurações
const backupPath = `./backup_config_${Date.now()}.json`;
fs.writeFileSync(backupPath, JSON.stringify(backupConfig, null, 2));
console.log(`✅ Backup de configurações salvo em: ${backupPath}`);
```

---

## 🔐 4. BACKUP DAS CHAVES E SECRETS

### ⚠️ IMPORTANTE: Segurança das Chaves

**NUNCA** faça backup das chaves em texto plano. Use sempre criptografia.

### Script Seguro para Backup de Secrets:

```bash
#!/bin/bash
# backup-secrets.sh

# Criar arquivo temporário criptografado
echo "SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL" > temp_secrets.txt
echo "SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY" >> temp_secrets.txt
echo "SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_ROLE_KEY" >> temp_secrets.txt

# Criptografar com GPG
gpg --symmetric --cipher-algo AES256 temp_secrets.txt

# Remover arquivo temporário
rm temp_secrets.txt

# Mover arquivo criptografado
mv temp_secrets.txt.gpg "secrets_backup_$(date +%Y%m%d_%H%M%S).gpg"

echo "✅ Secrets backup criado e criptografado"
```

### Lista de Secrets para Backup:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `JWT_SECRET`
- Chaves de API externas
- Certificados SSL
- Chaves de criptografia

---

## 📊 5. BACKUP DOS LOGS E MÉTRICAS

### Script para Backup de Logs:

```sql
-- Backup dos logs de auditoria
COPY (
    SELECT 
        id,
        user_id,
        action,
        details,
        ip_address,
        user_agent,
        created_at
    FROM audit_logs
    WHERE created_at >= NOW() - INTERVAL '30 days'
    ORDER BY created_at DESC
) TO '/tmp/audit_logs_backup.csv' WITH CSV HEADER;

-- Backup dos alertas de segurança
COPY (
    SELECT 
        id,
        type,
        severity,
        message,
        details,
        status,
        created_at,
        resolved_at
    FROM security_alerts
    WHERE created_at >= NOW() - INTERVAL '30 days'
    ORDER BY created_at DESC
) TO '/tmp/security_alerts_backup.csv' WITH CSV HEADER;

-- Backup das métricas financeiras
COPY (
    SELECT 
        id,
        user_id,
        type,
        amount,
        status,
        description,
        created_at
    FROM financial_transactions
    WHERE created_at >= NOW() - INTERVAL '90 days'
    ORDER BY created_at DESC
) TO '/tmp/financial_transactions_backup.csv' WITH CSV HEADER;
```

---

## 🔄 PROCEDIMENTOS DE RESTAURAÇÃO

### 1. Restauração do Banco de Dados

#### Via Supabase Dashboard:
1. Acesse **Settings** > **Database** > **Backups**
2. Selecione o backup desejado
3. Clique em **Restore**
4. Confirme a operação

#### Via SQL:
```sql
-- Restaurar dados de backup
\copy profiles FROM '/path/to/backup_profiles.csv' WITH CSV HEADER;
\copy user_settings FROM '/path/to/backup_user_settings.csv' WITH CSV HEADER;
\copy system_config FROM '/path/to/backup_system_config.csv' WITH CSV HEADER;
```

### 2. Restauração dos Arquivos

```bash
# Extrair backup
unzip hub-control_backup_20241223_103000.zip

# Restaurar arquivos
cp -r backup_20241223_103000/* ./

# Reinstalar dependências
npm install

# Verificar configurações
npm run build
```

### 3. Restauração das Configurações

```bash
# Restaurar variáveis de ambiente
cp .env.backup .env.local

# Verificar configurações
npm run dev
```

---

## 📅 CRONOGRAMA DE BACKUP RECOMENDADO

### 🔄 Backup Automático:
- **Diário**: Banco de dados (via Supabase)
- **Semanal**: Arquivos do projeto
- **Mensal**: Backup completo + verificação
- **Trimestral**: Teste de restauração

### 📋 Checklist de Backup:

#### Diário:
- [ ] Verificar backup automático do Supabase
- [ ] Verificar logs de erro
- [ ] Confirmar integridade dos dados

#### Semanal:
- [ ] Backup dos arquivos do projeto
- [ ] Backup das configurações
- [ ] Verificar espaço de armazenamento
- [ ] Testar acesso aos backups

#### Mensal:
- [ ] Backup completo (DB + Arquivos + Configs)
- [ ] Limpeza de backups antigos
- [ ] Documentar mudanças importantes
- [ ] Verificar políticas de retenção

#### Trimestral:
- [ ] Teste completo de restauração
- [ ] Auditoria dos procedimentos
- [ ] Atualização da documentação
- [ ] Treinamento da equipe

---

## 🛡️ SEGURANÇA DO BACKUP

### Boas Práticas:

1. **Criptografia**: Sempre criptografar backups sensíveis
2. **Múltiplas Localizações**: Armazenar em locais diferentes
3. **Controle de Acesso**: Restringir acesso aos backups
4. **Verificação Regular**: Testar integridade dos backups
5. **Documentação**: Manter procedimentos atualizados

### Locais de Armazenamento:

- **Local**: Disco externo ou NAS
- **Nuvem**: Google Drive, Dropbox, AWS S3
- **Supabase**: Backup automático integrado
- **Git**: Versionamento do código

---

## 🚨 PLANO DE RECUPERAÇÃO DE DESASTRES

### Cenários de Emergência:

#### 1. Perda Total do Banco de Dados
1. Restaurar do backup mais recente do Supabase
2. Verificar integridade dos dados
3. Recriar políticas RLS se necessário
4. Testar funcionalidades críticas

#### 2. Corrupção dos Arquivos do Projeto
1. Restaurar do backup de arquivos
2. Reinstalar dependências
3. Verificar configurações
4. Executar testes

#### 3. Comprometimento de Segurança
1. Revogar todas as chaves de API
2. Restaurar do backup limpo
3. Gerar novas chaves
4. Implementar medidas de segurança adicionais

---

## 📞 CONTATOS DE EMERGÊNCIA

- **Suporte Supabase**: support@supabase.io
- **Administrador do Sistema**: [seu-email]
- **Equipe de Desenvolvimento**: [email-da-equipe]
- **Suporte de Infraestrutura**: [email-infra]

---

## ✅ VERIFICAÇÃO FINAL

### Checklist Pós-Backup:

- [ ] Backup do banco de dados concluído
- [ ] Backup dos arquivos concluído
- [ ] Backup das configurações concluído
- [ ] Secrets armazenados com segurança
- [ ] Logs e métricas preservados
- [ ] Documentação atualizada
- [ ] Equipe notificada
- [ ] Próximo backup agendado

### Comando de Verificação Rápida:

```sql
-- Verificar saúde do sistema
SELECT security_health_check();

-- Verificar último backup
SELECT 
    'ÚLTIMO BACKUP' as status,
    NOW() as verificado_em,
    'Backup manual executado com sucesso' as resultado;
```

---

**🎯 OBJETIVO**: Garantir a continuidade e segurança dos dados do Hub Control através de backups regulares e procedimentos de recuperação testados.

**📅 PRÓXIMA REVISÃO**: Agendar revisão trimestral dos procedimentos de backup e recuperação.

**🔒 LEMBRE-SE**: A segurança dos backups é tão importante quanto a segurança do sistema principal!