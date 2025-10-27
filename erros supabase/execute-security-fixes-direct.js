#!/usr/bin/env node

/**
 * Script simplificado para executar correções de segurança no Supabase
 * Executa SQL diretamente usando o client do Supabase
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
 * Função principal
 */
async function main() {
    console.log('🚀 Iniciando correções de segurança do Supabase');
    console.log('📅 Data/Hora:', new Date().toLocaleString('pt-BR'));
    
    try {
        // 1. Verificar conexão básica
        console.log('\n🔍 Verificando conexão com Supabase...');
        
        // Teste simples de conexão
        const { data: connectionTest, error: connectionError } = await supabase
            .from('backup_views_security_definer')
            .select('*')
            .limit(1);
            
        if (connectionError && !connectionError.message.includes('does not exist')) {
            throw new Error(`Falha na conexão: ${connectionError.message}`);
        }
        console.log('✅ Conexão com Supabase estabelecida');

        // 2. Executar backup das views (se ainda não foi feito)
        console.log('\n📦 Verificando se backup já foi realizado...');
        
        if (connectionError && connectionError.message.includes('does not exist')) {
            console.log('📦 Executando backup das views...');
            
            // Ler e executar script de backup
            const backupSQL = fs.readFileSync(path.join(__dirname, 'backup-views-security-definer.sql'), 'utf8');
            
            // Dividir em comandos menores para execução
            const commands = backupSQL.split(/;\s*$/gm).filter(cmd => cmd.trim().length > 0);
            
            for (let i = 0; i < commands.length; i++) {
                const command = commands[i].trim();
                if (!command || command.startsWith('--')) continue;
                
                console.log(`   📝 Executando comando ${i + 1}/${commands.length}`);
                
                try {
                    // Usar query direta para comandos DDL
                    const result = await supabase.rpc('sql', { query: command });
                    
                    if (result.error) {
                        console.warn(`   ⚠️  Aviso no comando ${i + 1}: ${result.error.message}`);
                    } else {
                        console.log(`   ✅ Comando ${i + 1} executado`);
                    }
                } catch (err) {
                    console.warn(`   ⚠️  Erro no comando ${i + 1}: ${err.message}`);
                }
            }
        } else {
            console.log('✅ Backup já foi realizado anteriormente');
        }

        // 3. Aplicar correções nas views
        console.log('\n🔧 Aplicando correções nas views...');
        
        const fixViewsSQL = fs.readFileSync(path.join(__dirname, 'fix-views-security-definer.sql'), 'utf8');
        const fixCommands = fixViewsSQL.split(/;\s*$/gm).filter(cmd => cmd.trim().length > 0);
        
        for (let i = 0; i < fixCommands.length; i++) {
            const command = fixCommands[i].trim();
            if (!command || command.startsWith('--')) continue;
            
            console.log(`   🔧 Executando correção ${i + 1}/${fixCommands.length}`);
            
            try {
                const result = await supabase.rpc('sql', { query: command });
                
                if (result.error) {
                    console.warn(`   ⚠️  Aviso na correção ${i + 1}: ${result.error.message}`);
                } else {
                    console.log(`   ✅ Correção ${i + 1} aplicada`);
                }
            } catch (err) {
                console.warn(`   ⚠️  Erro na correção ${i + 1}: ${err.message}`);
            }
        }

        // 4. Validar correções
        console.log('\n✅ Validando correções aplicadas...');
        
        try {
            const { data: remainingViews, error: validateError } = await supabase.rpc('sql', { 
                query: `
                    SELECT 
                        schemaname,
                        viewname,
                        CASE 
                            WHEN definition ILIKE '%SECURITY DEFINER%' THEN 'AINDA_COM_DEFINER'
                            ELSE 'CORRIGIDA'
                        END as status
                    FROM pg_views 
                    WHERE schemaname = 'public'
                    AND viewname IN (
                        'analytics_device_metrics',
                        'thebest_dashboard',
                        'user_activity_summary',
                        'analytics_daily_active_users',
                        'analytics_popular_pages',
                        'thebest_mapping_quality_analysis',
                        'thebest_mapping_summary',
                        'thebest_mapping_issues'
                    )
                    ORDER BY viewname
                `
            });
            
            if (validateError) {
                console.error('❌ Erro na validação:', validateError.message);
            } else if (remainingViews && remainingViews.length > 0) {
                console.log('📊 Status das views:');
                remainingViews.forEach(view => {
                    const status = view.status === 'CORRIGIDA' ? '✅' : '⚠️';
                    console.log(`   ${status} ${view.viewname}: ${view.status}`);
                });
                
                const pendingViews = remainingViews.filter(v => v.status === 'AINDA_COM_DEFINER');
                if (pendingViews.length > 0) {
                    console.warn(`⚠️  ${pendingViews.length} views ainda precisam de correção`);
                } else {
                    console.log('✅ Todas as views foram corrigidas com sucesso!');
                }
            }
        } catch (err) {
            console.warn('⚠️  Não foi possível validar completamente:', err.message);
        }

        // 5. Gerar relatório final
        console.log('\n📊 Relatório final:');
        
        try {
            const { data: backupCount } = await supabase
                .from('backup_views_security_definer')
                .select('*', { count: 'exact' });
                
            console.log(`📈 Total de backups realizados: ${backupCount?.length || 0}`);
        } catch (err) {
            console.warn('⚠️  Não foi possível gerar relatório completo:', err.message);
        }

        console.log('\n🎉 Processo de correção concluído!');
        console.log('\n📋 Próximos passos:');
        console.log('1. ✅ Testar funcionamento das views na aplicação');
        console.log('2. 📊 Monitorar logs por possíveis erros');
        console.log('3. 🔧 Aplicar correções nas funções com search_path mutável');
        console.log('4. 🔐 Configurar autenticação OTP e proteção de senhas');

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

module.exports = { main };