# Guia do Sistema de Backup Automatizado

## Visão Geral

O Hub Control possui um sistema de backup automatizado robusto que protege dados críticos através de backups regulares, criptografia e múltiplas opções de armazenamento.

## Características Principais

### 🔐 Segurança
- **Criptografia AES-256-GCM** para todos os backups
- **Chaves de criptografia** geradas automaticamente
- **Sanitização de dados** sensíveis nos logs
- **Verificação de integridade** com checksums

### 📅 Agendamento Automático
- **Backup Completo**: Domingos às 2h (semanal)
- **Backup Incremental**: Segunda a sábado às 2h (diário)
- **Backup de Logs**: A cada 6 horas

### 💾 Tipos de Backup
- **Completo**: Banco de dados + arquivos importantes + logs
- **Incremental**: Apenas mudanças desde o último backup
- **Logs**: Apenas arquivos de log do sistema

### 🗂️ Retenção Inteligente
- **Backups completos**: 4 semanas
- **Backups incrementais**: 7 dias
- **Backups de logs**: 30 dias

## Configuração Inicial

### 1. Pré-requisitos

```bash
# Variáveis de ambiente obrigatórias
SUPABASE_URL=sua_url_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
DATABASE_URL=sua_url_banco_dados
```

### 2. Configuração Automática

```bash
# Executar configuração inicial
npm run backup:setup
```

Este comando irá:
- ✅ Verificar variáveis de ambiente
- 📁 Criar estrutura de diretórios
- 🔐 Gerar chave de criptografia
- ⚙️ Criar arquivo de configuração
- 📜 Criar scripts de backup
- ⏰ Preparar agendamento
- 🧪 Executar testes básicos

### 3. Configurar Tarefas Agendadas (Windows)

```bash
# Execute como administrador
scripts\setup-backup-tasks.bat
```

## Estrutura de Arquivos

```
hub-control/
├── config/
│   ├── backup.json          # Configuração do sistema
│   └── backup.key           # Chave de criptografia
├── backups/
│   ├── full/                # Backups completos
│   ├── incremental/         # Backups incrementais
│   ├── logs/                # Backups de logs
│   ├── temp/                # Arquivos temporários
│   └── metadata/            # Metadados dos backups
└── scripts/
    ├── setup-backup.js      # Configuração inicial
    ├── test-backup.js       # Testes do sistema
    ├── run-backup.js        # Executor de backups
    ├── backup.bat           # Script Windows
    └── setup-backup-tasks.bat # Agendamento Windows
```

## Scripts Disponíveis

### Configuração e Testes
```bash
# Configurar sistema de backup
npm run backup:setup

# Testar configuração
npm run backup:test
```

### Execução Manual
```bash
# Backup completo
npm run backup:full

# Backup incremental
npm run backup:incremental

# Backup de logs
npm run backup:logs
```

### Gerenciamento
```bash
# Listar backups disponíveis
npm run backup:list

# Limpar backups antigos
npm run backup:cleanup

# Restaurar backup específico
npm run backup:restore <backup-id>
```

## Configuração Avançada

### Arquivo de Configuração (`config/backup.json`)

```json
{
  "schedule": {
    "full": "0 2 * * 0",
    "incremental": "0 2 * * 1-6",
    "logs": "0 */6 * * *"
  },
  "retention": {
    "full": 4,
    "incremental": 7,
    "logs": 30
  },
  "storage": {
    "local": {
      "enabled": true,
      "path": "./backups"
    },
    "remote": {
      "enabled": false,
      "type": "aws-s3",
      "bucket": "",
      "region": "",
      "accessKey": "",
      "secretKey": ""
    }
  },
  "compression": {
    "enabled": true,
    "level": 6
  },
  "encryption": {
    "enabled": true,
    "algorithm": "aes-256-gcm",
    "keyFile": "./config/backup.key"
  },
  "notifications": {
    "email": {
      "enabled": false,
      "smtp": {
        "host": "",
        "port": 587,
        "secure": false,
        "user": "",
        "pass": ""
      },
      "to": [],
      "onSuccess": false,
      "onError": true
    },
    "webhook": {
      "enabled": false,
      "url": "",
      "onSuccess": false,
      "onError": true
    }
  }
}
```

### Variáveis de Ambiente Opcionais

```bash
# Armazenamento remoto (AWS S3)
BACKUP_REMOTE_ENABLED=true
BACKUP_AWS_ACCESS_KEY=sua_access_key
BACKUP_AWS_SECRET_KEY=sua_secret_key
BACKUP_AWS_BUCKET=seu_bucket
BACKUP_AWS_REGION=us-east-1

# Notificações por email
BACKUP_EMAIL_ENABLED=true
BACKUP_EMAIL_HOST=smtp.gmail.com
BACKUP_EMAIL_USER=seu_email@gmail.com
BACKUP_EMAIL_PASS=sua_senha_app
BACKUP_EMAIL_TO=admin@empresa.com,backup@empresa.com

# Notificações por webhook
BACKUP_WEBHOOK_URL=https://hooks.slack.com/services/...

# Chave de criptografia personalizada
BACKUP_ENCRYPTION_KEY=sua_chave_hex_64_caracteres
```

## Monitoramento

### Verificar Status das Tarefas
```bash
# Listar tarefas agendadas
schtasks /query /tn "HubControl-*"

# Verificar última execução
schtasks /query /tn "HubControl-BackupFull" /fo LIST /v
```

### Logs de Backup
```bash
# Ver logs de backup
type logs\backup.log

# Ver apenas erros
type logs\backup-error.log
```

### Métricas de Backup
```bash
# Verificar métricas via API
curl http://localhost:3000/api/metrics | jq .backup

# Dashboard de monitoramento
curl http://localhost:3000/api/monitoring/dashboard | jq .backup
```

## Restauração de Backups

### 1. Listar Backups Disponíveis
```bash
npm run backup:list
```

### 2. Restaurar Backup Específico
```bash
# Restaurar por ID
npm run backup:restore backup-20241201-020000-full

# Ou usar o script diretamente
node scripts/run-backup.js restore backup-20241201-020000-full
```

### 3. Restauração Manual

1. **Localizar o arquivo de backup**:
   ```bash
   dir backups\full\backup-20241201-020000-full.tar.gz.enc
   ```

2. **Descriptografar** (se necessário):
   ```bash
   # O sistema faz isso automaticamente
   ```

3. **Extrair arquivos**:
   ```bash
   # O sistema extrai automaticamente
   ```

4. **Restaurar banco de dados**:
   ```bash
   # Executado automaticamente pelo sistema
   ```

## Armazenamento Remoto

### Configurar AWS S3

1. **Criar bucket S3**
2. **Configurar IAM** com permissões:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::seu-bucket-backup",
           "arn:aws:s3:::seu-bucket-backup/*"
         ]
       }
     ]
   }
   ```

3. **Configurar variáveis**:
   ```bash
   BACKUP_REMOTE_ENABLED=true
   BACKUP_AWS_ACCESS_KEY=AKIA...
   BACKUP_AWS_SECRET_KEY=...
   BACKUP_AWS_BUCKET=seu-bucket-backup
   BACKUP_AWS_REGION=us-east-1
   ```

## Notificações

### Email (SMTP)
```bash
BACKUP_EMAIL_ENABLED=true
BACKUP_EMAIL_HOST=smtp.gmail.com
BACKUP_EMAIL_USER=backup@empresa.com
BACKUP_EMAIL_PASS=senha_app_gmail
BACKUP_EMAIL_TO=admin@empresa.com,ti@empresa.com
```

### Webhook (Slack/Discord)
```bash
BACKUP_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

## Troubleshooting

### Problemas Comuns

#### ❌ Erro: "Chave de criptografia não encontrada"
```bash
# Regenerar chave
node -e "const crypto = require('crypto'); const fs = require('fs'); fs.writeFileSync('./config/backup.key', crypto.randomBytes(32).toString('hex'));"
```

#### ❌ Erro: "Permissão negada no diretório de backup"
```bash
# Verificar permissões
icacls backups

# Corrigir permissões
icacls backups /grant %USERNAME%:F /T
```

#### ❌ Erro: "Falha na conexão com Supabase"
```bash
# Verificar variáveis
echo %SUPABASE_URL%
echo %SUPABASE_SERVICE_ROLE_KEY%

# Testar conexão
node -e "const { createClient } = require('@supabase/supabase-js'); const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); client.from('profiles').select('count').then(console.log);"
```

#### ❌ Tarefa agendada não executa
```bash
# Verificar se existe
schtasks /query /tn "HubControl-BackupFull"

# Recriar tarefa
scripts\setup-backup-tasks.bat

# Executar manualmente para testar
schtasks /run /tn "HubControl-BackupFull"
```

### Comandos de Diagnóstico

```bash
# Testar sistema completo
npm run backup:test

# Verificar configuração
node -e "console.log(JSON.stringify(require('./config/backup.json'), null, 2))"

# Verificar espaço em disco
dir backups /s

# Verificar logs
type logs\backup.log | findstr ERROR
```

## Segurança

### 🔒 Boas Práticas

1. **Proteger chave de criptografia**:
   - Nunca commitar `config/backup.key`
   - Fazer backup da chave em local seguro
   - Usar permissões restritivas (600)

2. **Armazenamento seguro**:
   - Usar HTTPS para armazenamento remoto
   - Configurar bucket S3 como privado
   - Usar IAM roles com permissões mínimas

3. **Monitoramento**:
   - Configurar alertas para falhas
   - Verificar logs regularmente
   - Testar restauração periodicamente

4. **Acesso restrito**:
   - Limitar acesso ao diretório de backups
   - Usar contas de serviço dedicadas
   - Auditar acessos aos backups

### 🚨 Alertas de Segurança

- ⚠️ **Nunca** armazene credenciais em texto plano
- ⚠️ **Sempre** use HTTPS para transferências
- ⚠️ **Teste** a restauração regularmente
- ⚠️ **Monitore** o espaço em disco
- ⚠️ **Rotacione** chaves periodicamente

## Otimização de Performance

### Configurações Recomendadas

```json
{
  "compression": {
    "enabled": true,
    "level": 6  // Balanceio entre velocidade e compressão
  },
  "retention": {
    "full": 4,      // Manter apenas 4 semanas
    "incremental": 7, // Manter apenas 7 dias
    "logs": 30       // Logs por mais tempo para auditoria
  }
}
```

### Monitoramento de Performance

```bash
# Verificar tamanho dos backups
dir backups\full /s
dir backups\incremental /s

# Verificar tempo de execução
type logs\backup.log | findstr "duration"

# Verificar uso de CPU/memória durante backup
# (usar Task Manager ou Performance Monitor)
```

## Checklist de Manutenção

### Diário
- [ ] Verificar se backups incrementais executaram
- [ ] Verificar logs de erro
- [ ] Monitorar espaço em disco

### Semanal
- [ ] Verificar se backup completo executou
- [ ] Revisar métricas de performance
- [ ] Testar um backup aleatório

### Mensal
- [ ] Executar teste completo do sistema
- [ ] Revisar configurações de retenção
- [ ] Verificar integridade dos backups
- [ ] Atualizar documentação se necessário

### Trimestral
- [ ] Testar restauração completa
- [ ] Revisar e atualizar chaves de criptografia
- [ ] Auditar acessos e permissões
- [ ] Revisar estratégia de backup

## Contatos de Emergência

### Em caso de problemas críticos:

1. **Falha total do sistema de backup**:
   - Execute backup manual imediatamente
   - Verifique logs detalhados
   - Contate a equipe de TI

2. **Corrupção de dados**:
   - NÃO execute novos backups
   - Identifique último backup íntegro
   - Prepare para restauração

3. **Perda de chave de criptografia**:
   - Verifique backups da chave
   - Considere backups não criptografados antigos
   - Gere nova chave para futuros backups

## Documentação Adicional

- [Guia de Monitoramento](./MONITORING_GUIDE.md)
- [Guia de Segurança](./SECURITY_GUIDE.md)
- [Guia de Deploy](./DEPLOY_GUIDE.md)
- [Configuração BPIX](./BPIX_PRODUCTION_SETUP.md)

---

**Última atualização**: Dezembro 2024  
**Versão**: 1.0  
**Responsável**: Equipe de Desenvolvimento Hub Control