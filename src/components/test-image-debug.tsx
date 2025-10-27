'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAvatarUpload } from '@/hooks/use-secure-upload';

export function TestImageDebug() {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const { upload, isUploading, progress } = useAvatarUpload({
    onSuccess: (result) => {
      console.log('🎉 Upload bem-sucedido:', result);
      console.log('📊 Estrutura completa da resposta:', JSON.stringify(result, null, 2));
      setDebugInfo(result);
      
      if (result.data?.publicUrl) {
        console.log('📸 URL da imagem:', result.data.publicUrl);
        console.log('🔍 Testando URL da imagem...');
        
        // Testar se a URL é válida
        const testImage = new Image();
        testImage.onload = () => {
          console.log('✅ URL da imagem é válida e carregou com sucesso!');
          console.log('📏 Dimensões da imagem:', testImage.width, 'x', testImage.height);
        };
        testImage.onerror = (e) => {
          console.log('❌ Erro ao carregar imagem da URL:', e);
          console.log('🔗 URL que falhou:', result.data?.publicUrl);
        };
        testImage.src = result.data?.publicUrl || '';
        
        setImageUrl(result.data?.publicUrl || '');
      } else {
        console.log('❌ Nenhuma URL pública retornada');
        console.log('📋 Dados disponíveis:', Object.keys(result.data || {}));
      }
    },
    onError: (error, details) => {
      console.log('❌ Erro no upload:', error, details);
      console.log('📊 Detalhes do erro:', JSON.stringify(details, null, 2));
      setDebugInfo({ error, details });
    },
    showToasts: true
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📁 Arquivo selecionado:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    try {
      await upload(file, 'image');
    } catch (error) {
      console.error('💥 Erro durante upload:', error);
    }
  };

  return (
    <div className="p-6 border rounded-lg space-y-4">
      <h3 className="text-lg font-semibold">🔍 Debug de Upload de Imagem</h3>
      
      <div className="space-y-2">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={isUploading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        
        {isUploading && (
          <div className="space-y-2">
            <p className="text-blue-600">⏳ Fazendo upload...</p>
            {progress !== undefined && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}
            {progress !== undefined && progress !== null && (
              <p className="text-sm text-gray-600">{Math.round(progress.percentage)}% concluído</p>
            )}
          </div>
        )}
      </div>

      {imageUrl && (
        <div className="space-y-2">
          <p className="font-medium">🖼️ Imagem carregada:</p>
          <div className="border p-2 rounded">
            <img 
              src={imageUrl} 
              alt="Teste" 
              className="max-w-xs max-h-48 object-contain"
              onLoad={() => console.log('✅ Imagem renderizada com sucesso!')}
              onError={(e) => {
                console.log('❌ Erro ao carregar imagem:', e);
                console.log('🔗 URL que falhou:', imageUrl);
              }}
            />
          </div>
          <p className="text-sm text-gray-600 break-all">
            <strong>URL:</strong> {imageUrl}
          </p>
        </div>
      )}

      {debugInfo && (
        <div className="space-y-2">
          <p className="font-medium">🐛 Informações de Debug:</p>
          <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}

      <div className="text-sm text-gray-500">
        <p>💡 Abra o console do navegador para ver logs detalhados</p>
      </div>
    </div>
  );
}
