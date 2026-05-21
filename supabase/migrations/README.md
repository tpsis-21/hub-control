# Migrações Supabase — Hub Control

## Ordem de aplicação (projeto novo / HBCONTROL)

1. **Baseline** — arquivos com prefixo `20241220*` … `20241225*` (schema core, notificações, integrações)
2. **TheBest** — `20250114000001` … `20250115000008` (mapeamentos, funções RPC, automação)
3. **Fase 3 RLS** — `20260519120000_hub_control_rls_phase3.sql`
4. **Revoke anon em SECURITY DEFINER** — `20260519120100_revoke_anon_security_definer_execute.sql`
5. **Plano segurança Supabase (lacunas)** — `20260520140000_plano_acao_seguranca_supabase.sql` — ver `PLANO_ACAO_SEGURANCA_SUPABASE.md`
6. **Plano segurança — Advisor hardening** — `20260520140200_plano_acao_seguranca_advisor_hardening.sql`
7. **Revoke PUBLIC/anon EXECUTE** — `20260520140300_revoke_public_anon_execute_security.sql`
8. **Checkout Hub** — `20260519140000_hub_checkout.sql`

Aplicar apenas arquivos **nesta pasta raiz** (`supabase/migrations/*.sql`). O Supabase CLI ignora subpastas.

## Não aplicar

| Pasta | Conteúdo |
|-------|----------|
| `_archive_DO_NOT_APPLY/` | Scripts perigosos ou obsoletos (`disable_all_rls`, etc.) |
| `_archive_DO_NOT_APPLY/legacy_hotfixes/` | Correções manuais, diagnósticos e RLS pontuais já absorvidos na Fase 3 |

## Pós-restore

Ver `docs/GUIA_HUB_CONTROL.md` (seção 4).

## TheBest — mapeamento de planos

Tabelas: `thebest_configs`, `thebest_packages`, `thebest_plan_mappings`, `plans`.

RPCs usadas pela API `/api/thebest/mappings`:

- `get_mapping_statistics(p_config_id)`
- `get_unmapped_thebest_packages(p_config_id)`
- `auto_map_thebest_packages(p_config_id)`

Interface: **Integrações → aba Mapeamento TheBest** (`TheBestPlanMappingManager`).
