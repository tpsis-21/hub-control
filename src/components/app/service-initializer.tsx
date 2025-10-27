// @/components/app/service-initializer.tsx
"use client";

import { useEffect } from 'react';
import { logger } from '@/utils/production-logger'

/**
 * Componente responsável por inicializar serviços seguros no lado cliente
 * Serviços que dependem do Node.js são inicializados via API routes
 */
export function ServiceInitializer() {
  useEffect(() => {
    const initializeClientServices = async () => {
      try {
        logger.debug('🚀 Inicializando cliente...', undefined, "DEBUG");
        
        // Chamar API para inicializar serviços do servidor
        const response = await fetch('/api/initialize-services', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('🚀 Cliente inicializado com sucesso');
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar cliente:', error);
        // Não bloquear a aplicação se a inicialização falhar
      }
    };

    initializeClientServices();
  }, []);

  // Este componente não renderiza nada visível
  return null;
}
