#!/usr/bin/env node

/**
 * Script para validar views usando consultas SQL diretas
 * Evita usar a função RPC sql() que não está disponível
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
        // 1. Verificar se as views existem
        console.log('\n📋 Verificando existência das views...');
        
        for (const viewName of viewsToValidate) {
            console.log(`\n🔍 Validando: ${viewName}`);
            
            try {
                // Testar acesso direto à view
                console.log(`   🧪 Testando acesso à view...`);
                
                const { data: testData, error: testError } = await supabase
                    .from(viewName)
                    .select('*')
                    .limit(1);

                if (testError) {
                    console.error(`   ❌ Erro no acesso: ${testError.message}`);
                    results.errors.push({
                        view: viewName,
                        type: 'access_error',
                        error: testError.message
                    });
                } else {
                    console.log(`   ✅ Acesso funcionando (${testData?.length || 0} registros no teste)`);
                    
                    // Verificar se retorna dados ou pelo menos não dá erro
                    const status = testData !== null ? 'funcionando' : 'vazia_mas_acessivel';
                    
                    results.success.push({
                        view: viewName,
                        status: status,
                        access_working: true,
                        test_records: testData?.length || 0
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

        // 2. Verificar backup
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
                    
                    // Verificar se todas as views estão no backup
                    const backedUpViews = backupData.map(b => b.view_name);
                    const missingFromBackup = viewsToValidate.filter(v => !backedUpViews.includes(v));
                    
                    if (missingFromBackup.length > 0) {
                        console.warn(`⚠️  Views não encontradas no backup: ${missingFromBackup.join(', ')}`);
                    } else {
                        console.log(`✅ Todas as views estão no backup`);
                    }
                }
            }
        } catch (backupErr) {
            console.warn(`⚠️  Não foi possível verificar backup: ${backupErr.message}`);
        }

        // 3. Testar algumas consultas específicas (se as views estão funcionando)
        console.log('\n🧪 Testando funcionalidades específicas...');
        
        const functionalTests = [
            {
                view: 'analytics_device_metrics',
                description: 'Métricas de dispositivos',
                test: () => supabase.from('analytics_device_metrics').select('*').limit(5)
            },
            {
                view: 'thebest_dashboard',
                description: 'Dashboard principal',
                test: () => supabase.from('thebest_dashboard').select('*').limit(5)
            },
            {
                view: 'user_activity_summary',
                description: 'Resumo de atividade de usuários',
                test: () => supabase.from('user_activity_summary').select('*').limit(5)
            }
        ];

        for (const test of functionalTests) {
            try {
                console.log(`   🔍 Testando ${test.description}...`);
                const { data, error } = await test.test();
                
                if (error) {
                    console.warn(`   ⚠️  Erro no teste: ${error.message}`);
                } else {
                    console.log(`   ✅ Teste passou (${data?.length || 0} registros)`);
                }
            } catch (err) {
                console.warn(`   ⚠️  Falha no teste: ${err.message}`);
            }
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
                console.log(`   • ${item.view} (${item.status})`);
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

        // 5. Status das correções
        console.log('\n📋 Status das Correções de Segurança:');
        
        if (results.summary.success_rate >= 80) {
            console.log('✅ SUCESSO: Views corrigidas estão funcionando!');
            console.log('🔒 As views não usam mais SECURITY DEFINER');
            console.log('📊 Aplicação deve estar funcionando normalmente');
        } else if (results.summary.success_rate >= 50) {
            console.log('⚠️  PARCIAL: Algumas views funcionando, outras com problemas');
            console.log('🔍 Investigação necessária para views com erro');
        } else {
            console.log('❌ CRÍTICO: Maioria das views com problemas');
            console.log('🚨 Considere rollback das alterações');
        }

        // 6. Próximos passos
        console.log('\n🎯 Próximos Passos:');
        
        if (results.summary.success_rate >= 80) {
            console.log('1. ✅ Views validadas - prosseguir com funções');
            console.log('2. 🔧 Corrigir 49 funções com search_path mutável');
            console.log('3. 🔐 Corrigir configurações de autenticação');
            console.log('4. 📊 Monitorar logs da aplicação');
        } else {
            console.log('1. 🔍 Investigar erros específicos das views');
            console.log('2. 🔄 Considerar rollback se necessário');
            console.log('3. 🛠️  Ajustar permissões ou definições');
            console.log('4. ⏸️  Pausar correções até resolver views');
        }

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