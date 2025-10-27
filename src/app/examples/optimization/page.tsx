/**
 * Página de Exemplo - Sistema de Otimização
 * 
 * Esta página demonstra como usar o sistema completo de otimização
 * e analytics em uma aplicação real.
 */

'use client';

import React from 'react';
import OptimizationIntegrationExample from '@/examples/optimization-integration-example';
import { OptimizationNavigationBar, OptimizationSequentialNavigation } from '@/components/optimization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Github, BookOpen, Zap } from 'lucide-react';
import Link from 'next/link';

export default function OptimizationExamplePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barra de navegação */}
      <OptimizationNavigationBar />
      
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Exemplo de Integração
              </h1>
              <p className="mt-2 text-gray-600">
                Demonstração prática do sistema de otimização e analytics
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className="bg-green-100 text-green-800">
                Sistema Ativo
              </Badge>
              <Link href="/optimization">
                <Button variant="outline">
                  <Zap className="h-4 w-4 mr-2" />
                  Dashboard Completo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Informações sobre o exemplo */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Sobre Este Exemplo</span>
              </CardTitle>
              <CardDescription>
                Este exemplo demonstra como integrar e usar o sistema completo de otimização em uma aplicação React.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">🚀 Otimização Automática</h3>
                  <p className="text-xs text-gray-600">
                    Sistema que detecta e corrige problemas de performance automaticamente
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">📊 Analytics em Tempo Real</h3>
                  <p className="text-xs text-gray-600">
                    Coleta e análise de dados de comportamento do usuário
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">🧠 Análise Preditiva</h3>
                  <p className="text-xs text-gray-600">
                    Machine learning para prever problemas antes que aconteçam
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">⚙️ Configuração Flexível</h3>
                  <p className="text-xs text-gray-600">
                    Sistema adaptável a diferentes tipos de dispositivos e necessidades
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex items-center space-x-4">
                <Link href="/optimization">
                  <Button>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver Dashboard Completo
                  </Button>
                </Link>
                <Button variant="outline" asChild>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                    <Github className="h-4 w-4 mr-2" />
                    Código Fonte
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/README-optimization.md">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Documentação
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Exemplo interativo */}
        <OptimizationIntegrationExample />

        {/* Informações técnicas */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Informações Técnicas</CardTitle>
              <CardDescription>
                Detalhes sobre a implementação e uso do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Tecnologias Utilizadas</h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• React 18+ com hooks personalizados</li>
                    <li>• TypeScript para type safety</li>
                    <li>• Performance Observer API</li>
                    <li>• Intersection Observer API</li>
                    <li>• Web Workers para processamento</li>
                    <li>• Local Storage para persistência</li>
                    <li>• Machine Learning simples</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3">Métricas Coletadas</h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• FPS (Frames por segundo)</li>
                    <li>• Uso de memória e CPU</li>
                    <li>• Tempo de carregamento</li>
                    <li>• Interações do usuário</li>
                    <li>• Latência de rede</li>
                    <li>• Core Web Vitals</li>
                    <li>• Métricas customizadas</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Dica de Implementação</h4>
                <p className="text-sm text-blue-800">
                  Para usar este sistema em sua aplicação, copie os arquivos da pasta <code className="bg-blue-200 px-1 rounded">src/lib</code> 
                  e <code className="bg-blue-200 px-1 rounded">src/components</code>, configure as dependências necessárias e 
                  inicialize o sistema no seu layout principal. O sistema se adapta automaticamente às capacidades do dispositivo.
                </p>
              </div>
              
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">🚀 Performance</h4>
                <p className="text-sm text-green-800">
                  O sistema é otimizado para ter impacto mínimo na performance. Usa Web Workers para processamento pesado, 
                  debouncing para eventos frequentes e lazy loading para componentes. O overhead típico é menor que 1% do CPU.
                </p>
              </div>
              
              <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-2">🔒 Privacidade</h4>
                <p className="text-sm text-purple-800">
                  Todos os dados são processados localmente no navegador. Nenhuma informação pessoal é enviada para servidores externos. 
                  O sistema respeita a configuração "Do Not Track" e permite anonimização completa dos dados.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Navegação sequencial */}
        <OptimizationSequentialNavigation />
      </div>
    </div>
  );
}
