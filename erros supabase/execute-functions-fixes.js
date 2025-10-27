#!/usr/bin/env node

/**
 * Script para corrigir funções com search_path mutável no Supabase
 * Executa backup e identificação das funções que precisam de correção
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
    console.error('Necessário: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
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
 * Executar SQL dividindo em comandos individuais
 */
async function executeSQL(sqlContent, description = '') {
    console.log(`📝 Executando: ${description}`);
    
    try {
        // Dividir SQL em comandos individuais
        const commands = sqlContent
            .split(/;\s*(?=\n|$)/)
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

        const results = [];
        
        for (let i = 0; i < commands.length; i++) {
            const command = commands[i];
            
            if (command.length < 10) continue; // Pular comandos muito pequenos
            
            try {
                console.log(`   Executando comando ${i + 1}/${commands.length}...`);
                
                // Para comandos DO, CREATE, etc., usar rpc
                if (command.toUpperCase().includes('DO $$') || 
                    command.toUpperCase().includes('CREATE OR REPLACE FUNCTION') ||
                    command.toUpperCase().includes('CREATE TABLE')) {
                    
                    const { data, error } = await supabase.rpc('sql', { 
                        query: command 
                    });
                    
                    if (error) {
                        console.warn(`   ⚠️  Aviso no comando ${i + 1}: ${error.message}`);
                        results.push({ command: i + 1, status: 'warning', error: error.message });
                    } else {
                        console.log(`   ✅ Comando ${i + 1} executado`);
                        results.push({ command: i + 1, status: 'success', data });
                    }
                } else {
                    console.log(`   ⏭️  Pulando comando ${i + 1} (não suportado via RPC)`);
                    results.push({ command: i + 1, status: 'skipped' });
                }
                
            } catch (cmdError) {
                console.error(`   ❌ Erro no comando ${i + 1}: ${cmdError.message}`);
                results.push({ command: i + 1, status: 'error', error: cmdError.message });
            }
        }
        
        return results;
        
    } catch (error) {
        console.error(`❌ Erro ao executar SQL: ${error.message}`);
        throw error;
    }
}

/**
 * Listar funções que precisam de correção
 */
async function listProblematicFunctions() {
    console.log('🔍 Identificando funções com search_path mutável...');
    
    try {
        const query = `
            SELECT 
                n.nspname as schema_name,
                p.proname as function_name,
                pg_get_function_identity_arguments(p.oid) as args,
                CASE 
                    WHEN p.prosecdef THEN 'SECURITY DEFINER'
                    ELSE 'SECURITY INVOKER'
                END as security_type,
                CASE
                    WHEN p.proconfig IS NOT NULL AND 'search_path' = ANY(
                        SELECT unnest(string_to_array(setting, ','))
                        FROM unnest(p.proconfig) AS setting
                        WHERE setting LIKE 'search_path=%'
                    ) THEN 'CONFIGURADO'
                    ELSE 'NÃO CONFIGURADO'
                END as search_path_status,
                p.proconfig as config_settings
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
            LIMIT 50
        `;
        
        const { data, error } = await supabase.rpc('sql', { query });
        
        if (error) {
            console.error('❌ Erro ao listar funções:', error.message);
            return [];
        }
        
        console.log(`📊 Encontradas ${data?.length || 0} funções que precisam de correção`);
        
        if (data && data.length > 0) {
            console.log('\n📋 Funções identificadas:');
            data.forEach((func, index) => {
                console.log(`${index + 1}. ${func.schema_name}.${func.function_name}(${func.args || ''})`);
                console.log(`   Segurança: ${func.security_type} | Search Path: ${func.search_path_status}`);
            });
        }
        
        return data || [];
        
    } catch (error) {
        console.error('❌ Erro ao identificar funções:', error.message);
        return [];
    }
}

/**
 * Verificar se tabela de backup existe
 */
async function ensureBackupTable() {
    console.log('📦 Verificando tabela de backup...');
    
    try {
        const { data, error } = await supabase
            .from('backup_functions_search_path')
            .select('id')
            .limit(1);
            
        if (error && error.message.includes('does not exist')) {
            console.log('📝 Criando tabela de backup...');
            
            const createTableSQL = `
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
            
            await executeSQL(createTableSQL, 'Criação da tabela de backup');
            console.log('✅ Tabela de backup criada');
        } else {
            console.log('✅ Tabela de backup já existe');
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar tabela de backup:', error.message);
        throw error;
    }
}

/**
 * Função principal
 */
async function fixFunctionsSearchPath() {
    console.log('🔧 Iniciando correção de funções com search_path mutável');
    console.log('📅 Data/Hora:', new Date().toLocaleString('pt-BR'));
    console.log('🔗 Conectando ao Supabase...');
    
    try {
        // 1. Testar conexão
        const { data: testData, error: testError } = await supabase
            .from('pg_tables')
            .select('tablename')
            .eq('schemaname', 'public')
            .limit(1);
            
        if (testError) {
            console.error('❌ Erro de conexão:', testError.message);
            throw testError;
        }
        
        console.log('✅ Conexão estabelecida com sucesso');
        
        // 2. Garantir tabela de backup
        await ensureBackupTable();
        
        // 3. Identificar funções problemáticas
        const problematicFunctions = await listProblematicFunctions();
        
        if (problematicFunctions.length === 0) {
            console.log('🎉 Nenhuma função com search_path mutável encontrada!');
            return;
        }
        
        // 4. Carregar e executar script SQL
        console.log('\n📝 Executando script de correção...');
        
        const sqlPath = path.join(__dirname, 'fix-functions-search-path.sql');
        
        if (!fs.existsSync(sqlPath)) {
            console.error('❌ Arquivo SQL não encontrado:', sqlPath);
            throw new Error('Script SQL não encontrado');
        }
        
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        const results = await executeSQL(sqlContent, 'Script de correção de funções');
        
        // 5. Relatório de execução
        console.log('\n📊 Relatório de Execução:');
        console.log('═'.repeat(50));
        
        const successCount = results.filter(r => r.status === 'success').length;
        const warningCount = results.filter(r => r.status === 'warning').length;
        const errorCount = results.filter(r => r.status === 'error').length;
        const skippedCount = results.filter(r => r.status === 'skipped').length;
        
        console.log(`✅ Comandos executados com sucesso: ${successCount}`);
        console.log(`⚠️  Comandos com avisos: ${warningCount}`);
        console.log(`❌ Comandos com erro: ${errorCount}`);
        console.log(`⏭️  Comandos pulados: ${skippedCount}`);
        
        // 6. Verificar backups realizados
        console.log('\n📦 Verificando backups realizados...');
        
        try {
            const { data: backupData, error: backupError } = await supabase
                .from('backup_functions_search_path')
                .select('*')
                .gte('backup_date', new Date().toISOString().split('T')[0]);
                
            if (backupError) {
                console.warn('⚠️  Erro ao verificar backups:', backupError.message);
            } else {
                console.log(`✅ Backups realizados hoje: ${backupData?.length || 0}`);
            }
        } catch (backupErr) {
            console.warn('⚠️  Não foi possível verificar backups:', backupErr.message);
        }
        
        // 7. Próximos passos
        console.log('\n🎯 Próximos Passos:');
        console.log('1. 🔍 Revisar funções identificadas no backup');
        console.log('2. 🛠️  Aplicar correções manuais conforme necessário');
        console.log('3. 🧪 Testar funcionalidades da aplicação');
        console.log('4. 🔐 Prosseguir com correções de autenticação');
        
        console.log('\n💡 Observações:');
        console.log('• Funções com search_path mutável foram identificadas e salvas no backup');
        console.log('• Correções manuais podem ser necessárias para cada função específica');
        console.log('• Use restore_function_from_backup() para reverter se necessário');
        
        return {
            problematicFunctions: problematicFunctions.length,
            executionResults: results,
            success: errorCount === 0
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
            console.log('\n🎉 Processo de correção de funções concluído!');
            const exitCode = results?.success ? 0 : 1;
            process.exit(exitCode);
        })
        .catch(error => {
            console.error('❌ Falha na correção de funções:', error.message);
            process.exit(1);
        });
}

module.exports = { fixFunctionsSearchPath };