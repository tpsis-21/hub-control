'use client';

import { testDeletePermissions } from '../planos/actions';
import { logger } from '@/utils/production-logger'

export default function TestDeletePage() {
    const handleTest = async () => {
        logger.debug('Iniciando teste...');
        const result = await testDeletePermissions();
        logger.debug('Resultado do teste:', result);
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Teste de Permissões de Exclusão</h1>
            <button 
                onClick={handleTest}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
                Testar Permissões
            </button>
        </div>
    );
}
