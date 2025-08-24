-- 🔒 Migração: Tabela de Auditoria de Uploads de Arquivos
-- Criação da tabela para rastrear todos os uploads de arquivos

-- Criar tabela de auditoria de uploads
CREATE TABLE IF NOT EXISTS public.file_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    original_name TEXT NOT NULL,
    secure_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    bucket TEXT NOT NULL,
    path TEXT NOT NULL,
    public_url TEXT,
    validation_passed BOOLEAN DEFAULT true,
    validation_warnings JSONB,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Índices para performance
    CONSTRAINT file_uploads_file_size_check CHECK (file_size > 0 AND file_size <= 104857600), -- Max 100MB
    CONSTRAINT file_uploads_bucket_check CHECK (bucket IN ('avatars', 'documents', 'user-uploads', 'profiles'))
);

-- Criar índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id ON public.file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_bucket ON public.file_uploads(bucket);
CREATE INDEX IF NOT EXISTS idx_file_uploads_uploaded_at ON public.file_uploads(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_uploads_validation ON public.file_uploads(validation_passed);
CREATE INDEX IF NOT EXISTS idx_file_uploads_active ON public.file_uploads(user_id, bucket) WHERE deleted_at IS NULL;

-- Habilitar RLS
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só podem ver seus próprios uploads
CREATE POLICY "Users can view own file uploads" ON public.file_uploads
    FOR SELECT USING (auth.uid() = user_id);

-- Política: Usuários só podem inserir seus próprios uploads
CREATE POLICY "Users can insert own file uploads" ON public.file_uploads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política: Usuários só podem atualizar seus próprios uploads (soft delete)
CREATE POLICY "Users can update own file uploads" ON public.file_uploads
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Função para soft delete de uploads
CREATE OR REPLACE FUNCTION public.soft_delete_file_upload(upload_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se o usuário é o dono do arquivo
    IF NOT EXISTS (
        SELECT 1 FROM public.file_uploads 
        WHERE id = upload_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Arquivo não encontrado ou acesso negado';
    END IF;
    
    -- Marcar como deletado
    UPDATE public.file_uploads 
    SET deleted_at = NOW()
    WHERE id = upload_id AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

-- Função para limpeza automática de uploads antigos (executar via cron)
CREATE OR REPLACE FUNCTION public.cleanup_old_file_uploads()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Deletar registros de uploads marcados como deletados há mais de 30 dias
    DELETE FROM public.file_uploads 
    WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log da limpeza
    INSERT INTO public.audit_logs (action, details, metadata)
    VALUES (
        'FILE_UPLOADS_CLEANUP',
        'Limpeza automática de uploads antigos',
        jsonb_build_object('deleted_count', deleted_count)
    );
    
    RETURN deleted_count;
END;
$$;

-- Função para estatísticas de uploads por usuário
CREATE OR REPLACE FUNCTION public.get_user_upload_stats(target_user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stats JSONB;
BEGIN
    -- Verificar se o usuário pode acessar as estatísticas
    IF target_user_id != auth.uid() AND NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Acesso negado às estatísticas';
    END IF;
    
    SELECT jsonb_build_object(
        'total_uploads', COUNT(*),
        'active_uploads', COUNT(*) FILTER (WHERE deleted_at IS NULL),
        'total_size_bytes', COALESCE(SUM(file_size) FILTER (WHERE deleted_at IS NULL), 0),
        'uploads_by_bucket', jsonb_object_agg(
            bucket, 
            COUNT(*) FILTER (WHERE deleted_at IS NULL)
        ),
        'uploads_last_30_days', COUNT(*) FILTER (
            WHERE uploaded_at > NOW() - INTERVAL '30 days' 
            AND deleted_at IS NULL
        ),
        'validation_failures', COUNT(*) FILTER (WHERE NOT validation_passed)
    ) INTO stats
    FROM public.file_uploads
    WHERE user_id = target_user_id;
    
    RETURN stats;
END;
$$;

-- Trigger para log de auditoria em mudanças
CREATE OR REPLACE FUNCTION public.log_file_upload_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Log para inserções
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (action, user_id, details, metadata)
        VALUES (
            'FILE_UPLOAD_CREATED',
            NEW.user_id,
            'Novo upload de arquivo registrado',
            jsonb_build_object(
                'file_id', NEW.id,
                'original_name', NEW.original_name,
                'file_type', NEW.file_type,
                'file_size', NEW.file_size,
                'bucket', NEW.bucket
            )
        );
        RETURN NEW;
    END IF;
    
    -- Log para soft deletes
    IF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        INSERT INTO public.audit_logs (action, user_id, details, metadata)
        VALUES (
            'FILE_UPLOAD_DELETED',
            NEW.user_id,
            'Upload de arquivo marcado como deletado',
            jsonb_build_object(
                'file_id', NEW.id,
                'original_name', NEW.original_name,
                'deleted_at', NEW.deleted_at
            )
        );
        RETURN NEW;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Criar trigger
CREATE TRIGGER file_uploads_audit_trigger
    AFTER INSERT OR UPDATE ON public.file_uploads
    FOR EACH ROW
    EXECUTE FUNCTION public.log_file_upload_changes();

-- Comentários para documentação
COMMENT ON TABLE public.file_uploads IS 'Tabela de auditoria para todos os uploads de arquivos';
COMMENT ON COLUMN public.file_uploads.original_name IS 'Nome original do arquivo enviado pelo usuário';
COMMENT ON COLUMN public.file_uploads.secure_name IS 'Nome seguro gerado para armazenamento';
COMMENT ON COLUMN public.file_uploads.validation_passed IS 'Indica se o arquivo passou em todas as validações de segurança';
COMMENT ON COLUMN public.file_uploads.validation_warnings IS 'Avisos gerados durante a validação do arquivo';
COMMENT ON COLUMN public.file_uploads.deleted_at IS 'Timestamp do soft delete (NULL = ativo)';

-- Grants para usuários autenticados
GRANT SELECT, INSERT, UPDATE ON public.file_uploads TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_file_upload(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_upload_stats(UUID) TO authenticated;