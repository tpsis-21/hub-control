/**
 * Script de Análise de Bundle
 * 
 * Analisa o bundle da aplicação para identificar:
 * - Dependências não utilizadas
 * - Oportunidades de tree shaking
 * - Tamanho de chunks
 * - Duplicações de código
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================
// CONFIGURAÇÕES
// ============================================

const CONFIG = {
  outputDir: '.next',
  reportDir: 'reports',
  thresholds: {
    chunkSize: 250 * 1024, // 250KB
    totalSize: 2 * 1024 * 1024, // 2MB
    unusedThreshold: 0.1 // 10%
  }
};

// ============================================
// ANÁLISE DE DEPENDÊNCIAS
// ============================================

class BundleAnalyzer {
  constructor() {
    this.packageJson = require('../package.json');
    this.dependencies = {
      ...this.packageJson.dependencies,
      ...this.packageJson.devDependencies
    };
    this.report = {
      timestamp: new Date().toISOString(),
      analysis: {},
      recommendations: [],
      metrics: {}
    };
  }

  // Analisar uso de dependências
  analyzeDependencyUsage() {
    console.log('🔍 Analisando uso de dependências...');
    
    const srcDir = path.join(__dirname, '../src');
    const usedDependencies = new Set();
    const unusedDependencies = [];
    
    // Buscar imports em todos os arquivos
    const files = this.getAllFiles(srcDir, ['.ts', '.tsx', '.js', '.jsx']);
    
    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // Buscar imports
      const importMatches = content.match(/import.*from\s+['"]([^'"]+)['"]/g) || [];
      const requireMatches = content.match(/require\(['"]([^'"]+)['"]\)/g) || [];
      
      [...importMatches, ...requireMatches].forEach(match => {
        const dep = match.match(/['"]([^'"]+)['"]/)?.[1];
        if (dep && !dep.startsWith('.') && !dep.startsWith('/')) {
          const rootDep = dep.split('/')[0];
          if (rootDep.startsWith('@')) {
            usedDependencies.add(`${rootDep}/${dep.split('/')[1]}`);
          } else {
            usedDependencies.add(rootDep);
          }
        }
      });
    });
    
    // Identificar dependências não utilizadas
    Object.keys(this.dependencies).forEach(dep => {
      if (!usedDependencies.has(dep)) {
        unusedDependencies.push(dep);
      }
    });
    
    this.report.analysis.dependencies = {
      total: Object.keys(this.dependencies).length,
      used: usedDependencies.size,
      unused: unusedDependencies,
      unusedCount: unusedDependencies.length,
      usageRate: (usedDependencies.size / Object.keys(this.dependencies).length * 100).toFixed(2)
    };
    
    // Recomendações para dependências não utilizadas
    if (unusedDependencies.length > 0) {
      this.report.recommendations.push({
        type: 'unused-dependencies',
        priority: 'medium',
        title: 'Remover dependências não utilizadas',
        description: `${unusedDependencies.length} dependências não estão sendo utilizadas`,
        action: `npm uninstall ${unusedDependencies.join(' ')}`,
        impact: 'Redução do tamanho do bundle e tempo de instalação',
        dependencies: unusedDependencies
      });
    }
  }

  // Analisar tamanho de chunks
  analyzeChunkSizes() {
    console.log('📊 Analisando tamanho de chunks...');
    
    const buildManifest = path.join(__dirname, '../.next/build-manifest.json');
    
    if (!fs.existsSync(buildManifest)) {
      console.log('⚠️ Build manifest não encontrado. Execute "npm run build" primeiro.');
      return;
    }
    
    const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf8'));
    const chunks = [];
    
    // Analisar chunks estáticos
    if (manifest.pages) {
      Object.entries(manifest.pages).forEach(([page, files]) => {
        files.forEach(file => {
          const filePath = path.join(__dirname, '../.next', file);
          if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            chunks.push({
              page,
              file,
              size: stats.size,
              sizeKB: (stats.size / 1024).toFixed(2),
              isLarge: stats.size > CONFIG.thresholds.chunkSize
            });
          }
        });
      });
    }
    
    // Ordenar por tamanho
    chunks.sort((a, b) => b.size - a.size);
    
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const largeChunks = chunks.filter(chunk => chunk.isLarge);
    
    this.report.analysis.chunks = {
      total: chunks.length,
      totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      largeChunks: largeChunks.length,
      averageSize: chunks.length > 0 ? (totalSize / chunks.length).toFixed(2) : 0,
      chunks: chunks.slice(0, 10) // Top 10 maiores
    };
    
    // Recomendações para chunks grandes
    if (largeChunks.length > 0) {
      this.report.recommendations.push({
        type: 'large-chunks',
        priority: 'high',
        title: 'Otimizar chunks grandes',
        description: `${largeChunks.length} chunks excedem ${CONFIG.thresholds.chunkSize / 1024}KB`,
        action: 'Implementar code splitting adicional ou lazy loading',
        impact: 'Melhoria no tempo de carregamento inicial',
        chunks: largeChunks.slice(0, 5)
      });
    }
    
    if (totalSize > CONFIG.thresholds.totalSize) {
      this.report.recommendations.push({
        type: 'total-size',
        priority: 'high',
        title: 'Bundle total muito grande',
        description: `Tamanho total: ${(totalSize / (1024 * 1024)).toFixed(2)}MB`,
        action: 'Revisar dependências e implementar tree shaking',
        impact: 'Redução significativa no tempo de carregamento'
      });
    }
  }

  // Analisar oportunidades de tree shaking
  analyzeTreeShaking() {
    console.log('🌳 Analisando oportunidades de tree shaking...');
    
    const treeShakingOpportunities = [];
    
    // Verificar imports de bibliotecas grandes
    const largeLibraries = {
      'lodash': 'Use lodash-es ou imports específicos',
      'moment': 'Considere usar date-fns (já instalado)',
      'rxjs': 'Use imports específicos de rxjs/operators',
      'antd': 'Use imports específicos de componentes',
      '@mui/material': 'Use imports específicos de componentes',
      'react-icons': 'Use imports específicos de ícones'
    };
    
    const srcDir = path.join(__dirname, '../src');
    const files = this.getAllFiles(srcDir, ['.ts', '.tsx', '.js', '.jsx']);
    
    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      Object.entries(largeLibraries).forEach(([lib, suggestion]) => {
        const escapedLib = lib.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const fullImportRegex = new RegExp(`import\\s+\\*\\s+as\\s+\\w+\\s+from\\s+['"]${escapedLib}['"]`, 'g');
        const defaultImportRegex = new RegExp(`import\\s+\\w+\\s+from\\s+['"]${escapedLib}['"]`, 'g');
        
        if (fullImportRegex.test(content) || defaultImportRegex.test(content)) {
          treeShakingOpportunities.push({
            file: path.relative(process.cwd(), file),
            library: lib,
            suggestion,
            type: 'full-import'
          });
        }
      });
    });
    
    this.report.analysis.treeShaking = {
      opportunities: treeShakingOpportunities.length,
      details: treeShakingOpportunities
    };
    
    if (treeShakingOpportunities.length > 0) {
      this.report.recommendations.push({
        type: 'tree-shaking',
        priority: 'medium',
        title: 'Otimizar imports para tree shaking',
        description: `${treeShakingOpportunities.length} oportunidades de otimização encontradas`,
        action: 'Usar imports específicos em vez de imports completos',
        impact: 'Redução do tamanho do bundle',
        opportunities: treeShakingOpportunities
      });
    }
  }

  // Gerar métricas de performance
  generateMetrics() {
    console.log('📈 Gerando métricas de performance...');
    
    const { dependencies, chunks } = this.report.analysis;
    
    this.report.metrics = {
      bundleHealth: this.calculateBundleHealth(),
      optimizationScore: this.calculateOptimizationScore(),
      recommendations: this.report.recommendations.length,
      criticalIssues: this.report.recommendations.filter(r => r.priority === 'high').length
    };
  }

  // Calcular saúde do bundle
  calculateBundleHealth() {
    let score = 100;
    
    // Penalizar dependências não utilizadas
    const unusedRate = this.report.analysis.dependencies?.unusedCount || 0;
    score -= unusedRate * 2;
    
    // Penalizar chunks grandes
    const largeChunks = this.report.analysis.chunks?.largeChunks || 0;
    score -= largeChunks * 10;
    
    // Penalizar tamanho total
    const totalSizeMB = parseFloat(this.report.analysis.chunks?.totalSizeMB || 0);
    if (totalSizeMB > 2) score -= (totalSizeMB - 2) * 20;
    
    return Math.max(0, Math.min(100, score));
  }

  // Calcular score de otimização
  calculateOptimizationScore() {
    let score = 100;
    
    // Penalizar por cada recomendação
    this.report.recommendations.forEach(rec => {
      switch (rec.priority) {
        case 'high': score -= 20; break;
        case 'medium': score -= 10; break;
        case 'low': score -= 5; break;
      }
    });
    
    return Math.max(0, Math.min(100, score));
  }

  // Utilitário para buscar arquivos
  getAllFiles(dir, extensions) {
    const files = [];
    
    const scan = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scan(fullPath);
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      });
    };
    
    scan(dir);
    return files;
  }

  // Salvar relatório
  saveReport() {
    const reportDir = path.join(__dirname, '../', CONFIG.reportDir);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportPath = path.join(reportDir, `bundle-analysis-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
    
    console.log(`\n📄 Relatório salvo em: ${reportPath}`);
    return reportPath;
  }

  // Exibir resumo
  displaySummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA ANÁLISE DE BUNDLE');
    console.log('='.repeat(60));
    
    const { dependencies, chunks, treeShaking } = this.report.analysis;
    const { bundleHealth, optimizationScore, recommendations, criticalIssues } = this.report.metrics;
    
    console.log(`\n🔍 DEPENDÊNCIAS:`);
    console.log(`   Total: ${dependencies?.total || 0}`);
    console.log(`   Utilizadas: ${dependencies?.used || 0}`);
    console.log(`   Não utilizadas: ${dependencies?.unusedCount || 0}`);
    console.log(`   Taxa de uso: ${dependencies?.usageRate || 0}%`);
    
    console.log(`\n📦 CHUNKS:`);
    console.log(`   Total: ${chunks?.total || 0}`);
    console.log(`   Tamanho total: ${chunks?.totalSizeMB || 0}MB`);
    console.log(`   Chunks grandes: ${chunks?.largeChunks || 0}`);
    console.log(`   Tamanho médio: ${chunks?.averageSize || 0} bytes`);
    
    console.log(`\n🌳 TREE SHAKING:`);
    console.log(`   Oportunidades: ${treeShaking?.opportunities || 0}`);
    
    console.log(`\n📈 MÉTRICAS:`);
    console.log(`   Saúde do bundle: ${bundleHealth.toFixed(1)}/100`);
    console.log(`   Score de otimização: ${optimizationScore.toFixed(1)}/100`);
    console.log(`   Recomendações: ${recommendations}`);
    console.log(`   Problemas críticos: ${criticalIssues}`);
    
    if (this.report.recommendations.length > 0) {
      console.log(`\n🚀 PRINCIPAIS RECOMENDAÇÕES:`);
      this.report.recommendations.slice(0, 3).forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
        console.log(`      ${rec.description}`);
        console.log(`      Ação: ${rec.action}`);
        console.log('');
      });
    }
    
    console.log('='.repeat(60));
  }

  // Executar análise completa
  async run() {
    console.log('🚀 Iniciando análise de bundle...');
    
    try {
      this.analyzeDependencyUsage();
      this.analyzeChunkSizes();
      this.analyzeTreeShaking();
      this.generateMetrics();
      
      this.displaySummary();
      const reportPath = this.saveReport();
      
      console.log('\n✅ Análise concluída com sucesso!');
      return reportPath;
    } catch (error) {
      console.error('❌ Erro durante a análise:', error.message);
      throw error;
    }
  }
}

// ============================================
// EXECUÇÃO
// ============================================

if (require.main === module) {
  const analyzer = new BundleAnalyzer();
  analyzer.run().catch(console.error);
}

module.exports = BundleAnalyzer;