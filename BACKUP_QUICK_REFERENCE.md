# 🔄 Guia Rápido de Backup - Hub Control

## 📋 Scripts Disponíveis

### 1. 📁 **backup-script.ps1** - Backup de Arquivos
```powershell
# Backup completo
.\backup-script.ps1 -BackupType "completo"

# Backup apenas de arquivos
.\backup-script.ps1 -BackupType "arquivos"

# Backup apenas de configurações
.\backup-script.ps1 -BackupType "configuracao"
```

### 2. 🗄️ **backup-database.ps1** - Backup do Banco de Dados
```powershell
# Backup completo do banco
.\backup-database.ps1 -ProjectId "seu-project-id" -DatabasePassword "sua-senha"

# Backup apenas do schema
.\backup-database.ps1 -ProjectId "seu-project-id" -DatabasePassword "sua-senha" -BackupType "schema"

# Backup apenas dos dados
.\backup-database.ps1 -ProjectId "seu-project-id" -DatabasePassword "sua-senha" -BackupType "data"

# Backup de tabelas específicas
.\backup-database.ps1 -ProjectId "seu-project-id" -DatabasePassword "sua-senha" -BackupType "tables" -Tables @("profiles", "audit_logs")
```

### 3. 🤖 **setup-automated-backup.ps1** - Backup Automático
```powershell
# Configurar backup diário às 02:00
.\setup-automated-backup.ps1 -ProjectId "seu-project-id" -DatabasePassword "sua-senha"

# Configurar backup semanal com email
.\setup-automated-backup.ps1 -ProjectId "seu-project-id" -DatabasePassword "sua-senha" -Schedule "weekly" -EnableEmailNotification -EmailTo "admin@empresa.com" -EmailFrom "backup@empresa.com" -SmtpServer "smtp.empresa.com"

# Verificar status do agendamento
.\setup-automated-backup.ps1 -SetupOnly

# Remover agendamento
.\setup-automated-backup.ps1 -RemoveSchedule
```

## 🚀 Início Rápido

### Passo 1: Backup Manual Completo
```powershell
# 1. Backup dos arquivos
.\backup-script.ps1 -BackupType "completo"

# 2. Backup do banco de dados
.\backup-database.ps1 -ProjectId "SEU_PROJECT_ID" -DatabasePassword "SUA_SENHA"
```

### Passo 2: Configurar Backup Automático
```powershell
# Execute como Administrador
.\setup-automated-backup.ps1 -ProjectId "SEU_PROJECT_ID" -DatabasePassword "SUA_SENHA" -Schedule "daily" -Time "02:00"
```

## 📍 Localizações Importantes

### Diretórios de Backup
- **Padrão**: `C:\Backups\hub-control\`
- **Arquivos**: `C:\Backups\hub-control\files\`
- **Banco**: `C:\Backups\hub-control\database\`
- **Logs**: `C:\Backups\hub-control\automation\logs\`

### Arquivos de Configuração
- **Backup Config**: `C:\Backups\hub-control\automation\config\backup-config.json`
- **Script Automação**: `C:\Backups\hub-control\automation\run-automated-backup.ps1`

## 🔧 Pré-requisitos

### Para Backup de Arquivos
- ✅ PowerShell 5.0+
- ✅ Permissões de leitura nos arquivos do projeto

### Para Backup do Banco
- ✅ PostgreSQL Client Tools instalado
- ✅ Acesso à internet
- ✅ Credenciais do Supabase

### Para Backup Automático
- ✅ Privilégios de Administrador
- ✅ Todos os pré-requisitos acima

## 📊 Tipos de Backup

| Tipo | Descrição | Tempo | Tamanho |
|------|-----------|-------|----------|
| **Arquivos** | Código fonte, configs | ~30s | ~50MB |
| **Schema** | Estrutura do banco | ~10s | ~5MB |
| **Data** | Dados do banco | ~60s | Variável |
| **Full DB** | Schema + Dados | ~90s | Variável |
| **Completo** | Arquivos + Banco | ~2min | Variável |

## 🔍 Verificação de Backup

### Verificar Arquivos de Backup
```powershell
# Listar backups recentes
Get-ChildItem "C:\Backups\hub-control" -Recurse -File | Sort-Object CreationTime -Descending | Select-Object -First 10

# Verificar tamanho dos backups
Get-ChildItem "C:\Backups\hub-control" -Recurse -File | Measure-Object -Property Length -Sum
```

### Verificar Agendamento
```powershell
# Status da tarefa agendada
Get-ScheduledTask -TaskName "HubControl-AutoBackup"

# Histórico de execução
Get-ScheduledTaskInfo -TaskName "HubControl-AutoBackup"
```

## 🚨 Solução de Problemas

### Erro: "pg_dump não encontrado"
```powershell
# Instalar PostgreSQL Client Tools
# Download: https://www.postgresql.org/download/windows/
# Ou via Chocolatey:
choco install postgresql
```

### Erro: "Acesso negado" no agendamento
```powershell
# Execute PowerShell como Administrador
# Clique direito no PowerShell > "Executar como administrador"
```

### Erro: "Falha na conexão com banco"
- ✅ Verifique o Project ID no Supabase Dashboard
- ✅ Verifique a senha do banco em Settings > Database
- ✅ Confirme que o projeto está ativo

### Backup muito lento
- ✅ Use `-BackupType "schema"` para backup rápido
- ✅ Exclua arquivos grandes desnecessários
- ✅ Execute fora do horário de pico

## 📈 Monitoramento

### Logs de Backup
```powershell
# Ver logs recentes
Get-Content "C:\Backups\hub-control\automation\logs\auto_backup_*.log" | Select-Object -Last 50

# Monitorar em tempo real
Get-Content "C:\Backups\hub-control\automation\logs\auto_backup_*.log" -Wait
```

### Alertas por Email
- Configure `-EnableEmailNotification` no setup automático
- Receba notificações de sucesso e falha
- Monitore execuções remotamente

## 🔄 Restauração Rápida

### Restaurar Arquivos
```powershell
# Extrair backup de arquivos
Expand-Archive "C:\Backups\hub-control\files\backup_YYYYMMDD_HHMMSS.zip" -DestinationPath "C:\Restore\hub-control"
```

### Restaurar Banco de Dados
```powershell
# Restaurar backup do banco
psql -h db.SEU_PROJECT_ID.supabase.co -p 5432 -U postgres -d postgres -f "C:\Backups\hub-control\database\full_backup_YYYYMMDD_HHMMSS.sql"
```

## 📞 Suporte

### Documentação Completa
- 📖 **BACKUP_BACKEND_GUIDE.md** - Guia completo de backup
- 🧹 **cleanup_unnecessary_tables.sql** - Limpeza de tabelas
- 🔍 **check_table_dependencies.sql** - Verificação de dependências

### Comandos de Emergência
```powershell
# Backup de emergência (rápido)
.\backup-script.ps1 -BackupType "arquivos"
.\backup-database.ps1 -ProjectId "SEU_ID" -DatabasePassword "SENHA" -BackupType "schema"

# Parar backup automático
.\setup-automated-backup.ps1 -RemoveSchedule

# Verificar espaço em disco
Get-WmiObject -Class Win32_LogicalDisk | Select-Object DeviceID, @{Name="Size(GB)";Expression={[math]::Round($_.Size/1GB,2)}}, @{Name="FreeSpace(GB)";Expression={[math]::Round($_.FreeSpace/1GB,2)}}
```

---

## 🎯 Checklist de Backup

- [ ] ✅ Scripts de backup testados
- [ ] ✅ Credenciais do Supabase configuradas
- [ ] ✅ PostgreSQL Client Tools instalado
- [ ] ✅ Diretório de backup criado
- [ ] ✅ Backup manual executado com sucesso
- [ ] ✅ Backup automático configurado
- [ ] ✅ Notificações por email configuradas (opcional)
- [ ] ✅ Teste de restauração realizado
- [ ] ✅ Monitoramento de logs configurado
- [ ] ✅ Limpeza de backups antigos agendada

**🎉 Seu sistema de backup está pronto!**