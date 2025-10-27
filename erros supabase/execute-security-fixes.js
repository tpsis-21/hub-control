#!/usr/bin/env node

/**
 * Script para executar correções de segurança no Supabase
 * Utiliza a SUPABASE_SERVICE_ROLE_KEY para conectar e aplicar as correções
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
    console.error('Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local');
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
 * Executa um script SQL no Supabase usando RPC
 */
async function executeSQL(sql, description) {
    console.log(`\n🔄 Executando: ${description}`);
    
    try {
        // Dividir o SQL em comandos individuais se necessário
        const commands = sql.split(';').filter(cmd => cmd.trim().length > 0);
        
        for (let i = 0; i < commands.length; i++) {
            const command = commands[i].trim();
            if (!command) continue;
            
            console.log(`   📝 Comando ${i + 1}/${commands.length}`);
            
            const { data, error } = await supabase.rpc('sql', { 
                query: command 
            });
            
            if (error) {
                console.error(`❌ Erro no comando ${i + 1}: ${error.message}`);
                return false;
            }
            
            if (data && data.length > 0) {
                console.log(`   ✅ Comando ${i + 1} executado - ${data.length} resultado(s)`);
            }
        }
        
        console.log(`✅ ${description} executado com sucesso`);
        return true;
        
    } catch (err) {
        console.error(`❌ Erro inesperado ao executar ${description}:`, err.message);
        return false;
    }
}

/**
 * Lê arquivo SQL
 */
function readSQLFile(filename) {
    const filePath = path.join(__dirname, filename);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado: ${filename}`);
    }
    return fs.readFileSync(filePath, 'utf8');
}

/**
 * Função principal
 */
async function main() {
    console.log('🚀 Iniciando correções de segurança do Supabase');
    console.log('📅 Data/Hora:', new Date().toLocaleString('pt-BR'));
    
    try {
        // 1. Verificar conexão
        console.log('\n🔍 Verificando conexão com Supabase...');
        const { data: testData, error: testError } = await supabase
            .from('pg_tables')
            .select('tablename')
            .eq('schemaname', 'public')
            .limit(1);
            
        if (testError) {
            throw new Error(`Falha na conexão: ${testError.message}`);
        }
        console.log('✅ Conexão com Supabase estabelecida');

        // 2. Executar backup das views (se ainda não foi feito)
        console.log('\n📦 Executando backup das views...');
        const backupSQL = readSQLFile('backup-views-security-definer.sql');
        await executeSQL(backupSQL, 'Backup das views com SECURITY DEFINER');

        // 3. Aplicar correções nas views
        console.log('\n🔧 Aplicando correções nas views...');
        const fixViewsSQL = readSQLFile('fix-views-security-definer.sql');
        await executeSQL(fixViewsSQL, 'Correção das views removendo SECURITY DEFINER');

        // 4. Validar correções
        console.log('\n✅ Validando correções aplicadas...');
        const validateSQL = `
            SELECT 
                schemaname,
                viewname,
                definition
            FROM pg_views 
            WHERE definition ILIKE '%SECURITY DEFINER%'
            AND schemaname = 'public'
        `;
        
        const { data: remainingViews, error: validateError } = await supabase.rpc('sql', { 
            query: validateSQL 
        });
        
        if (validateError) {
            console.error('❌ Erro na validação:', validateError.message);
        } else if (remainingViews && remainingViews.length > 0) {
            console.warn('⚠️  Ainda existem views com SECURITY DEFINER:', remainingViews);
        } else {
            console.log('✅ Todas as views foram corrigidas com sucesso!');
        }

        // 5. Gerar relatório final
        console.log('\n📊 Gerando relatório final...');
        const reportSQL = `
            SELECT 
                'Views corrigidas' as tipo,
                COUNT(*) as quantidade
            FROM backup_views_security_definer
            WHERE backup_date >= NOW() - INTERVAL '1 hour'
        `;
        
        const { data: report } = await supabase.rpc('sql', { query: reportSQL });
        if (report) {
            console.log('📈 Relatório:', report);
        }

        console.log('\n🎉 Correções de segurança concluídas com sucesso!');
        console.log('\n📋 Próximos passos:');
        console.log('1. Testar funcionamento das views na aplicação');
        console.log('2. Monitorar logs por possíveis erros');
        console.log('3. Aplicar correções nas funções com search_path mutável');
        console.log('4. Configurar autenticação OTP e proteção de senhas');

    } catch (error) {
        console.error('\n❌ Erro durante execução:', error.message);
        console.error('\n🔄 Para reverter alterações, execute:');
        console.error('SELECT restore_view_from_backup(\'public\', \'nome_da_view\');');
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { executeSQL, readSQLFile };