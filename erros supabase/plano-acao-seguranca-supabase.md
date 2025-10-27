# Plano de Ação - Correção de Problemas de Segurança do Supabase

## 📋 Resumo Executivo

Análise dos arquivos de lint do Supabase identificou **65 problemas de segurança** que precisam ser corrigidos:

- **8 Views** com `SECURITY DEFINER` (ERRO - Alta Prioridade)
- **49 Funções** com `search_path` mutável (AVISO - Alta Prioridade)
- **3 Configurações de Autenticação** (AVISO - Média Prioridade)
- **1 Atualização do PostgreSQL** (AVISO - Média Prioridade)

## 🎯 Objetivos

1. **Eliminar riscos de segurança críticos** relacionados a views e funções
2. **Fortalecer configurações de autenticação** 
3. **Manter o sistema atualizado** com patches de segurança
4. **Implementar práticas de segurança** para prevenir problemas futuros

---

## 🚨 FASE 1: CORREÇÃO DE VIEWS COM SECURITY DEFINER (CRÍTICO)

### **Prioridade:** ALTA | **Risco:** CRÍTICO | **Tempo Estimado:** 2-3 horas

### Problema Identificado
8 views estão configuradas com `SECURITY DEFINER`, executando com privilégios do criador em vez do usuário atual, criando riscos de escalação de privilégios.

### Views Afetadas:
1. `public.analytics_device_metrics`
2. `public.thebest_dashboard`
3. `public.user_activity_summary`
4. `public.analytics_daily_active_users`
5. `public.analytics_popular_pages`
6. `public.thebest_mapping_quality_analysis`
7. `public.thebest_mapping_summary`
8. `public.thebest_mapping_issues`

### Plano de Correção:

#### Etapa 1.1: Análise de Dependências (30 min)
- Verificar quais aplicações/usuários utilizam essas views
- Identificar permissões necessárias para cada view
- Mapear tabelas base e suas permissões

#### Etapa 1.2: Backup e Documentação (15 min)
- Fazer backup das definições atuais das views
- Documentar estrutura e dependências

#### Etapa 1.3: Correção das Views (90 min)
- Recriar views removendo `SECURITY DEFINER`
- Implementar `SECURITY INVOKER` (padrão)
- Ajustar permissões nas tabelas base se necessário

#### Etapa 1.4: Testes de Validação (30 min)
- Testar acesso com diferentes usuários
- Validar funcionamento das aplicações
- Verificar se dados sensíveis não estão expostos

### Scripts a Criar:
- `backup-views-security-definer.sql`
- `fix-views-security-definer.sql`
- `validate-views-permissions.sql`

---

## ⚠️ FASE 2: CORREÇÃO DE FUNÇÕES COM SEARCH_PATH MUTÁVEL (ALTO)

### **Prioridade:** ALTA | **Risco:** ALTO | **Tempo Estimado:** 3-4 horas

### Problema Identificado
49 funções não têm `search_path` fixo, permitindo ataques de injeção de schema.

### Funções Afetadas (Lista Completa):
1. `update_push_subscriptions_updated_at`
2. `convert_thebest_duration_to_days`
3. `validate_password_strength`
4. `update_expenses_updated_at`
5. `is_article_visible_for_server`
6. `update_in_app_notifications_updated_at`
7. `convert_duration_flexible`
8. `generate_unique_panel_plan_id`
9. `ensure_panel_plan_id`
10. `generate_unique_panel_server_id`
11. `ensure_panel_server_id`
12. `update_thebest_mappings_updated_at`
13. `trigger_auto_map_new_packages`
14. `trigger_auto_sync_on_package_change`
15. `trigger_auto_sync_on_plan_change`
16. `trigger_validate_mapping_on_change`
17. `convert_days_to_thebest_enum`
18. `handle_new_user`
19. `create_security_alert`
20. `resolve_security_alert`
21. `trigger_suspicious_activity_detection`
22. `validate_strong_password`
23. `check_rate_limit`
24. `trigger_log_mapping_changes`
25. `set_trigger_enabled`
26. `auto_map_thebest_packages`
27. `validate_thebest_mapping`
28. `get_unmapped_thebest_packages`
29. `get_mapping_statistics`
30. `disable_automation_triggers`
31. `enable_automation_triggers`
32. `detect_suspicious_activity`
33. `sync_thebest_packages_from_csv`
34. `sync_thebest_to_hubcontrol`
35. `sync_hubcontrol_to_thebest`
36. `sync_bidirectional`
37. `check_sync_status`
38. `update_updated_at_column`
39. `scheduled_sync`
40. `security_health_check`
41. `is_mfa_required`
42. `sanitize_html`
43. `sanitize_profile_data`
44. `update_updated_at`
45. `validate_mapping_business_rules`
46. `validate_sync_configuration`
47. `calculate_compatibility_score`
48. `get_mapping_recommendations`
49. `trigger_validate_mapping_before_save`
50. `test_duration_conversions`
51. `current_user_is_admin`

### Plano de Correção:

#### Etapa 2.1: Verificação de Funções Existentes (30 min)
- Executar script de verificação para identificar funções realmente existentes
- Categorizar funções por tipo (triggers, utilitárias, de negócio)

#### Etapa 2.2: Backup das Funções (15 min)
- Fazer backup das definições atuais
- Documentar assinaturas e dependências

#### Etapa 2.3: Correção Automatizada (120 min)
- Aplicar script de correção que adiciona `SET search_path = ''` 
- Processar funções em lotes para evitar sobrecarga
- Monitorar logs durante execução

#### Etapa 2.4: Validação Funcional (60 min)
- Testar funções críticas individualmente
- Verificar triggers e automações
- Validar integridade dos dados

### Scripts Disponíveis:
- ✅ `check-existing-functions.sql` (já criado)
- ✅ `fix-function-search-paths-corrigido.sql` (já criado)
- `validate-functions-after-fix.sql` (a criar)

---

## 🔐 FASE 3: CONFIGURAÇÕES DE AUTENTICAÇÃO (MÉDIO)

### **Prioridade:** MÉDIA | **Risco:** MÉDIO | **Tempo Estimado:** 1-2 horas

### Problemas Identificados:

#### 3.1: OTP com Expiração Longa
- **Problema:** OTP configurado para mais de 1 hora
- **Risco:** Janela de ataque ampliada
- **Solução:** Reduzir para 15-30 minutos

#### 3.2: Proteção contra Senhas Vazadas Desabilitada
- **Problema:** Verificação HaveIBeenPwned desabilitada
- **Risco:** Usuários podem usar senhas comprometidas
- **Solução:** Habilitar proteção

### Plano de Correção:

#### Etapa 3.1: Configuração OTP (30 min)
- Acessar painel do Supabase
- Ajustar configuração de expiração OTP
- Testar fluxo de autenticação

#### Etapa 3.2: Proteção de Senhas (30 min)
- Habilitar verificação HaveIBeenPwned
- Configurar políticas de senha
- Testar validação de senhas

#### Etapa 3.3: Documentação (30 min)
- Documentar novas configurações
- Criar guia para desenvolvedores
- Atualizar políticas de segurança

---

## 🔄 FASE 4: ATUALIZAÇÃO DO POSTGRESQL (MÉDIO)

### **Prioridade:** MÉDIA | **Risco:** MÉDIO | **Tempo Estimado:** 2-3 horas

### Problema Identificado:
- **Versão Atual:** supabase-postgres-17.4.1.057
- **Status:** Patches de segurança disponíveis
- **Risco:** Vulnerabilidades conhecidas não corrigidas

### Plano de Correção:

#### Etapa 4.1: Planejamento da Atualização (60 min)
- Verificar compatibilidade da aplicação
- Agendar janela de manutenção
- Preparar plano de rollback

#### Etapa 4.2: Backup Completo (30 min)
- Backup completo do banco
- Verificar integridade do backup
- Documentar processo de restore

#### Etapa 4.3: Atualização (60 min)
- Executar atualização via painel Supabase
- Monitorar processo
- Validar funcionamento

#### Etapa 4.4: Validação Pós-Atualização (30 min)
- Testar funcionalidades críticas
- Verificar logs de erro
- Confirmar resolução de vulnerabilidades

---

## 📅 CRONOGRAMA DE EXECUÇÃO

### Semana 1 (Crítico)
- **Dia 1-2:** Fase 1 - Correção de Views SECURITY DEFINER
- **Dia 3-4:** Fase 2 - Correção de Funções search_path

### Semana 2 (Importante)
- **Dia 1:** Fase 3 - Configurações de Autenticação
- **Dia 2-3:** Fase 4 - Atualização PostgreSQL

## 🎯 CRITÉRIOS DE SUCESSO

### Fase 1 - Views:
- ✅ Todas as 8 views removidas de `SECURITY DEFINER`
- ✅ Permissões adequadas nas tabelas base
- ✅ Aplicações funcionando normalmente
- ✅ Nenhum dado sensível exposto

### Fase 2 - Funções:
- ✅ Todas as 49+ funções com `search_path` fixo
- ✅ Nenhuma função quebrada após correção
- ✅ Triggers e automações funcionando
- ✅ Performance mantida

### Fase 3 - Autenticação:
- ✅ OTP com expiração ≤ 30 minutos
- ✅ Proteção HaveIBeenPwned ativa
- ✅ Políticas de senha atualizadas

### Fase 4 - PostgreSQL:
- ✅ Versão atualizada com patches
- ✅ Aplicação funcionando normalmente
- ✅ Performance mantida ou melhorada

## 🚨 PLANO DE CONTINGÊNCIA

### Se Problemas na Fase 1 (Views):
1. Restaurar definições originais
2. Implementar permissões granulares
3. Migração gradual por view

### Se Problemas na Fase 2 (Funções):
1. Rollback via backup
2. Correção função por função
3. Teste individual de cada correção

### Se Problemas na Fase 3 (Auth):
1. Reverter configurações
2. Implementar mudanças gradualmente
3. Comunicar usuários sobre mudanças

### Se Problemas na Fase 4 (PostgreSQL):
1. Rollback para versão anterior
2. Investigar incompatibilidades
3. Agendar nova janela de manutenção

## 📊 MONITORAMENTO PÓS-IMPLEMENTAÇÃO

### Métricas a Acompanhar:
- **Segurança:** Número de alertas de segurança
- **Performance:** Tempo de resposta das queries
- **Disponibilidade:** Uptime da aplicação
- **Erros:** Logs de erro relacionados às mudanças

### Ferramentas de Monitoramento:
- Dashboard do Supabase
- Logs da aplicação
- Métricas de performance
- Alertas de segurança

---

## ✅ APROVAÇÃO NECESSÁRIA

Este plano requer aprovação para:

1. **Execução das Fases 1 e 2** (críticas)
2. **Agendamento da janela de manutenção** para Fase 4
3. **Recursos necessários** (tempo da equipe)
4. **Comunicação com usuários** sobre possíveis indisponibilidades

**Aguardando aprovação para iniciar a implementação.**

---

*Documento criado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}*
*Responsável: Assistente de Engenharia de Software*
*Status: Aguardando Aprovação*