/**
 * Analisador de Bundle
 * 
 * Sistema para análise de tamanho de bundle, dependências,
 * code splitting e identificação de oportunidades de otimização.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { SecuritySeverity } from './security-monitoring';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface BundleChunk {
  id: string;
  name: string;
  size: number;
  gzipSize: number;
  modules: ModuleInfo[];
  isEntry: boolean;
  isAsync: boolean;
  parents: string[];
  children: string[];
}

interface ModuleInfo {
  id: string;
  name: string;
  size: number;
  chunks: string[];
  dependencies: string[];
  reasons: string[];
  isExternal: boolean;
  packageName?: string;
}

interface DependencyAnalysis {
  name: string;
  version: string;
  size: number;
  gzipSize: number;
  treeshakeable: boolean;
  sideEffects: boolean;
  usageCount: number;
  alternatives?: string[];
  recommendation?: 'keep' | 'replace' | 'remove' | 'optimize';
}

interface BundleAnalysisReport {
  totalSize: number;
  totalGzipSize: number;
  chunks: BundleChunk[];
  modules: ModuleInfo[];
  dependencies: DependencyAnalysis[];
  duplicates: ModuleInfo[];
  largestModules: ModuleInfo[];
  recommendations: OptimizationRecommendation[];
  metrics: BundleMetrics;
}

interface OptimizationRecommendation {
  type: 'code-split' | 'lazy-load' | 'tree-shake' | 'replace-dependency' | 'remove-unused';
  priority: SecuritySeverity;
  description: string;
  impact: {
    sizeReduction: number;
    performanceGain: number;
  };
  implementation: string;
}

interface BundleMetrics {
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  totalBlockingTime: number;
  cumulativeLayoutShift: number;
  bundleScore: number; // 0-100
}

// ============================================
// ANALISADOR DE BUNDLE
// ============================================

class BundleAnalyzer {
  private chunks: Map<string, BundleChunk> = new Map();
  private modules: Map<string, ModuleInfo> = new Map();
  private dependencies: Map<string, DependencyAnalysis> = new Map();

  // Analisar bundle a partir de stats do webpack
  async analyzeBundleStats(stats: any): Promise<BundleAnalysisReport> {
    this.parseChunks(stats.chunks);
    this.parseModules(stats.modules);
    await this.analyzeDependencies();
    
    const duplicates = this.findDuplicateModules();
    const largestModules = this.findLargestModules();
    const recommendations = this.generateRecommendations();
    const metrics = await this.calculateMetrics();

    return {
      totalSize: this.calculateTotalSize(),
      totalGzipSize: this.calculateTotalGzipSize(),
      chunks: Array.from(this.chunks.values()),
      modules: Array.from(this.modules.values()),
      dependencies: Array.from(this.dependencies.values()),
      duplicates,
      largestModules,
      recommendations,
      metrics
    };
  }

  // Analisar bundle em tempo real (desenvolvimento)
  async analyzeRuntimeBundle(): Promise<Partial<BundleAnalysisReport>> {
    if (typeof window === 'undefined') {
      throw new Error('Análise em tempo real só funciona no browser');
    }

    const performanceEntries = performance.getEntriesByType('navigation');
    const resourceEntries = performance.getEntriesByType('resource');
    
    const jsResources = resourceEntries.filter(entry => 
      entry.name.includes('.js') || entry.name.includes('.mjs')
    );

    const chunks = this.analyzeRuntimeChunks(jsResources);
    const metrics = this.calculateRuntimeMetrics(performanceEntries[0] as PerformanceNavigationTiming);
    const recommendations = this.generateRuntimeRecommendations(chunks, metrics);

    return {
      chunks,
      recommendations,
      metrics
    };
  }

  // Parsear chunks do webpack stats
  private parseChunks(chunksData: any[]): void {
    chunksData.forEach(chunkData => {
      const chunk: BundleChunk = {
        id: chunkData.id,
        name: chunkData.names?.[0] || `chunk-${chunkData.id}`,
        size: chunkData.size,
        gzipSize: this.estimateGzipSize(chunkData.size),
        modules: [],
        isEntry: chunkData.entry,
        isAsync: !chunkData.entry,
        parents: chunkData.parents || [],
        children: chunkData.children || []
      };
      
      this.chunks.set(chunk.id, chunk);
    });
  }

  // Parsear módulos do webpack stats
  private parseModules(modulesData: any[]): void {
    modulesData.forEach(moduleData => {
      const module: ModuleInfo = {
        id: moduleData.id,
        name: moduleData.name,
        size: moduleData.size,
        chunks: moduleData.chunks || [],
        dependencies: moduleData.dependencies || [],
        reasons: moduleData.reasons?.map((r: any) => r.moduleName) || [],
        isExternal: moduleData.name.includes('node_modules'),
        packageName: this.extractPackageName(moduleData.name)
      };
      
      this.modules.set(module.id, module);
      
      // Adicionar módulo aos chunks correspondentes
      module.chunks.forEach(chunkId => {
        const chunk = this.chunks.get(chunkId);
        if (chunk) {
          chunk.modules.push(module);
        }
      });
    });
  }

  // Analisar dependências
  private async analyzeDependencies(): Promise<void> {
    const packageMap = new Map<string, ModuleInfo[]>();
    
    // Agrupar módulos por package
    this.modules.forEach(module => {
      if (module.isExternal && module.packageName) {
        if (!packageMap.has(module.packageName)) {
          packageMap.set(module.packageName, []);
        }
        packageMap.get(module.packageName)!.push(module);
      }
    });

    // Analisar cada package
    for (const [packageName, modules] of packageMap) {
      const totalSize = modules.reduce((sum, mod) => sum + mod.size, 0);
      const usageCount = modules.length;
      
      const analysis: DependencyAnalysis = {
        name: packageName,
        version: await this.getPackageVersion(packageName),
        size: totalSize,
        gzipSize: this.estimateGzipSize(totalSize),
        treeshakeable: await this.isTreeshakeable(packageName),
        sideEffects: await this.hasSideEffects(packageName),
        usageCount,
        alternatives: await this.findAlternatives(packageName),
        recommendation: this.getRecommendation(packageName, totalSize, usageCount)
      };
      
      this.dependencies.set(packageName, analysis);
    }
  }

  // Encontrar módulos duplicados
  private findDuplicateModules(): ModuleInfo[] {
    const moduleNames = new Map<string, ModuleInfo[]>();
    
    this.modules.forEach(module => {
      const normalizedName = this.normalizeModuleName(module.name);
      if (!moduleNames.has(normalizedName)) {
        moduleNames.set(normalizedName, []);
      }
      moduleNames.get(normalizedName)!.push(module);
    });
    
    const duplicates: ModuleInfo[] = [];
    moduleNames.forEach(modules => {
      if (modules.length > 1) {
        duplicates.push(...modules);
      }
    });
    
    return duplicates;
  }

  // Encontrar maiores módulos
  private findLargestModules(limit: number = 10): ModuleInfo[] {
    return Array.from(this.modules.values())
      .sort((a, b) => b.size - a.size)
      .slice(0, limit);
  }

  // Gerar recomendações de otimização
  private generateRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Recomendações para chunks grandes
    this.chunks.forEach(chunk => {
      if (chunk.size > 500000 && chunk.isEntry) { // 500KB
        const estimatedSizeReduction = chunk.size * 0.4; // Estimativa de 40% de redução
        recommendations.push({
          type: 'code-split',
          priority: SecuritySeverity.HIGH,
          description: 'Dividir bundle em chunks menores para melhorar carregamento inicial',
          impact: {
            sizeReduction: estimatedSizeReduction,
            performanceGain: Math.min(estimatedSizeReduction * 0.3, 50)
          },
          implementation: 'Implementar code splitting usando dynamic imports'
        });
      }
    });

    // Recomendações para dependências grandes
    this.dependencies.forEach(dep => {
      if (dep.size > 100000 && dep.usageCount < 3) { // 100KB, pouco usado
        recommendations.push({
          type: 'replace-dependency',
          priority: SecuritySeverity.MEDIUM,
          description: `Considerar alternativa mais leve para ${dep.name}`,
          impact: {
            sizeReduction: dep.size * 0.5,
            performanceGain: 20
          },
          implementation: `Avaliar e migrar para ${dep.alternatives?.[0] || 'alternativa mais leve'}`
        });
      }
    });

    // Recomendações para módulos duplicados
    const duplicates = this.findDuplicateModules();
    if (duplicates.length > 0) {
      const totalDuplicateSize = duplicates.reduce((sum, mod) => sum + mod.size, 0);
      recommendations.push({
        type: 'remove-unused',
        priority: SecuritySeverity.MEDIUM,
        description: `Encontrados ${duplicates.length} módulos duplicados (${this.formatSize(totalDuplicateSize)}).`,
        impact: {
          sizeReduction: totalDuplicateSize * 0.5,
          performanceGain: 10
        },
        implementation: 'Configure webpack para otimizar chunks compartilhados ou remova importações duplicadas.'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder: Record<SecuritySeverity, number> = {
        [SecuritySeverity.LOW]: 1,
        [SecuritySeverity.MEDIUM]: 2,
        [SecuritySeverity.HIGH]: 3,
        [SecuritySeverity.CRITICAL]: 4
      };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Calcular métricas de performance
  private async calculateMetrics(): Promise<BundleMetrics> {
    // Em um ambiente real, essas métricas viriam de ferramentas como Lighthouse
    const totalSize = this.calculateTotalSize();
    const chunkCount = this.chunks.size;
    
    // Estimativas baseadas no tamanho do bundle
    const estimatedFCP = Math.min(3000, (totalSize / 1000) + 500);
    const estimatedLCP = estimatedFCP * 1.5;
    const estimatedTTI = estimatedLCP * 1.2;
    const estimatedTBT = Math.max(0, (totalSize / 10000) - 50);
    const estimatedCLS = Math.min(0.25, totalSize / 5000000);
    
    // Score baseado em métricas (0-100)
    const bundleScore = Math.max(0, 100 - (
      (estimatedFCP / 30) +
      (estimatedLCP / 40) +
      (estimatedTTI / 50) +
      (estimatedTBT / 5) +
      (estimatedCLS * 400)
    ));

    return {
      firstContentfulPaint: estimatedFCP,
      largestContentfulPaint: estimatedLCP,
      timeToInteractive: estimatedTTI,
      totalBlockingTime: estimatedTBT,
      cumulativeLayoutShift: estimatedCLS,
      bundleScore: Math.round(bundleScore)
    };
  }

  // Analisar chunks em tempo real
  private analyzeRuntimeChunks(resources: PerformanceEntry[]): BundleChunk[] {
    return resources.map((resource, index) => {
      const size = (resource as any).transferSize || 0;
      return {
        id: `runtime-${index}`,
        name: this.extractChunkName(resource.name),
        size,
        gzipSize: size, // Já comprimido
        modules: [],
        isEntry: resource.name.includes('main') || resource.name.includes('index'),
        isAsync: resource.name.includes('chunk'),
        parents: [],
        children: []
      };
    });
  }

  // Calcular métricas em tempo real
  private calculateRuntimeMetrics(navigation: PerformanceNavigationTiming): BundleMetrics {
    const fcp = this.getPerformanceMetric('first-contentful-paint') || 0;
    const lcp = this.getPerformanceMetric('largest-contentful-paint') || 0;
    
    return {
      firstContentfulPaint: fcp,
      largestContentfulPaint: lcp,
      // Alguns ambientes não expõem navigationStart diretamente; use performance.timeOrigin como fallback
      timeToInteractive: navigation.loadEventEnd - ((navigation as any).navigationStart ?? performance.timeOrigin),
      totalBlockingTime: 0, // Requer medição mais complexa
      cumulativeLayoutShift: 0, // Requer medição mais complexa
      bundleScore: this.calculateRuntimeScore(fcp, lcp, navigation)
    };
  }

  // Gerar recomendações em tempo real
  private generateRuntimeRecommendations(
    chunks: BundleChunk[], 
    metrics: BundleMetrics
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    if (metrics.firstContentfulPaint > 2500) {
      recommendations.push({
        type: 'lazy-load',
        priority: SecuritySeverity.HIGH,
        description: 'FCP está lento. Considere lazy loading para componentes não críticos.',
        impact: {
          sizeReduction: 0,
          performanceGain: 30
        },
        implementation: 'Implemente React.lazy() para componentes de rotas não críticas.'
      });
    }
    
    const largeChunks = chunks.filter(chunk => chunk.size > 300000);
    if (largeChunks.length > 0) {
      recommendations.push({
        type: 'code-split',
        priority: SecuritySeverity.MEDIUM,
        description: `${largeChunks.length} chunks grandes detectados.`,
        impact: {
          sizeReduction: largeChunks.reduce((sum, chunk) => sum + chunk.size * 0.2, 0),
          performanceGain: 20
        },
        implementation: 'Configure code splitting mais granular no Next.js.'
      });
    }
    
    return recommendations;
  }

  // ============================================
  // MÉTODOS AUXILIARES
  // ============================================

  private calculateTotalSize(): number {
    return Array.from(this.chunks.values()).reduce((sum, chunk) => sum + chunk.size, 0);
  }

  private calculateTotalGzipSize(): number {
    return Array.from(this.chunks.values()).reduce((sum, chunk) => sum + chunk.gzipSize, 0);
  }

  private estimateGzipSize(size: number): number {
    // Estimativa: gzip reduz ~70% para JS
    return Math.round(size * 0.3);
  }

  private extractPackageName(moduleName: string): string | undefined {
    const match = moduleName.match(/node_modules[\\/]([^\\/]+)/);
    return match ? match[1] : undefined;
  }

  private normalizeModuleName(name: string): string {
    return name.replace(/\?.*$/, '').replace(/\.js$/, '');
  }

  private extractChunkName(url: string): string {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename.split('?')[0].replace(/\.[^.]+$/, '');
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  private getPerformanceMetric(name: string): number {
    if (typeof window === 'undefined') return 0;
    
    const entries = performance.getEntriesByName(name);
    return entries.length > 0 ? entries[0].startTime : 0;
  }

  private calculateRuntimeScore(
    fcp: number, 
    lcp: number, 
    navigation: PerformanceNavigationTiming
  ): number {
    const fcpScore = Math.max(0, 100 - (fcp / 25));
    const lcpScore = Math.max(0, 100 - (lcp / 40));
    const navStart = (navigation as any).navigationStart ?? performance.timeOrigin;
    const loadScore = Math.max(0, 100 - ((navigation.loadEventEnd - navStart) / 50));
    
    return Math.round((fcpScore + lcpScore + loadScore) / 3);
  }

  // Métodos que requerem integração com APIs externas
  private async getPackageVersion(packageName: string): Promise<string> {
    // Em um ambiente real, consultaria package.json ou API do npm
    return 'unknown';
  }

  private async isTreeshakeable(packageName: string): Promise<boolean> {
    // Verificaria se o package suporta tree shaking
    const treeshakeablePackages = ['lodash-es', 'date-fns', 'ramda'];
    return treeshakeablePackages.includes(packageName);
  }

  private async hasSideEffects(packageName: string): Promise<boolean> {
    // Verificaria se o package tem side effects
    const sideEffectPackages = ['moment', 'core-js'];
    return sideEffectPackages.includes(packageName);
  }

  private async findAlternatives(packageName: string): Promise<string[]> {
    // Base de dados de alternativas
    const alternatives: Record<string, string[]> = {
      'moment': ['date-fns', 'dayjs'],
      'lodash': ['lodash-es', 'ramda'],
      'axios': ['fetch', 'ky'],
      'jquery': ['vanilla-js', 'cash-dom']
    };
    
    return alternatives[packageName] || [];
  }

  private getRecommendation(
    packageName: string, 
    size: number, 
    usageCount: number
  ): 'keep' | 'replace' | 'remove' | 'optimize' {
    if (size > 500000) return 'replace'; // > 500KB
    if (usageCount < 2 && size > 50000) return 'remove'; // Pouco usado e > 50KB
    if (size > 200000) return 'optimize'; // > 200KB
    return 'keep';
  }
}

// ============================================
// HOOKS E COMPONENTES REACT
// ============================================

// Hook para análise de bundle em tempo real
export function useBundleAnalysis() {
  const [analysis, setAnalysis] = useState<Partial<BundleAnalysisReport> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const analyzerRef = useRef(new BundleAnalyzer());

  const analyzeBundle = useCallback(async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await analyzerRef.current.analyzeRuntimeBundle();
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na análise');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    // Analisar automaticamente após carregamento
    if (typeof window !== 'undefined') {
      const timer = setTimeout(analyzeBundle, 2000);
      return () => clearTimeout(timer);
    }
  }, [analyzeBundle]);

  return {
    analysis,
    isAnalyzing,
    error,
    analyzeBundle
  };
}

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

// Analisar bundle do webpack stats
export async function analyzeBundleFromStats(statsPath: string): Promise<BundleAnalysisReport> {
  const analyzer = new BundleAnalyzer();
  
  try {
    const response = await fetch(statsPath);
    const stats = await response.json();
    return analyzer.analyzeBundleStats(stats);
  } catch (error) {
    throw new Error(`Erro ao carregar stats: ${error}`);
  }
}

// Gerar relatório de otimização
export function generateOptimizationReport(analysis: BundleAnalysisReport): string {
  const { totalSize, totalGzipSize, recommendations, metrics } = analysis;
  
  let report = `# Relatório de Análise de Bundle\n\n`;
  
  report += `## Resumo\n`;
  report += `- **Tamanho Total**: ${formatBytes(totalSize)}\n`;
  report += `- **Tamanho Comprimido**: ${formatBytes(totalGzipSize)}\n`;
  report += `- **Score de Performance**: ${metrics.bundleScore}/100\n\n`;
  
  report += `## Métricas de Performance\n`;
  report += `- **First Contentful Paint**: ${metrics.firstContentfulPaint}ms\n`;
  report += `- **Largest Contentful Paint**: ${metrics.largestContentfulPaint}ms\n`;
  report += `- **Time to Interactive**: ${metrics.timeToInteractive}ms\n\n`;
  
  report += `## Recomendações de Otimização\n`;
  recommendations.forEach((rec, index) => {
    report += `### ${index + 1}. ${rec.description}\n`;
    report += `- **Prioridade**: ${rec.priority}\n`;
    report += `- **Redução Estimada**: ${formatBytes(rec.impact.sizeReduction)}\n`;
    report += `- **Ganho de Performance**: ${rec.impact.performanceGain}%\n`;
    report += `- **Implementação**: ${rec.implementation}\n\n`;
  });
  
  return report;
}

// Formatar bytes
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// ============================================
// EXPORTAÇÕES
// ============================================

export { BundleAnalyzer };
export type {
  BundleAnalysisReport,
  OptimizationRecommendation,
  BundleMetrics,
  BundleChunk,
  ModuleInfo,
  DependencyAnalysis
};

export default BundleAnalyzer;