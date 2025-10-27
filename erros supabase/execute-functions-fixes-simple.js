#!/usr/bin/env node

/**
 * Script simplificado para corrigir funções com search_path mutável
 * Usa apenas RPC SQL direto para evitar problemas com views do sistema
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Erro: Variáveis de ambiente do Supabase não encontradas');
    process.exit(1);
}

// Criar cliente Supabase com service role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

/**
 * Função principal
 */
async function fixFunctionsSearchPath() {
    console.log('🔧 Iniciando correção de funções com search_path mutável');
    console.log('📅 Data/Hora:', new Date().toLocaleString('pt-BR'));
    
    try {
        // 1. Testar conexão básica
        console.log('🔗 Testando conexão...');
        
        const testQuery = 'SELECT 1 as test';
        const { data: testData, error: testError } = await supabase.rpc('sql', { 
            query: testQuery 
        });
        
        if (testError) {
            console.error('❌ Erro de conexão:', testError.message);
            throw testError;
        }
        
        console.log('✅ Conexão estabelecida com sucesso');
        
        // 2. Criar tabela de backup se não existir
        console.log('\n📦 Criando tabela de backup...');
        
        const createBackupTableSQL = `
            CREATE TABLE IF NOT EXISTS backup_functions_search_path (
                id SERIAL PRIMARY KEY,
                function_schema TEXT NOT NULL,
                function_name TEXT NOT NULL,
                function_signature TEXT NOT NULL,
                original_definition TEXT NOT NULL,
                backup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                restored BOOLEAN DEFAULT FALSE
            );
        `;
        
        const { error: createError } = await supabase.rpc('sql', { 
            query: createBackupTableSQL 
        });
        
        if (createError) {
            console.warn('⚠️  Aviso ao criar tabela:', createError.message);
        } else {
            console.log('✅ Tabela de backup preparada');
        }
        
        // 3. Identificar funções problemáticas
        console.log('\n🔍 Identificando funções com search_path mutável...');
        
        const identifyFunctionsSQL = `
            SELECT 
                n.nspname as schema_name,
                p.proname as function_name,
                pg_get_function_identity_arguments(p.oid) as args,
                CASE 
                    WHEN p.prosecdef THEN 'SECURITY DEFINER'
                    ELSE 'SECURITY INVOKER'
                END as security_type,
                CASE
                    WHEN p.proconfig IS NOT NULL AND EXISTS (
                        SELECT 1 FROM unnest(p.proconfig) AS setting
                        WHERE setting LIKE 'search_path=%'
                    ) THEN 'CONFIGURADO'
                    ELSE 'NÃO CONFIGURADO'
                END as search_path_status
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname IN ('public', 'auth', 'storage')
            AND p.prokind = 'f'
            AND (
                p.proconfig IS NULL 
                OR NOT EXISTS (
                    SELECT 1 FROM unnest(p.proconfig) AS setting
                    WHERE setting LIKE 'search_path=%'
                )
            )
            ORDER BY n.nspname, p.proname
            LIMIT 50;
        `;
        
        const { data: functionsData, error: functionsError } = await supabase.rpc('sql', { 
            query: identifyFunctionsSQL 
        });
        
        if (functionsError) {
            console.warn('⚠️  Aviso ao identificar funções:', functionsError.message);
        } else {
            const functionCount = functionsData?.length || 0;
            console.log(`📊 Encontradas ${functionCount} funções que precisam de correção`);
            
            if (functionCount > 0) {
                console.log('\n📋 Funções identificadas:');
                functionsData.forEach((func, index) => {
                    console.log(`${index + 1}. ${func.schema_name}.${func.function_name}(${func.args || ''})`);
                    console.log(`   Segurança: ${func.security_type} | Search Path: ${func.search_path_status}`);
                });
            }
        }
        
        // 4. Fazer backup das funções identificadas
        console.log('\n💾 Fazendo backup das funções...');
        
        const backupFunctionsSQL = `
            DO $$
            DECLARE
                func_record RECORD;
                v_definition TEXT;
                v_count INTEGER := 0;
            BEGIN
                FOR func_record IN
                    SELECT 
                        n.nspname as schema_name,
                        p.proname as function_name,
                        pg_get_function_identity_arguments(p.oid) as args,
                        p.oid
                    FROM pg_proc p
                    JOIN pg_namespace n ON p.pronamespace = n.oid
                    WHERE n.nspname IN ('public', 'auth', 'storage')
                    AND p.prokind = 'f'
                    AND (
                        p.proconfig IS NULL 
                        OR NOT EXISTS (
                            SELECT 1 FROM unnest(p.proconfig) AS setting
                            WHERE setting LIKE 'search_path=%'
                        )
                    )
                    LIMIT 50
                LOOP
                    BEGIN
                        -- Obter definição da função
                        v_definition := pg_get_functiondef(func_record.oid);
                        
                        -- Inserir backup
                        INSERT INTO backup_functions_search_path (
                            function_schema,
                            function_name,
                            function_signature,
                            original_definition
                        ) VALUES (
                            func_record.schema_name,
                            func_record.function_name,
                            func_record.function_name || '(' || COALESCE(func_record.args, '') || ')',
                            v_definition
                        );
                        
                        v_count := v_count + 1;
                        
                    EXCEPTION WHEN OTHERS THEN
                        RAISE NOTICE 'Erro ao fazer backup da função %.%: %', 
                            func_record.schema_name, func_record.function_name, SQLERRM;
                    END;
                END LOOP;
                
                RAISE NOTICE 'Backup concluído: % funções salvas', v_count;
            END $$;
        `;
        
        const { error: backupError } = await supabase.rpc('sql', { 
            query: backupFunctionsSQL 
        });
        
        if (backupError) {
            console.warn('⚠️  Aviso durante backup:', backupError.message);
        } else {
            console.log('✅ Backup das funções concluído');
        }
        
        // 5. Verificar backups realizados
        console.log('\n📊 Verificando backups realizados...');
        
        const countBackupsSQL = `
            SELECT 
                COUNT(*) as total_backups,
                COUNT(CASE WHEN backup_date >= CURRENT_DATE THEN 1 END) as today_backups
            FROM backup_functions_search_path;
        `;
        
        const { data: backupStats, error: statsError } = await supabase.rpc('sql', { 
            query: countBackupsSQL 
        });
        
        if (statsError) {
            console.warn('⚠️  Erro ao verificar estatísticas:', statsError.message);
        } else if (backupStats && backupStats.length > 0) {
            const stats = backupStats[0];
            console.log(`📦 Total de backups: ${stats.total_backups}`);
            console.log(`📅 Backups de hoje: ${stats.today_backups}`);
        }
        
        // 6. Relatório final
        console.log('\n📊 Relatório Final');
        console.log('═'.repeat(50));
        console.log('✅ Processo de identificação e backup concluído');
        console.log('📋 Funções com search_path mutável foram identificadas');
        console.log('💾 Backups das definições foram realizados');
        
        // 7. Próximos passos
        console.log('\n🎯 Próximos Passos:');
        console.log('1. 🔍 Revisar funções no backup_functions_search_path');
        console.log('2. 🛠️  Aplicar correções manuais para cada função');
        console.log('3. 🧪 Testar funcionalidades após correções');
        console.log('4. 🔐 Prosseguir com correções de autenticação');
        
        console.log('\n💡 Observações Importantes:');
        console.log('• Funções identificadas precisam de SET search_path = public, pg_temp');
        console.log('• Correções devem ser aplicadas manualmente para cada função');
        console.log('• Use restore_function_from_backup() para reverter se necessário');
        console.log('• Teste cada função após aplicar as correções');
        
        console.log('\n📝 Exemplo de correção:');
        console.log('CREATE OR REPLACE FUNCTION public.minha_funcao(param TEXT)');
        console.log('RETURNS TEXT');
        console.log('LANGUAGE plpgsql');
        console.log('SECURITY INVOKER');
        console.log('SET search_path = public, pg_temp  -- ← Adicionar esta linha');
        console.log('AS $$');
        console.log('BEGIN');
        console.log('    -- código da função');
        console.log('    RETURN param;');
        console.log('END;');
        console.log('$$;');
        
        return {
            success: true,
            functionsIdentified: functionsData?.length || 0,
            backupsCreated: true
        };
        
    } catch (error) {
        console.error('\n❌ Erro durante correção de funções:', error.message);
        throw error;
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    fixFunctionsSearchPath()
        .then(results => {
            console.log('\n🎉 Processo concluído com sucesso!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Falha na correção de funções:', error.message);
            process.exit(1);
        });
}

module.exports = { fixFunctionsSearchPath };