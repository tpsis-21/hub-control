// src/examples/app-initialization-example.tsx
"use client";

import React from 'react';
import { 
  useAppInitialization, 
  initializeForDevelopment, 
  initializeForProduction 
} from '@/lib/app-initialization';
import { LogLevel } from '@/services/logger.service';

/**
 * Exemplo de como usar o sistema de inicialização da aplicação
 */
export function AppInitializationExample() {
  const { 
    isInitialized, 
    isInitializing, 
    initializationResult, 
    restart, 
    metrics 
  } = useAppInitialization();

  // Função para reinicializar com configuração personalizada
  const handleCustomRestart = async () => {
    await restart({
      logging: {
        level: LogLevel.INFO,
        enableConsole: true,
        enableRemote: false
      },
      cache: {
        enabled: true,
        defaultTTL: 10 * 60 * 1000, // 10 minutos
        maxSize: 500
      },
      features: {
        enableAnalytics: true,
        enableNotifications: true,
        enableExperimentalFeatures: false
      }
    });
  };

  // Função para inicializar para produção
  const handleProductionInit = async () => {
    await initializeForProduction();
    window.location.reload(); // Recarregar para aplicar mudanças
  };

  // Função para inicializar para desenvolvimento
  const handleDevelopmentInit = async () => {
    await initializeForDevelopment();
    window.location.reload();
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Inicializando aplicação...</h2>
          <p className="text-gray-500 mt-2">Configurando serviços e verificando conectividade</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Falha na inicialização</h2>
          <p className="text-gray-500 mb-6">
            A aplicação não pôde ser inicializada corretamente. Verifique sua conexão e tente novamente.
          </p>
          
          {initializationResult && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-medium text-red-800 mb-2">Detalhes do erro:</h3>
              <ul className="text-sm text-red-700 space-y-1">
                {initializationResult.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
              
              {initializationResult.warnings.length > 0 && (
                <div className="mt-3">
                  <h4 className="font-medium text-orange-800 mb-1">Avisos:</h4>
                  <ul className="text-sm text-orange-700 space-y-1">
                    {initializationResult.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={() => restart()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tentar novamente
            </button>
            
            <button
              onClick={handleCustomRestart}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Reinicializar com configuração personalizada
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Sistema de Inicialização da Aplicação</h1>
      
      {/* Status da inicialização */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <div className="text-green-500 text-2xl mr-3">✅</div>
          <div>
            <h3 className="font-medium text-green-800">Aplicação inicializada com sucesso!</h3>
            <p className="text-green-700 text-sm mt-1">
              Todos os serviços foram configurados e estão funcionando corretamente.
            </p>
          </div>
        </div>
      </div>

      {/* Métricas de inicialização */}
      {initializationResult?.metrics && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-800 mb-3">Métricas de Inicialização</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-600 font-medium">Tempo total:</span>
              <div className="text-blue-800">{initializationResult.metrics.initializationTime}ms</div>
            </div>
            <div>
              <span className="text-blue-600 font-medium">Serviços:</span>
              <div className="text-blue-800">{initializationResult.metrics.servicesInitialized.length}</div>
            </div>
            <div>
              <span className="text-blue-600 font-medium">Erros:</span>
              <div className="text-blue-800">{initializationResult.errors.length}</div>
            </div>
            <div>
              <span className="text-blue-600 font-medium">Avisos:</span>
              <div className="text-blue-800">{initializationResult.warnings.length}</div>
            </div>
          </div>
          
          {initializationResult.metrics.servicesInitialized.length > 0 && (
            <div className="mt-3">
              <span className="text-blue-600 font-medium text-sm">Serviços inicializados:</span>
              <div className="text-blue-800 text-sm mt-1">
                {initializationResult.metrics.servicesInitialized.join(', ')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resultado detalhado */}
      {initializationResult && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-800 mb-3">Resultado da Inicialização</h3>
          
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-gray-700">Status:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                initializationResult.success 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {initializationResult.success ? 'Sucesso' : 'Falha'}
              </span>
            </div>
            
            <div>
              <span className="font-medium text-gray-700">Tempo de inicialização:</span>
              <span className="ml-2 text-gray-600">{initializationResult.metrics.initializationTime}ms</span>
            </div>
            
            {initializationResult?.metrics?.healthChecks && (
              <div>
                <span className="font-medium text-gray-700">Verificações de saúde:</span>
                <div className="ml-2 mt-1 space-y-1">
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      initializationResult.metrics.healthChecks.supabase ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    <span className="text-gray-600">Supabase: {initializationResult.metrics.healthChecks.supabase ? 'OK' : 'Falha'}</span>
                  </div>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      initializationResult.metrics.healthChecks.cache ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    <span className="text-gray-600">Cache: {initializationResult.metrics.healthChecks.cache ? 'OK' : 'Falha'}</span>
                  </div>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      initializationResult.metrics.healthChecks.config ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    <span className="text-gray-600">Configuração: {initializationResult.metrics.healthChecks.config ? 'OK' : 'Falha'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controles de reinicialização */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-800 mb-4">Controles de Inicialização</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => restart()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reinicializar
          </button>
          
          <button
            onClick={handleDevelopmentInit}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Modo Desenvolvimento
          </button>
          
          <button
            onClick={handleProductionInit}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Modo Produção
          </button>
        </div>
        
        <button
          onClick={handleCustomRestart}
          className="w-full mt-3 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Configuração Personalizada
        </button>
      </div>
    </div>
  );
}

/**
 * Componente wrapper que mostra o status de inicialização
 */
export function AppWithInitialization({ children }: { children: React.ReactNode }) {
  const { isInitialized, isInitializing } = useAppInitialization();

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Inicializando aplicação...</h2>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return <AppInitializationExample />;
  }

  return <>{children}</>;
}

export default AppInitializationExample;