# 🚀 PRÓXIMOS PASSOS - OTIMIZAÇÃO DE SEGURANÇA

## ✅ MFA HABILITADO PARA ADMINISTRADORES

Parabéns! Você executou com sucesso:
```sql
UPDATE profiles SET mfa_enabled = true WHERE role = 'admin';
```

**Agora execute novamente para ver a melhoria:**
```sql
SELECT security_health_check();
```

---

## 🎯 PRÓXIMAS OTIMIZAÇÕES RECOMENDADAS

### 1. 🔴 ALTA PRIORIDADE - Completar Cobertura RLS

**Objetivo:** Atingir 100% de cobertura RLS (atualmente 70%)

**Verificar tabelas sem RLS:**
```sql
SELECT 
  schemaname, 
  tablename,
  'Tabela sem RLS - Precisa de política' as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT IN (
  SELECT DISTINCT tablename 
  FROM pg_policies 
  WHERE schemaname = 'public'
)
ORDER BY tablename;
```

**Para cada tabela encontrada, aplicar RLS:**
```sql
-- Exemplo para uma tabela genérica
ALTER TABLE nome_da_tabela ENABLE ROW LEVEL SECURITY;

-- Política básica para administradores
CREATE POLICY "Admins can manage all" ON nome_da_tabela
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Política para usuários (se aplicável)
CREATE POLICY "Users can view own data" ON nome_da_tabela
  FOR SELECT USING (user_id = auth.uid());
```

### 2. 🟡 MÉDIA PRIORIDADE - Sistema de Notificações

**Configurar alertas por email:**
```sql
-- Função para enviar notificações (exemplo)
CREATE OR REPLACE FUNCTION send_security_notification(
  alert_type text,
  message text,
  recipient_email text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Integração com serviço de email (Resend, SendGrid, etc.)
  -- Por enquanto, apenas registra no log
  INSERT INTO audit_logs (action, details)
  VALUES ('notification_sent', jsonb_build_object(
    'type', alert_type,
    'message', message,
    'recipient', recipient_email
  ));
  
  RETURN true;
END;
$$;
```

### 3. 🟢 BAIXA PRIORIDADE - Monitoramento Avançado

**Dashboard de Segurança:**
```sql
-- View para dashboard de segurança
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
  'Alertas Ativos' as metric,
  COUNT(*) as value,
  'security_alerts' as source
FROM security_alerts 
WHERE status = 'active'

UNION ALL

SELECT 
  'Atividades Suspeitas (24h)' as metric,
  COUNT(*) as value,
  'suspicious_activities' as source
FROM suspicious_activities 
WHERE created_at > now() - interval '24 hours'

UNION ALL

SELECT 
  'Logins Falharam (24h)' as metric,
  COUNT(*) as value,
  'audit_logs' as source
FROM audit_logs 
WHERE action = 'login_failed' 
AND created_at > now() - interval '24 hours';
```

---

## 🔧 COMANDOS ÚTEIS PARA MONITORAMENTO

### Verificar Status Geral
```sql
SELECT security_health_check();
```

### Verificar Alertas Recentes
```sql
SELECT 
  type,
  severity,
  title,
  created_at,
  status
FROM security_alerts 
ORDER BY created_at DESC 
LIMIT 10;
```

### Verificar Atividades Suspeitas
```sql
SELECT 
  activity_type,
  risk_score,
  details,
  created_at
FROM suspicious_activities 
WHERE created_at > now() - interval '7 days'
ORDER BY risk_score DESC, created_at DESC;
```

### Verificar Logs de Auditoria
```sql
SELECT 
  action,
  table_name,
  user_id,
  created_at,
  details
FROM audit_logs 
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC 
LIMIT 20;
```

---

## 📊 METAS DE SEGURANÇA

| Métrica | Atual | Meta | Ação |
|---------|-------|------|------|
| Score de Segurança | ~48 | 80+ | Completar RLS + Notificações |
| Cobertura RLS | 70% | 100% | Aplicar RLS nas 9 tabelas restantes |
| MFA Admin | 100% | 100% | ✅ Concluído |
| Alertas Ativos | 0 | 0 | ✅ Mantido |
| Backup Automático | ❌ | ✅ | Configurar backup diário |

---

## 🛡️ CHECKLIST DE SEGURANÇA SEMANAL

- [ ] Executar `SELECT security_health_check();`
- [ ] Verificar alertas ativos
- [ ] Revisar atividades suspeitas
- [ ] Verificar logs de auditoria
- [ ] Testar backup e restauração
- [ ] Atualizar políticas RLS se necessário
- [ ] Revisar acessos de usuários

---

## 📞 PRÓXIMA AÇÃO

**Execute agora:**
```sql
SELECT security_health_check();
```

**Esperado:** Score de segurança deve ter aumentado significativamente com MFA habilitado!

**Depois:** Identifique e aplique RLS nas tabelas restantes para atingir 100% de cobertura.