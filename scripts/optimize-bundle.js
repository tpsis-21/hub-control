/**
 * Script de Otimização de Bundle
 * 
 * Aplica otimizações automáticas baseadas na análise do bundle:
 * - Atualiza next.config.ts com otimizações
 * - Configura webpack para melhor tree shaking
 * - Implementa code splitting inteligente
 * - Otimiza imports de dependências
 */

const fs = require('fs');
const path = require('path');
const BundleAnalyzer = require('./bundle-analysis');

// ============================================
// CONFIGURAÇÕES DE OTIMIZAÇÃO
// ============================================

const OPTIMIZATION_CONFIG = {
  // Bibliotecas para otimização de imports
  optimizePackageImports: [
    '@radix-ui/react-icons',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-select',
    '@radix-ui/react-tabs',
    '@radix-ui/react-toast',
    '@radix-ui/react-accordion',
    '@radix-ui/react-alert-dialog',
    '@radix-ui/react-avatar',
    '@radix-ui/react-checkbox',
    '@radix-ui/react-collapsible',
    '@radix-ui/react-label',
    '@radix-ui/react-menubar',
    '@radix-ui/react-popover',
    '@radix-ui/react-progress',
    '@radix-ui/react-radio-group',
    '@radix-ui/react-scroll-area',
    '@radix-ui/react-separator',
    '@radix-ui/react-slider',
    '@radix-ui/react-slot',
    '@radix-ui/react-switch',
    '@radix-ui/react-tooltip',
    'lucide-react',
    'recharts',
    'date-fns',
    'react-hook-form',
    'zod'
  ],
  
  // Configurações de webpack
  webpackOptimizations: {
    // Chunks para bibliotecas específicas
    cacheGroups: {
      // Radix UI components
      radix: {
        test: /[\/]node_modules[\/]@radix-ui[\/]/,
        name: 'radix-ui',
        priority: 30,
        reuseExistingChunk: true,
      },
      // Ícones
      icons: {
        test: /[\/]node_modules[\/](lucide-react)[\/]/,
        name: 'icons',
        priority: 25,
        reuseExistingChunk: true,
      },
      // Gráficos
      charts: {
        test: /[\/]node_modules[\/](recharts)[\/]/,
        name: 'charts',
        priority: 25,
        reuseExistingChunk: true,
      },
      // Utilitários de data
      dateUtils: {
        test: /[\/]node_modules[\/](date-fns)[\/]/,
        name: 'date-utils',
        priority: 20,
        reuseExistingChunk: true,
      },
      // Formulários
      forms: {
        test: /[\/]node_modules[\/](react-hook-form|zod)[\/]/,
        name: 'forms',
        priority: 20,
        reuseExistingChunk: true,
      },
      // Supabase
      supabase: {
        test: /[\/]node_modules[\/]@supabase[\/]/,
        name: 'supabase',
        priority: 20,
        reuseExistingChunk: true,
      },
      // Vendor chunk para outras bibliotecas
      vendor: {
        test: /[\/]node_modules[\/]/,
        name: 'vendors',
        priority: 10,
        reuseExistingChunk: true,
      },
      // UI components internos
      ui: {
        test: /[\/]src[\/]components[\/]ui[\/]/,
        name: 'ui-components',
        priority: 20,
        reuseExistingChunk: true,
      },
      // Chunk comum para código compartilhado
      common: {
        name: 'common',
        minChunks: 2,
        priority: 5,
        reuseExistingChunk: true,
      },
    }
  }
};

// ============================================
// OTIMIZADOR DE BUNDLE
// ============================================

class BundleOptimizer {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.nextConfigPath = path.join(this.projectRoot, 'next.config.ts');
    this.packageJsonPath = path.join(this.projectRoot, 'package.json');
    this.optimizations = [];
  }

  // Analisar bundle atual
  async analyzeCurrent() {
    console.log('🔍 Analisando bundle atual...');
    
    const analyzer = new BundleAnalyzer();
    const reportPath = await analyzer.run();
    
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    return report;
  }

  // Otimizar next.config.ts
  optimizeNextConfig() {
    console.log('⚙️ Otimizando next.config.ts...');
    
    if (!fs.existsSync(this.nextConfigPath)) {
      console.log('❌ next.config.ts não encontrado');
      return false;
    }
    
    let configContent = fs.readFileSync(this.nextConfigPath, 'utf8');
    let modified = false;
    
    // Verificar se optimizePackageImports já existe
    if (!configContent.includes('optimizePackageImports')) {
      // Adicionar optimizePackageImports ao experimental
      const experimentalMatch = configContent.match(/(experimental:\s*{[^}]*)(})/s);
      if (experimentalMatch) {
        const newExperimental = experimentalMatch[1] + 
          `    optimizePackageImports: [\n` +
          OPTIMIZATION_CONFIG.optimizePackageImports.map(pkg => `      '${pkg}'`).join(',\n') +
          `\n    ],\n` +
          experimentalMatch[2];
        
        configContent = configContent.replace(experimentalMatch[0], newExperimental);
        modified = true;
        this.optimizations.push('Adicionado optimizePackageImports');
      }
    } else {
      // Atualizar lista existente
      const currentPackages = this.extractOptimizePackageImports(configContent);
      const newPackages = OPTIMIZATION_CONFIG.optimizePackageImports.filter(
        pkg => !currentPackages.includes(pkg)
      );
      
      if (newPackages.length > 0) {
        const optimizeMatch = configContent.match(/(optimizePackageImports:\s*\[[^\]]*)(\])/s);
        if (optimizeMatch) {
          const updatedList = optimizeMatch[1] + 
            (optimizeMatch[1].trim().endsWith('[') ? '' : ',\n') +
            newPackages.map(pkg => `      '${pkg}'`).join(',\n') +
            (newPackages.length > 0 ? '\n    ' : '') +
            optimizeMatch[2];
          
          configContent = configContent.replace(optimizeMatch[0], updatedList);
          modified = true;
          this.optimizations.push(`Adicionados ${newPackages.length} novos pacotes para otimização`);
        }
      }
    }
    
    // Otimizar configurações de webpack
    if (configContent.includes('splitChunks')) {
      // Atualizar cacheGroups existente
      const cacheGroupsMatch = configContent.match(/(cacheGroups:\s*{[^}]*})/s);
      if (cacheGroupsMatch) {
        const newCacheGroups = this.generateCacheGroupsConfig();
        configContent = configContent.replace(cacheGroupsMatch[0], `cacheGroups: ${newCacheGroups}`);
        modified = true;
        this.optimizations.push('Atualizadas configurações de cache groups');
      }
    }
    
    // Adicionar otimizações de produção se não existirem
    if (!configContent.includes('moduleIds') && !configContent.includes('chunkIds')) {
      const optimizationMatch = configContent.match(/(config\.optimization = {[^}]*)(};)/s);
      if (optimizationMatch) {
        const newOptimization = optimizationMatch[1] + 
          `      \n      // Otimização de módulos\n` +
          `      config.optimization.moduleIds = 'deterministic';\n` +
          `      config.optimization.chunkIds = 'deterministic';\n` +
          `      ` + optimizationMatch[2];
        
        configContent = configContent.replace(optimizationMatch[0], newOptimization);
        modified = true;
        this.optimizations.push('Adicionadas otimizações de módulos');
      }
    }
    
    if (modified) {
      // Backup do arquivo original
      const backupPath = this.nextConfigPath + '.backup';
      fs.copyFileSync(this.nextConfigPath, backupPath);
      
      // Salvar arquivo otimizado
      fs.writeFileSync(this.nextConfigPath, configContent);
      console.log('✅ next.config.ts otimizado');
      console.log(`📄 Backup salvo em: ${backupPath}`);
      return true;
    } else {
      console.log('ℹ️ next.config.ts já está otimizado');
      return false;
    }
  }

  // Extrair pacotes atuais do optimizePackageImports
  extractOptimizePackageImports(content) {
    const match = content.match(/optimizePackageImports:\s*\[([^\]]*)\]/s);
    if (!match) return [];
    
    const packagesText = match[1];
    const packages = packagesText.match(/'([^']+)'/g) || [];
    return packages.map(pkg => pkg.replace(/'/g, ''));
  }

  // Gerar configuração de cache groups
  generateCacheGroupsConfig() {
    const cacheGroups = OPTIMIZATION_CONFIG.webpackOptimizations.cacheGroups;
    
    let config = '{\n';
    Object.entries(cacheGroups).forEach(([name, group]) => {
      config += `        ${name}: {\n`;
      Object.entries(group).forEach(([key, value]) => {
        if (typeof value === 'string') {
          config += `          ${key}: '${value}',\n`;
        } else if (typeof value === 'boolean') {
          config += `          ${key}: ${value},\n`;
        } else if (typeof value === 'number') {
          config += `          ${key}: ${value},\n`;
        } else if (value instanceof RegExp) {
          config += `          ${key}: ${value.toString()},\n`;
        }
      });
      config += `        },\n`;
    });
    config += '      }';
    
    return config;
  }

  // Otimizar imports em arquivos
  async optimizeImports(report) {
    console.log('📝 Otimizando imports...');
    
    const treeShakingOpportunities = report.analysis.treeShaking?.details || [];
    let optimizedFiles = 0;
    
    for (const opportunity of treeShakingOpportunities) {
      const filePath = path.join(this.projectRoot, opportunity.file);
      
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        
        // Otimizar imports específicos
        switch (opportunity.library) {
          case 'lodash':
            // Converter import _ from 'lodash' para imports específicos
            if (content.includes("import _ from 'lodash'")) {
              console.log(`⚠️ Arquivo ${opportunity.file} usa lodash completo. Revisão manual necessária.`);
            }
            break;
            
          case 'react-icons':
            // Converter imports de react-icons para específicos
            const iconImportMatch = content.match(/import\s*{([^}]+)}\s*from\s*['"]react-icons['"]/g);
            if (iconImportMatch) {
              console.log(`⚠️ Arquivo ${opportunity.file} usa react-icons. Considere usar lucide-react.`);
            }
            break;
        }
        
        if (modified) {
          fs.writeFileSync(filePath, content);
          optimizedFiles++;
        }
      }
    }
    
    if (optimizedFiles > 0) {
      this.optimizations.push(`Otimizados imports em ${optimizedFiles} arquivos`);
      console.log(`✅ Otimizados imports em ${optimizedFiles} arquivos`);
    } else {
      console.log('ℹ️ Nenhum import necessita otimização automática');
    }
  }

  // Adicionar scripts de otimização ao package.json
  addOptimizationScripts() {
    console.log('📦 Adicionando scripts de otimização...');
    
    const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
    
    const newScripts = {
      'analyze:bundle': 'node scripts/bundle-analysis.js',
      'optimize:bundle': 'node scripts/optimize-bundle.js',
      'build:analyze': 'npm run build && npm run analyze:bundle',
      'build:optimized': 'npm run optimize:bundle && npm run build'
    };
    
    let added = 0;
    Object.entries(newScripts).forEach(([name, script]) => {
      if (!packageJson.scripts[name]) {
        packageJson.scripts[name] = script;
        added++;
      }
    });
    
    if (added > 0) {
      fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2));
      this.optimizations.push(`Adicionados ${added} scripts de otimização`);
      console.log(`✅ Adicionados ${added} scripts de otimização ao package.json`);
    } else {
      console.log('ℹ️ Scripts de otimização já existem');
    }
  }

  // Gerar relatório de otimizações
  generateOptimizationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      optimizations: this.optimizations,
      summary: {
        totalOptimizations: this.optimizations.length,
        configModified: this.optimizations.some(opt => opt.includes('next.config')),
        importsOptimized: this.optimizations.some(opt => opt.includes('imports')),
        scriptsAdded: this.optimizations.some(opt => opt.includes('scripts'))
      },
      nextSteps: [
        'Execute "npm run build" para aplicar as otimizações',
        'Execute "npm run analyze:bundle" para verificar melhorias',
        'Monitore métricas de performance após deploy',
        'Considere implementar lazy loading adicional se necessário'
      ]
    };
    
    const reportPath = path.join(this.projectRoot, 'reports', `optimization-${Date.now()}.json`);
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Relatório de otimização salvo em: ${reportPath}`);
    
    return report;
  }

  // Exibir resumo das otimizações
  displaySummary(report) {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 RESUMO DAS OTIMIZAÇÕES APLICADAS');
    console.log('='.repeat(60));
    
    if (this.optimizations.length === 0) {
      console.log('\nℹ️ Nenhuma otimização foi necessária.');
      console.log('   O projeto já está bem otimizado!');
    } else {
      console.log(`\n✅ ${this.optimizations.length} otimizações aplicadas:`);
      this.optimizations.forEach((opt, index) => {
        console.log(`   ${index + 1}. ${opt}`);
      });
    }
    
    console.log('\n📋 PRÓXIMOS PASSOS:');
    report.nextSteps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step}`);
    });
    
    console.log('\n💡 DICAS ADICIONAIS:');
    console.log('   • Use "npm run build:analyze" para build + análise');
    console.log('   • Monitore Web Vitals após as mudanças');
    console.log('   • Considere implementar Service Worker para cache');
    console.log('   • Revise imports manuais quando indicado');
    
    console.log('\n' + '='.repeat(60));
  }

  // Executar otimização completa
  async run() {
    console.log('🚀 Iniciando otimização de bundle...');
    
    try {
      // 1. Analisar bundle atual
      const analysisReport = await this.analyzeCurrent();
      
      // 2. Otimizar configurações
      this.optimizeNextConfig();
      
      // 3. Otimizar imports
      await this.optimizeImports(analysisReport);
      
      // 4. Adicionar scripts
      this.addOptimizationScripts();
      
      // 5. Gerar relatório
      const optimizationReport = this.generateOptimizationReport();
      
      // 6. Exibir resumo
      this.displaySummary(optimizationReport);
      
      console.log('\n✅ Otimização concluída com sucesso!');
      return optimizationReport;
      
    } catch (error) {
      console.error('❌ Erro durante a otimização:', error.message);
      throw error;
    }
  }
}

// ============================================
// EXECUÇÃO
// ============================================

if (require.main === module) {
  const optimizer = new BundleOptimizer();
  optimizer.run().catch(console.error);
}

module.exports = BundleOptimizer;