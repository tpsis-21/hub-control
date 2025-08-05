-- Migration: 20241221000001_add_server_selection_to_knowledge_base.sql
-- Adiciona suporte para seleção de servidores na base de conhecimento

-- Adicionar coluna para armazenar os IDs dos servidores selecionados
ALTER TABLE knowledge_base_articles 
ADD COLUMN IF NOT EXISTS server_ids UUID[] DEFAULT NULL;

-- Adicionar coluna para indicar se o artigo é visível para todos os servidores
ALTER TABLE knowledge_base_articles 
ADD COLUMN IF NOT EXISTS visible_to_all_servers BOOLEAN DEFAULT TRUE;

-- Comentários para documentação
COMMENT ON COLUMN knowledge_base_articles.server_ids IS 'Array de IDs dos servidores que podem visualizar este artigo. NULL ou vazio significa todos os servidores';
COMMENT ON COLUMN knowledge_base_articles.visible_to_all_servers IS 'Se TRUE, o artigo é visível para clientes de todos os servidores. Se FALSE, apenas para os servidores especificados em server_ids';

-- Índice para melhorar performance nas consultas por servidor
CREATE INDEX IF NOT EXISTS idx_knowledge_base_articles_server_ids 
ON knowledge_base_articles USING GIN (server_ids);

-- Função para verificar se um artigo é visível para um servidor específico
CREATE OR REPLACE FUNCTION is_article_visible_for_server(
  article_server_ids UUID[],
  article_visible_to_all BOOLEAN,
  client_server_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Se visível para todos os servidores, retorna TRUE
  IF article_visible_to_all THEN
    RETURN TRUE;
  END IF;
  
  -- Se server_ids é NULL ou vazio, considera visível para todos
  IF article_server_ids IS NULL OR array_length(article_server_ids, 1) IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Verifica se o servidor do cliente está na lista
  RETURN client_server_id = ANY(article_server_ids);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Atualizar artigos existentes para serem visíveis a todos os servidores por padrão
UPDATE knowledge_base_articles 
SET visible_to_all_servers = TRUE 
WHERE visible_to_all_servers IS NULL;

-- Exemplo de como usar a função:
-- SELECT * FROM knowledge_base_articles 
-- WHERE is_public = TRUE 
-- AND is_article_visible_for_server(server_ids, visible_to_all_servers, 'client-server-id-here');