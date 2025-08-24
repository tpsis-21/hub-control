# 🆘 Scripts de Recuperação de Desastres - Hub Control

Este diretório contém scripts essenciais para recuperação de desastres, backup automatizado, monitoramento e testes de continuidade do negócio.

## 📁 Estrutura dos Scripts

### 🚨 `emergency-failover.ps1`
**Propósito:** Failover automático em situações de emergência

**Uso:**
```powershell
# Failover para produção
.\emergency-failover.ps1 -Environment production

# Teste de failover (dry run)
.\emergency-failover.ps1 -Environment test -DryRun

# Failover com notificação customizada
.\emergency-failover.ps1 -Environment production -NotificationChannel "critical"
```

**Funcionalidades:**
- ✅ Verificação automática de saúde do sistema
- 🔄 Ativação de infraestrutura de backup
- 🌐 Atualização automática de DNS
- 📧 Notificações via Slack e e-mail
- 🔍 Verificação de integridade pós-failover

---

### 💾 `backup-automation.ps1`
**Propósito:** Backup automatizado com múltiplas estratégias

**Uso:**
```powershell
# Backup incremental diário
.\backup-automation.ps1 -BackupType incremental -Environment production

# Backup completo semanal
.\backup-automation.ps1 -BackupType full -Environment production

# Verificação de integridade dos backups
.\backup-automation.ps1 -BackupType verification -Environment production

# Limpeza de backups antigos
.\backup-automation.ps1 -BackupType cleanup -Environment production -RetentionDays 30
```

**Tipos de Backup:**
- 📦 **Incremental:** Apenas mudanças desde o último backup
- 🗃️ **Full:** Backup completo de todos os dados
- 🔄 **Differential:** Mudanças desde o último backup completo
- ✅ **Verification:** Verificação de integridade dos backups existentes
- 🧹 **Cleanup:** Limpeza de backups antigos

**Funcionalidades:**
- 🔐 Criptografia automática
- 📊 Compressão inteligente
- ☁️ Upload para S3
- 🔍 Verificação de integridade
- 📱 Notificações de status

---

### 📊 `monitoring-health-check.ps1`
**Propósito:** Monitoramento contínuo e verificação de saúde

**Uso:**
```powershell
# Verificação única
.\monitoring-health-check.ps1 -Environment production

# Monitoramento contínuo (5 minutos)
.\monitoring-health-check.ps1 -Environment production -ContinuousMode -IntervalSeconds 300

# Relatório detalhado em HTML
.\monitoring-health-check.ps1 -Environment production -DetailedReport -OutputFormat html

# Relatório em JSON para integração
.\monitoring-health-check.ps1 -Environment production -DetailedReport -OutputFormat json
```

**Verificações:**
- 🌐 **Serviços Web:** Disponibilidade e tempo de resposta
- 💾 **Banco de Dados:** Conectividade e performance
- 📊 **Sistema:** CPU, memória, disco
- 🔒 **Segurança:** Certificados SSL, vulnerabilidades
- ⚙️ **Processos:** Serviços críticos em execução

**Alertas Automáticos:**
- 🚨 Sistema indisponível
- ⏱️ Tempo de resposta elevado
- 📈 Uso de recursos alto
- 🔐 Certificados próximos do vencimento

---

### 🧪 `disaster-recovery-test.ps1`
**Propósito:** Testes automatizados de recuperação de desastres

**Uso:**
```powershell
# Teste básico (dry run)
.\disaster-recovery-test.ps1 -Environment test -TestType basic -DryRun

# Teste completo em ambiente de teste
.\disaster-recovery-test.ps1 -Environment test -TestType full

# Teste de cenários específicos
.\disaster-recovery-test.ps1 -Environment test -TestScenarios @("database_failure", "web_server_failure")

# Teste com relatório em HTML
.\disaster-recovery-test.ps1 -Environment test -TestType full -ReportFormat html
```

**Cenários de Teste:**
- 💾 **database_failure:** Falha do banco de dados
- 🌐 **web_server_failure:** Falha do servidor web
- 🌍 **network_partition:** Partição de rede
- 💿 **storage_failure:** Falha de armazenamento
- 🗂️ **backup_corruption:** Corrupção de backup
- 🌐 **dns_failure:** Falha de DNS
- 🔒 **ssl_certificate_expiry:** Expiração de certificado
- 📊 **high_load:** Alta carga do sistema

**Tipos de Teste:**
- 🔰 **Basic:** Testes essenciais (web + DNS)
- 🎯 **Full:** Todos os cenários disponíveis
- ⚙️ **Custom:** Cenários personalizados

---

## 🚀 Configuração Inicial

### 1. Variáveis de Ambiente

Crie um arquivo `.env` ou configure as seguintes variáveis:

```bash
# URLs dos serviços
PRIMARY_URL=https://hubcontrol.com
BACKUP_URL=https://backup.hubcontrol.com

# Banco de dados
DATABASE_URL=postgresql://user:pass@host:5432/hubcontrol
DATABASE_URL_TEST=postgresql://user:pass@test-host:5432/hubcontrol_test

# Notificações
SLACK_WEBHOOK_MONITORING=https://hooks.slack.com/services/...
SLACK_WEBHOOK_DR=https://hooks.slack.com/services/...
SLACK_WEBHOOK_MONITORING_TEST=https://hooks.slack.com/services/...
SLACK_WEBHOOK_DR_TEST=https://hooks.slack.com/services/...

# E-mail (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@hubcontrol.com
SMTP_PASS=app_password
ALERT_EMAIL_TO=admin@hubcontrol.com

# AWS (para backups)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BACKUP_BUCKET=hubcontrol-backups

# Cloudflare (para DNS)
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ZONE_ID=...
```

### 2. Dependências

Instale as dependências necessárias:

```powershell
# AWS CLI (para backups S3)
winget install Amazon.AWSCLI

# PostgreSQL Client (para backups de banco)
winget install PostgreSQL.PostgreSQL

# 7-Zip (para compressão)
winget install 7zip.7zip
```

### 3. Permissões

Configure as permissões necessárias:

```powershell
# Executar como administrador para alguns scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Permissões para AWS CLI
aws configure
```

---

## 📅 Cronograma Recomendado

### Execução Automática

Configure tarefas agendadas no Windows:

```powershell
# Backup incremental diário (2:00 AM)
schtasks /create /tn "HubControl-Backup-Daily" /tr "powershell.exe -File C:\path\to\backup-automation.ps1 -BackupType incremental -Environment production" /sc daily /st 02:00

# Backup completo semanal (domingo, 1:00 AM)
schtasks /create /tn "HubControl-Backup-Weekly" /tr "powershell.exe -File C:\path\to\backup-automation.ps1 -BackupType full -Environment production" /sc weekly /d SUN /st 01:00

# Monitoramento contínuo
schtasks /create /tn "HubControl-Monitoring" /tr "powershell.exe -File C:\path\to\monitoring-health-check.ps1 -Environment production -ContinuousMode" /sc onstart

# Teste de DR mensal (primeiro domingo, 3:00 AM)
schtasks /create /tn "HubControl-DR-Test" /tr "powershell.exe -File C:\path\to\disaster-recovery-test.ps1 -Environment test -TestType full -DryRun" /sc monthly /mo first /d SUN /st 03:00
```

### Cronograma Manual

| Frequência | Atividade | Script |
|------------|-----------|--------|
| **Diário** | Backup incremental | `backup-automation.ps1` |
| **Diário** | Verificação de saúde | `monitoring-health-check.ps1` |
| **Semanal** | Backup completo | `backup-automation.ps1` |
| **Semanal** | Verificação de backups | `backup-automation.ps1 -BackupType verification` |
| **Mensal** | Teste de DR básico | `disaster-recovery-test.ps1 -TestType basic` |
| **Trimestral** | Teste de DR completo | `disaster-recovery-test.ps1 -TestType full` |
| **Anual** | Revisão do plano de DR | Manual |

---

## 🚨 Procedimentos de Emergência

### 1. Sistema Indisponível

```powershell
# 1. Verificar status atual
.\monitoring-health-check.ps1 -Environment production -DetailedReport

# 2. Se confirmada a falha, executar failover
.\emergency-failover.ps1 -Environment production

# 3. Monitorar recuperação
.\monitoring-health-check.ps1 -Environment production -ContinuousMode -IntervalSeconds 60
```

### 2. Corrupção de Dados

```powershell
# 1. Parar serviços (se necessário)
# 2. Restaurar do backup mais recente
.\backup-automation.ps1 -BackupType restore -Environment production -RestorePoint "latest"

# 3. Verificar integridade
.\backup-automation.ps1 -BackupType verification -Environment production

# 4. Reiniciar serviços
```

### 3. Teste de Recuperação

```powershell
# Sempre testar em ambiente de teste primeiro
.\disaster-recovery-test.ps1 -Environment test -TestType full -DryRun

# Se tudo OK, executar teste real
.\disaster-recovery-test.ps1 -Environment test -TestType full
```

---

## 📊 Métricas e KPIs

### Objetivos de Recuperação

| Ambiente | RTO (Recovery Time Objective) | RPO (Recovery Point Objective) |
|----------|-------------------------------|--------------------------------|
| **Produção** | 5 minutos | 15 minutos |
| **Teste** | 15 minutos | 1 hora |

### Métricas de Monitoramento

- **Disponibilidade:** > 99.9%
- **Tempo de Resposta:** < 3 segundos
- **Taxa de Erro:** < 2%
- **Uso de CPU:** < 70%
- **Uso de Memória:** < 80%
- **Uso de Disco:** < 85%

### Alertas Críticos

- 🚨 **Sistema indisponível:** Notificação imediata
- ⏱️ **Tempo de resposta > 5s:** Alerta em 2 minutos
- 📊 **Recursos > 90%:** Alerta em 5 minutos
- 💾 **Backup falhou:** Alerta em 1 hora
- 🔐 **Certificado expira em 7 dias:** Alerta diário

---

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Script não executa
```powershell
# Verificar política de execução
Get-ExecutionPolicy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 2. Erro de permissão
```powershell
# Executar como administrador
Start-Process powershell -Verb RunAs
```

#### 3. Variáveis de ambiente não encontradas
```powershell
# Verificar variáveis
Get-ChildItem Env: | Where-Object Name -like "*HUB*"

# Carregar do arquivo .env
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}
```

#### 4. Falha na conectividade
```powershell
# Testar conectividade
Test-NetConnection hubcontrol.com -Port 443
Test-NetConnection backup.hubcontrol.com -Port 443
```

#### 5. Backup falha
```powershell
# Verificar espaço em disco
Get-WmiObject -Class Win32_LogicalDisk | Select-Object DeviceID, @{Name="Size(GB)";Expression={[math]::Round($_.Size/1GB,2)}}, @{Name="FreeSpace(GB)";Expression={[math]::Round($_.FreeSpace/1GB,2)}}

# Verificar permissões do diretório
Get-Acl ./backups
```

### Logs e Diagnóstico

Todos os scripts geram logs detalhados:

- **Logs de execução:** `*.log` (mesmo diretório)
- **Relatórios de teste:** `dr-test-report-*.html`
- **Relatórios de saúde:** `health-report-*.json`
- **Logs de backup:** `backup-*.log`

---

## 📞 Contatos de Emergência

### Equipe Técnica
- **Administrador Principal:** admin@hubcontrol.com
- **Equipe DevOps:** devops@hubcontrol.com
- **Suporte 24/7:** +55 11 9999-9999

### Fornecedores Críticos
- **Hospedagem:** suporte@provedor.com
- **DNS (Cloudflare):** Painel de controle
- **Banco de Dados:** dba@hubcontrol.com

### Canais de Comunicação
- **Slack:** #alerts, #incidents
- **E-mail:** alerts@hubcontrol.com
- **WhatsApp:** Grupo "Hub Control Emergência"

---

## 📚 Documentação Adicional

- [Plano de Recuperação de Desastres](../../docs/DISASTER_RECOVERY_PLAN.md)
- [Guia de Administração](../../docs/ADMIN_TRAINING.md)
- [Procedimentos Operacionais](../../docs/ADMIN_PROCEDURES.md)
- [Solução de Problemas](../../docs/TROUBLESHOOTING.md)

---

## 🔄 Versionamento

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0.0 | 01/12/2024 | Versão inicial dos scripts |

---

## ⚖️ Licença

Este conjunto de scripts é propriedade do Hub Control e deve ser usado apenas para operações autorizadas do sistema.

**⚠️ IMPORTANTE:** Sempre teste em ambiente de desenvolvimento antes de executar em produção!