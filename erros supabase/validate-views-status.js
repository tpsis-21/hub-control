#!/usr/bin/env node

/**
 * Script para validar o status das views após correções de segurança
 * Verifica se as views estão funcionando corretamente sem SECURITY DEFINER
 */

const { createClient } = require('@supabase/supabase-js');
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

// Lista das views que foram corrigidas
const viewsToValidate = [
    'analytics_device_metrics',
    'thebest_dashboard',
    'user_activity_summary',
    'analytics_daily_active_users',
    'analytics_popular_pages',
    'thebest_mapping_quality_analysis',
    'thebest_mapping_summary',
    'thebest_mapping_issues'
];

/**
 * Função principal de validação
 */
async function validateViews() {
    console.log('🔍 Iniciando validação das views corrigidas');
    console.log('📅 Data/Hora:', new Date().toLocaleString('pt-BR'));
    
    const results = {
        success: [],
        warnings: [],
        errors: [],
        summary: {}
    };

    try {
        // 1. Verificar definições das views
        console.log('\n📋 Verificando definições das views...');
        
        for (const viewName of viewsToValidate) {
            console.log(`\n🔍 Validando: ${viewName}`);
            
            try {
                // Verificar se a view existe e sua definição
                const { data: viewInfo, error: viewError } = await supabase.rpc('sql', {
                    query: `
                        SELECT 
                            schemaname,
                            viewname,
                            CASE 
                                WHEN definition ILIKE '%SECURITY DEFINER%' THEN 'AINDA_COM_DEFINER'
                                WHEN definition ILIKE '%SECURITY INVOKER%' THEN 'CORRIGIDA_INVOKER'
                                ELSE 'CORRIGIDA_PADRAO'
                            END as security_status,
                            LENGTH(definition) as definition_size
                        FROM pg_views 
                        WHERE schemaname = 'public' 
                        AND viewname = '${viewName}'
                    `
                });

                if (viewError) {
                    console.error(`   ❌ Erro ao verificar definição: ${viewError.message}`);
                    results.errors.push({
                        view: viewName,
                        type: 'definition_check',
                        error: viewError.message
                    });
                    continue;
                }

                if (!viewInfo || viewInfo.length === 0) {
                    console.warn(`   ⚠️  View não encontrada`);
                    results.warnings.push({
                        view: viewName,
                        type: 'not_found',
                        message: 'View não encontrada'
                    });
                    continue;
                }

                const view = viewInfo[0];
                const statusIcon = view.security_status === 'AINDA_COM_DEFINER' ? '❌' : '✅';
                console.log(`   ${statusIcon} Status: ${view.security_status}`);
                console.log(`   📏 Tamanho da definição: ${view.definition_size} caracteres`);

                // 2. Testar acesso à view (se possível)
                console.log(`   🧪 Testando acesso à view...`);
                
                try {
                    const { data: testData, error: testError } = await supabase
                        .from(viewName)
                        .select('*')
                        .limit(1);

                    if (testError) {
                        console.warn(`   ⚠️  Erro no teste de acesso: ${testError.message}`);
                        results.warnings.push({
                            view: viewName,
                            type: 'access_test',
                            error: testError.message
                        });
                    } else {
                        console.log(`   ✅ Acesso funcionando (${testData?.length || 0} registros no teste)`);
                        results.success.push({
                            view: viewName,
                            security_status: view.security_status,
                            access_working: true,
                            test_records: testData?.length || 0
                        });
                    }
                } catch (accessErr) {
                    console.warn(`   ⚠️  Não foi possível testar acesso: ${accessErr.message}`);
                    results.warnings.push({
                        view: viewName,
                        type: 'access_test_failed',
                        error: accessErr.message
                    });
                }

            } catch (err) {
                console.error(`   ❌ Erro geral na validação: ${err.message}`);
                results.errors.push({
                    view: viewName,
                    type: 'general_error',
                    error: err.message
                });
            }
        }

        // 3. Verificar backup
        console.log('\n📦 Verificando status do backup...');
        
        try {
            const { data: backupData, error: backupError } = await supabase
                .from('backup_views_security_definer')
                .select('*')
                .order('backup_date', { ascending: false });

            if (backupError) {
                console.warn(`⚠️  Erro ao verificar backup: ${backupError.message}`);
            } else {
                console.log(`✅ Backup disponível: ${backupData?.length || 0} views salvas`);
                
                if (backupData && backupData.length > 0) {
                    const latestBackup = backupData[0];
                    console.log(`📅 Último backup: ${new Date(latestBackup.backup_date).toLocaleString('pt-BR')}`);
                }
            }
        } catch (backupErr) {
            console.warn(`⚠️  Não foi possível verificar backup: ${backupErr.message}`);
        }

        // 4. Gerar relatório final
        console.log('\n📊 Relatório Final de Validação');
        console.log('═'.repeat(50));
        
        results.summary = {
            total_views: viewsToValidate.length,
            successful: results.success.length,
            warnings: results.warnings.length,
            errors: results.errors.length,
            success_rate: Math.round((results.success.length / viewsToValidate.length) * 100)
        };

        console.log(`📈 Views validadas: ${results.summary.total_views}`);
        console.log(`✅ Sucessos: ${results.summary.successful}`);
        console.log(`⚠️  Avisos: ${results.summary.warnings}`);
        console.log(`❌ Erros: ${results.summary.errors}`);
        console.log(`📊 Taxa de sucesso: ${results.summary.success_rate}%`);

        if (results.success.length > 0) {
            console.log('\n✅ Views funcionando corretamente:');
            results.success.forEach(item => {
                console.log(`   • ${item.view} (${item.security_status})`);
            });
        }

        if (results.warnings.length > 0) {
            console.log('\n⚠️  Avisos encontrados:');
            results.warnings.forEach(item => {
                console.log(`   • ${item.view}: ${item.type} - ${item.message || item.error}`);
            });
        }

        if (results.errors.length > 0) {
            console.log('\n❌ Erros encontrados:');
            results.errors.forEach(item => {
                console.log(`   • ${item.view}: ${item.type} - ${item.error}`);
            });
        }

        // 5. Recomendações
        console.log('\n💡 Recomendações:');
        
        if (results.summary.success_rate >= 80) {
            console.log('✅ Correções aplicadas com sucesso!');
            console.log('📋 Próximos passos sugeridos:');
            console.log('   1. Monitorar logs da aplicação por 24-48h');
            console.log('   2. Testar funcionalidades que usam essas views');
            console.log('   3. Prosseguir com correção das funções');
        } else {
            console.log('⚠️  Algumas views precisam de atenção');
            console.log('📋 Ações recomendadas:');
            console.log('   1. Investigar erros específicos');
            console.log('   2. Considerar rollback se necessário');
            console.log('   3. Ajustar permissões se aplicável');
        }

        console.log('\n🔄 Para rollback (se necessário):');
        console.log('SELECT restore_view_from_backup(\'public\', \'nome_da_view\');');

        return results;

    } catch (error) {
        console.error('\n❌ Erro durante validação:', error.message);
        throw error;
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    validateViews()
        .then(results => {
            const exitCode = results.summary.success_rate >= 80 ? 0 : 1;
            process.exit(exitCode);
        })
        .catch(error => {
            console.error('❌ Falha na validação:', error.message);
            process.exit(1);
        });
}

module.exports = { validateViews, viewsToValidate };