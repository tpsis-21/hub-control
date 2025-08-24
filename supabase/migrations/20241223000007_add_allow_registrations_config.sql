-- Migration: Add allow_new_registrations configuration
-- Date: 2024-12-23
-- Description: Adiciona configuração para controlar novos cadastros

-- Inserir configuração para permitir novos cadastros
INSERT INTO system_config (key, value, description, category, is_public) 
VALUES (
  'app.allow_new_registrations', 
  'true', 
  'Permitir novos cadastros de usuários', 
  'app', 
  false
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();

-- Comentário explicativo
-- Esta configuração controla se novos usuários podem se registrar no sistema
-- Valor: true = permitir cadastros, false = bloquear cadastros
-- Categoria: app (configurações da aplicação)
-- is_public: false (apenas admins podem ver/modificar)