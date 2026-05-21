# Backup e recuperação — Hub Control

**Fonte oficial:** export do projeto no **Supabase Dashboard** + scripts PowerShell do repositório.

Scripts `npm run backup:full` / `backup:incremental` **não existem** (removidos do `package.json` em maio/2026 para evitar falso positivo operacional).

---

## 1. Backup de produção (recomendado)

| Passo | Ação |
|-------|------|
| 1 | Supabase Dashboard → **Database** → **Backups** (ou export manual SQL) |
| 2 | Anotar data/hora do snapshot |
| 3 | Copiar `.env` de produção para local seguro (sem commitar) |
| 4 | (Opcional) Exportar bucket **avatars** em Storage se imagens forem críticas |

---

## 2. Restore em ambiente novo (HBCONTROL / staging)

1. Criar projeto Supabase ou restaurar backup no Dashboard  
2. Aplicar migrações na ordem de `supabase/migrations/README.md`  
3. Configurar `.env.local` com `NEXT_PUBLIC_*` + `SUPABASE_SERVICE_ROLE_KEY`  
4. Executar validações:

```bash
npm install
npm run verify:local
npm run verify:supabase-security
npm run verify:checkout
npm run test:integration
```

5. Definir admin: `profiles.role = 'admin'` + senha em Auth (`npm run admin:set-password`)  
6. **Rotacionar** `service_role` e senha do banco se o backup veio de ambiente comprometido  

Detalhes de env e callback URLs: [GUIA_HUB_CONTROL.md](./GUIA_HUB_CONTROL.md) §4.

---

## 3. Scripts no repositório

| Script | Uso |
|--------|-----|
| `scripts/recuperar-supabase.ps1` | Fluxo guiado pós-restore |
| `scripts/disaster-recovery/*.ps1` | Testes e procedimentos DR |
| `scripts/disaster-recovery/README.md` | Índice dos scripts DR |

**Teste trimestral (fora do CI):** executar `disaster-recovery-test.ps1` em ambiente de staging.

---

## 4. O que o CI não cobre

- Export automático do banco  
- Backup de Storage  
- Restore end-to-end  

Incluir verificação manual no checklist pré-deploy: [PLANO_ACAO_MELHORIAS.md](./PLANO_ACAO_MELHORIAS.md) Gate P0.

---

## 5. Scripts npm relacionados (opcionais)

| Comando | Estado |
|---------|--------|
| `backup:setup` | Gera config local (`setup-backup.js`) — não substitui export Supabase |
| `backup:list` / `backup:cleanup` / `backup:restore` | Dependem de `config/backup.json` e `src/lib/backup` — uso avançado |

Para operação diária, use apenas o **Dashboard Supabase**.
