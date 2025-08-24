/**
 * Sistema de A/B Testing
 * 
 * Permite criar e gerenciar testes A/B para otimizar
 * a experiência do usuário através de experimentos controlados.
 */

import { useState, useEffect, useCallback } from 'react';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: ABVariant[];
  targetAudience: TargetAudience;
  metrics: ABMetric[];
  startDate: number;
  endDate?: number;
  trafficAllocation: number; // Porcentagem do tráfego (0-100)
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

interface ABVariant {
  id: string;
  name: string;
  description: string;
  weight: number; // Porcentagem do tráfego alocado (0-100)
  config: Record<string, any>; // Configurações específicas da variante
  isControl: boolean; // Se é a variante de controle
}

interface TargetAudience {
  segments: string[]; // Segmentos de usuário
  countries?: string[]; // Países específicos
  devices?: ('mobile' | 'tablet' | 'desktop')[]; // Tipos de dispositivo
  browsers?: string[]; // Navegadores específicos
  customRules?: CustomRule[]; // Regras personalizadas
}

interface CustomRule {
  field: string; // Campo a ser verificado
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  value: any; // Valor de comparação
}

interface ABMetric {
  id: string;
  name: string;
  type: 'conversion' | 'engagement' | 'revenue' | 'custom';
  description: string;
  goal: 'increase' | 'decrease'; // Objetivo do teste
  primaryMetric: boolean; // Se é a métrica principal
  eventName?: string; // Nome do evento a ser rastreado
  selector?: string; // Seletor CSS para elementos
  threshold?: number; // Valor mínimo para considerar sucesso
}

interface ABResult {
  testId: string;
  variantId: string;
  userId: string;
  sessionId: string;
  timestamp: number;
  metrics: Record<string, number>; // Valores das métricas
  context: ABContext;
}

interface ABContext {
  page: string;
  userAgent: string;
  device: 'mobile' | 'tablet' | 'desktop';
  country?: string;
  segment?: string;
  customData?: Record<string, any>;
}

interface ABAnalysis {
  testId: string;
  variants: VariantAnalysis[];
  winner?: string; // ID da variante vencedora
  confidence: number; // Nível de confiança estatística (0-100)
  significance: boolean; // Se o resultado é estatisticamente significativo
  sampleSize: number;
  conversionRates: Record<string, number>;
  recommendations: string[];
  generatedAt: number;
}

interface VariantAnalysis {
  variantId: string;
  name: string;
  participants: number;
  conversions: number;
  conversionRate: number;
  metrics: Record<string, {
    value: number;
    improvement: number; // Melhoria em relação ao controle (%)
    pValue: number; // Valor p estatístico
  }>;
}

// ============================================
// GERENCIADOR DE TESTES A/B
// ============================================

class ABTestManager {
  private tests: Map<string, ABTest> = new Map();
  private results: ABResult[] = [];
  private userAssignments: Map<string, Map<string, string>> = new Map(); // userId -> testId -> variantId
  private isEnabled: boolean = true;

  constructor() {
    this.loadFromStorage();
  }

  // Criar novo teste
  createTest(testData: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'>): ABTest {
    const test: ABTest = {
      id: this.generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...testData
    };

    // Validar configuração do teste
    this.validateTest(test);

    this.tests.set(test.id, test);
    this.saveToStorage();

    return test;
  }

  // Validar configuração do teste
  private validateTest(test: ABTest): void {
    // Verificar se há pelo menos 2 variantes
    if (test.variants.length < 2) {
      throw new Error('Teste deve ter pelo menos 2 variantes');
    }

    // Verificar se há exatamente uma variante de controle
    const controlVariants = test.variants.filter(v => v.isControl);
    if (controlVariants.length !== 1) {
      throw new Error('Teste deve ter exatamente uma variante de controle');
    }

    // Verificar se os pesos somam 100%
    const totalWeight = test.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error('Pesos das variantes devem somar 100%');
    }

    // Verificar se há pelo menos uma métrica primária
    const primaryMetrics = test.metrics.filter(m => m.primaryMetric);
    if (primaryMetrics.length === 0) {
      throw new Error('Teste deve ter pelo menos uma métrica primária');
    }
  }

  // Atualizar teste
  updateTest(testId: string, updates: Partial<ABTest>): ABTest {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Teste ${testId} não encontrado`);
    }

    const updatedTest = {
      ...test,
      ...updates,
      updatedAt: Date.now()
    };

    this.validateTest(updatedTest);
    this.tests.set(testId, updatedTest);
    this.saveToStorage();

    return updatedTest;
  }

  // Iniciar teste
  startTest(testId: string): void {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Teste ${testId} não encontrado`);
    }

    if (test.status !== 'draft' && test.status !== 'paused') {
      throw new Error('Apenas testes em rascunho ou pausados podem ser iniciados');
    }

    this.updateTest(testId, {
      status: 'running',
      startDate: Date.now()
    });
  }

  // Pausar teste
  pauseTest(testId: string): void {
    this.updateTest(testId, { status: 'paused' });
  }

  // Finalizar teste
  completeTest(testId: string): void {
    this.updateTest(testId, {
      status: 'completed',
      endDate: Date.now()
    });
  }

  // Verificar se usuário deve participar do teste
  shouldParticipate(testId: string, userId: string, context: ABContext): boolean {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running' || !this.isEnabled) {
      return false;
    }

    // Verificar alocação de tráfego
    const hash = this.hashString(`${userId}_${testId}`);
    const trafficThreshold = test.trafficAllocation / 100;
    if ((hash % 1000) / 1000 > trafficThreshold) {
      return false;
    }

    // Verificar critérios de audiência
    return this.matchesTargetAudience(test.targetAudience, context);
  }

  // Verificar se contexto corresponde à audiência alvo
  private matchesTargetAudience(audience: TargetAudience, context: ABContext): boolean {
    // Verificar dispositivos
    if (audience.devices && !audience.devices.includes(context.device)) {
      return false;
    }

    // Verificar países
    if (audience.countries && context.country && !audience.countries.includes(context.country)) {
      return false;
    }

    // Verificar segmentos
    if (audience.segments.length > 0 && context.segment && !audience.segments.includes(context.segment)) {
      return false;
    }

    // Verificar regras personalizadas
    if (audience.customRules) {
      for (const rule of audience.customRules) {
        if (!this.evaluateCustomRule(rule, context)) {
          return false;
        }
      }
    }

    return true;
  }

  // Avaliar regra personalizada
  private evaluateCustomRule(rule: CustomRule, context: ABContext): boolean {
    const fieldValue = this.getFieldValue(rule.field, context);
    
    switch (rule.operator) {
      case 'equals':
        return fieldValue === rule.value;
      case 'not_equals':
        return fieldValue !== rule.value;
      case 'contains':
        return String(fieldValue).includes(String(rule.value));
      case 'not_contains':
        return !String(fieldValue).includes(String(rule.value));
      case 'greater_than':
        return Number(fieldValue) > Number(rule.value);
      case 'less_than':
        return Number(fieldValue) < Number(rule.value);
      default:
        return false;
    }
  }

  // Obter valor do campo do contexto
  private getFieldValue(field: string, context: ABContext): any {
    const fields = field.split('.');
    let value: any = context;
    
    for (const f of fields) {
      value = value?.[f];
    }
    
    return value;
  }

  // Atribuir usuário a uma variante
  assignVariant(testId: string, userId: string, context: ABContext): string | null {
    if (!this.shouldParticipate(testId, userId, context)) {
      return null;
    }

    // Verificar se usuário já foi atribuído
    const userTests = this.userAssignments.get(userId);
    if (userTests?.has(testId)) {
      return userTests.get(testId)!;
    }

    const test = this.tests.get(testId)!;
    
    // Selecionar variante baseada nos pesos
    const variantId = this.selectVariantByWeight(test.variants, userId, testId);
    
    // Armazenar atribuição
    if (!this.userAssignments.has(userId)) {
      this.userAssignments.set(userId, new Map());
    }
    this.userAssignments.get(userId)!.set(testId, variantId);
    
    this.saveToStorage();
    return variantId;
  }

  // Selecionar variante baseada nos pesos
  private selectVariantByWeight(variants: ABVariant[], userId: string, testId: string): string {
    const hash = this.hashString(`${userId}_${testId}_variant`);
    const random = (hash % 1000) / 1000; // 0-1
    
    let cumulative = 0;
    for (const variant of variants) {
      cumulative += variant.weight / 100;
      if (random <= cumulative) {
        return variant.id;
      }
    }
    
    // Fallback para a primeira variante
    return variants[0].id;
  }

  // Registrar resultado
  recordResult(result: Omit<ABResult, 'timestamp'>): void {
    const fullResult: ABResult = {
      ...result,
      timestamp: Date.now()
    };
    
    this.results.push(fullResult);
    this.saveToStorage();
  }

  // Registrar conversão
  recordConversion(testId: string, variantId: string, userId: string, metricId: string, value: number = 1): void {
    this.recordResult({
      testId,
      variantId,
      userId,
      sessionId: this.getSessionId(),
      metrics: { [metricId]: value },
      context: this.getCurrentContext()
    });
  }

  // Analisar resultados do teste
  analyzeTest(testId: string): ABAnalysis {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Teste ${testId} não encontrado`);
    }

    const testResults = this.results.filter(r => r.testId === testId);
    const variants = this.analyzeVariants(test, testResults);
    
    // Encontrar variante de controle
    const controlVariant = test.variants.find(v => v.isControl)!;
    const controlAnalysis = variants.find(v => v.variantId === controlVariant.id)!;
    
    // Determinar vencedor
    const winner = this.determineWinner(variants, controlAnalysis);
    
    // Calcular confiança estatística
    const confidence = this.calculateConfidence(variants, controlAnalysis);
    
    return {
      testId,
      variants,
      winner: winner?.variantId,
      confidence,
      significance: confidence >= 95,
      sampleSize: testResults.length,
      conversionRates: variants.reduce((acc, v) => {
        acc[v.variantId] = v.conversionRate;
        return acc;
      }, {} as Record<string, number>),
      recommendations: this.generateRecommendations(test, variants, winner),
      generatedAt: Date.now()
    };
  }

  // Analisar variantes
  private analyzeVariants(test: ABTest, results: ABResult[]): VariantAnalysis[] {
    return test.variants.map(variant => {
      const variantResults = results.filter(r => r.variantId === variant.id);
      const participants = new Set(variantResults.map(r => r.userId)).size;
      
      // Calcular métricas
      const metrics: Record<string, { value: number; improvement: number; pValue: number }> = {};
      
      test.metrics.forEach(metric => {
        const metricResults = variantResults
          .map(r => r.metrics[metric.id] || 0)
          .filter(v => v > 0);
        
        const value = metricResults.length > 0 
          ? metricResults.reduce((sum, v) => sum + v, 0) / metricResults.length
          : 0;
        
        metrics[metric.id] = {
          value,
          improvement: 0, // Será calculado depois
          pValue: 0.5 // Simplificado
        };
      });
      
      const conversions = variantResults.filter(r => 
        test.metrics.some(m => m.primaryMetric && (r.metrics[m.id] || 0) > 0)
      ).length;
      
      return {
        variantId: variant.id,
        name: variant.name,
        participants,
        conversions,
        conversionRate: participants > 0 ? (conversions / participants) * 100 : 0,
        metrics
      };
    });
  }

  // Determinar vencedor
  private determineWinner(variants: VariantAnalysis[], control: VariantAnalysis): VariantAnalysis | null {
    let bestVariant = control;
    let bestImprovement = 0;
    
    variants.forEach(variant => {
      if (variant.variantId === control.variantId) return;
      
      const improvement = variant.conversionRate - control.conversionRate;
      if (improvement > bestImprovement && variant.participants >= 100) { // Mínimo de participantes
        bestVariant = variant;
        bestImprovement = improvement;
      }
    });
    
    return bestImprovement > 0 ? bestVariant : null;
  }

  // Calcular confiança estatística (simplificado)
  private calculateConfidence(variants: VariantAnalysis[], control: VariantAnalysis): number {
    // Implementação simplificada - em produção, usar teste estatístico apropriado
    const totalParticipants = variants.reduce((sum, v) => sum + v.participants, 0);
    
    if (totalParticipants < 1000) return 0;
    if (totalParticipants < 5000) return 75;
    if (totalParticipants < 10000) return 85;
    return 95;
  }

  // Gerar recomendações
  private generateRecommendations(test: ABTest, variants: VariantAnalysis[], winner: VariantAnalysis | null): string[] {
    const recommendations: string[] = [];
    
    if (!winner) {
      recommendations.push('Nenhuma variante mostrou melhoria significativa');
      recommendations.push('Considere executar o teste por mais tempo');
      recommendations.push('Revise as hipóteses e métricas do teste');
    } else {
      const improvement = winner.conversionRate - variants.find(v => v.variantId !== winner.variantId)!.conversionRate;
      recommendations.push(`Variante "${winner.name}" mostrou melhoria de ${improvement.toFixed(2)}%`);
      recommendations.push('Considere implementar esta variante para todos os usuários');
      recommendations.push('Monitore métricas de longo prazo após implementação');
    }
    
    // Verificar tamanho da amostra
    const totalParticipants = variants.reduce((sum, v) => sum + v.participants, 0);
    if (totalParticipants < 1000) {
      recommendations.push('Aumente o tamanho da amostra para resultados mais confiáveis');
    }
    
    return recommendations;
  }

  // Obter teste por ID
  getTest(testId: string): ABTest | undefined {
    return this.tests.get(testId);
  }

  // Listar todos os testes
  getAllTests(): ABTest[] {
    return Array.from(this.tests.values());
  }

  // Obter testes ativos
  getActiveTests(): ABTest[] {
    return this.getAllTests().filter(test => test.status === 'running');
  }

  // Obter variante atribuída ao usuário
  getUserVariant(testId: string, userId: string): string | null {
    return this.userAssignments.get(userId)?.get(testId) || null;
  }

  // Habilitar/desabilitar sistema
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // Utilitários
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private generateId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private getSessionId(): string {
    if (typeof window === 'undefined') return 'server';
    
    let sessionId = sessionStorage.getItem('ab_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      sessionStorage.setItem('ab_session_id', sessionId);
    }
    return sessionId;
  }

  private getCurrentContext(): ABContext {
    if (typeof window === 'undefined') {
      return {
        page: '/',
        userAgent: 'server',
        device: 'desktop'
      };
    }
    
    return {
      page: window.location.pathname,
      userAgent: navigator.userAgent,
      device: this.getDeviceType()
    };
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  // Persistência
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const data = {
        tests: Array.from(this.tests.entries()),
        results: this.results.slice(-10000), // Manter apenas os últimos 10k resultados
        assignments: Array.from(this.userAssignments.entries()).map(([userId, tests]) => [
          userId,
          Array.from(tests.entries())
        ])
      };
      
      localStorage.setItem('ab_testing_data', JSON.stringify(data));
    } catch (error) {
      console.warn('Erro ao salvar dados de A/B testing:', error);
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const data = localStorage.getItem('ab_testing_data');
      if (data) {
        const parsed = JSON.parse(data);
        
        this.tests = new Map(parsed.tests || []);
        this.results = parsed.results || [];
        this.userAssignments = new Map(
          (parsed.assignments || []).map(([userId, tests]: [string, [string, string][]]) => [
            userId,
            new Map(tests)
          ])
        );
      }
    } catch (error) {
      console.warn('Erro ao carregar dados de A/B testing:', error);
    }
  }
}

// ============================================
// HOOKS REACT
// ============================================

// Instância global do gerenciador
const abTestManager = new ABTestManager();

// Hook para usar A/B testing
export function useABTest(testId: string, userId: string) {
  const [variant, setVariant] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const context = {
      page: window.location.pathname,
      userAgent: navigator.userAgent,
      device: window.innerWidth < 768 ? 'mobile' as const : 
              window.innerWidth < 1024 ? 'tablet' as const : 'desktop' as const
    };
    
    const assignedVariant = abTestManager.assignVariant(testId, userId, context);
    setVariant(assignedVariant);
    setIsLoading(false);
  }, [testId, userId]);
  
  const recordConversion = useCallback((metricId: string, value: number = 1) => {
    if (variant) {
      abTestManager.recordConversion(testId, variant, userId, metricId, value);
    }
  }, [testId, variant, userId]);
  
  const recordCustomMetric = useCallback((metrics: Record<string, number>) => {
    if (variant) {
      abTestManager.recordResult({
        testId,
        variantId: variant,
        userId,
        sessionId: abTestManager['getSessionId'](),
        metrics,
        context: abTestManager['getCurrentContext']()
      });
    }
  }, [testId, variant, userId]);
  
  return {
    variant,
    isLoading,
    recordConversion,
    recordCustomMetric
  };
}

// Hook para gerenciar testes
export function useABTestManager() {
  const [tests, setTests] = useState<ABTest[]>([]);
  
  useEffect(() => {
    setTests(abTestManager.getAllTests());
  }, []);
  
  const createTest = useCallback((testData: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'>) => {
    const test = abTestManager.createTest(testData);
    setTests(abTestManager.getAllTests());
    return test;
  }, []);
  
  const updateTest = useCallback((testId: string, updates: Partial<ABTest>) => {
    const test = abTestManager.updateTest(testId, updates);
    setTests(abTestManager.getAllTests());
    return test;
  }, []);
  
  const startTest = useCallback((testId: string) => {
    abTestManager.startTest(testId);
    setTests(abTestManager.getAllTests());
  }, []);
  
  const pauseTest = useCallback((testId: string) => {
    abTestManager.pauseTest(testId);
    setTests(abTestManager.getAllTests());
  }, []);
  
  const completeTest = useCallback((testId: string) => {
    abTestManager.completeTest(testId);
    setTests(abTestManager.getAllTests());
  }, []);
  
  const analyzeTest = useCallback((testId: string) => {
    return abTestManager.analyzeTest(testId);
  }, []);
  
  return {
    tests,
    createTest,
    updateTest,
    startTest,
    pauseTest,
    completeTest,
    analyzeTest
  };
}

// ============================================
// NOTA: Componente React foi movido para:
// src/components/ab-testing/ab-test-component.tsx
// ============================================

// ============================================
// EXPORTAÇÕES
// ============================================

export { ABTestManager };
export type {
  ABTest,
  ABVariant,
  ABMetric,
  ABResult,
  ABAnalysis,
  TargetAudience
};