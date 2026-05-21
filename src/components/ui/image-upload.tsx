'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, X, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAvatarUpload, useImageUpload } from '@/hooks/use-secure-upload';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  type: 'avatar' | 'logo';
  className?: string;
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  type,
  className,
  disabled = false
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const onUploadSuccess = (result: { data?: { publicUrl?: string } }) => {
    if (result.data?.publicUrl) {
      onChange(result.data.publicUrl);
    }
  };

  const avatarUpload = useAvatarUpload({ onSuccess: onUploadSuccess, showToasts: true });
  const imageUpload = useImageUpload({ onSuccess: onUploadSuccess, showToasts: true });
  const { upload, isUploading, progress, validateFile, getMaxFileSize } =
    type === 'avatar' ? avatarUpload : imageUpload;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      console.log('🔄 [ImageUpload] Iniciando upload:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadType: type
      });
      
      // Upload usando o sistema seguro
      const result = await upload(file, 'image');
      
      console.log('📤 [ImageUpload] Resultado do upload:', {
        success: result?.success,
        publicUrl: result?.data?.publicUrl,
        uploadType: type
      });
      
      console.log('✅ [ImageUpload] Upload finalizado');
    } catch (error) {
      console.error('❌ [ImageUpload] Erro no upload (catch):', error);
    } finally {
      // Limpar o input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      console.log('🏁 [ImageUpload] Upload process finalizado');
    }
  };

  const handleRemove = () => {
    console.log('🗑️ [ImageUpload] Removendo imagem, chamando onRemove');
    if (onRemove) {
      onRemove();
    }
    console.log('🗑️ [ImageUpload] Remoção concluída');
  };

  if (type === 'avatar') {
    return (
      <div className={cn("flex flex-col items-center space-y-4", className)}>
        <div className="relative">
          <Avatar className="h-24 w-24">
            <AvatarImage src={value || undefined} alt="Avatar" />
            <AvatarFallback className="bg-hub-blue text-white text-xl font-semibold">
              <ImageIcon className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          {value && onRemove && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
              onClick={handleRemove}
              disabled={disabled || isUploading}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <div className="flex flex-col items-center space-y-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={disabled || isUploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? "Enviando..." : "Alterar Foto"}
          </Button>
          
          {/* Barra de progresso */}
          {isUploading && progress && (
            <div className="w-full space-y-1">
              <Progress value={progress.percentage} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                {progress.percentage}% - {Math.round(progress.loaded / 1024)}KB de {Math.round(progress.total / 1024)}KB
              </p>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground text-center">
            PNG, JPG até {getMaxFileSize('image')}
          </p>
        </div>
      </div>
    );
  }

  // Layout para logomarca
  return (
    <div className={cn("space-y-4", className)}>
      <Label>Logomarca da Empresa</Label>
      
      {value ? (
        <div className="relative inline-block">
          <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50">
            <img
              src={value || undefined}
              alt="Logomarca"
              className="w-full h-full object-contain"
            />
          </div>
          {onRemove && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
              onClick={handleRemove}
              disabled={disabled || isUploading}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ) : (
        <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Sem logomarca</p>
          </div>
        </div>
      )}
      
      <div className="flex flex-col space-y-2">
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="flex items-center gap-2 w-fit"
        >
          <Upload className="h-4 w-4" />
          {isUploading ? "Enviando..." : value ? "Alterar Logomarca" : "Adicionar Logomarca"}
        </Button>
        
        {/* Barra de progresso */}
        {isUploading && progress && (
          <div className="space-y-1">
            <Progress value={progress.percentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {progress.percentage}% - {Math.round(progress.loaded / 1024)}KB de {Math.round(progress.total / 1024)}KB
            </p>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground">
          PNG, JPG até {getMaxFileSize('image')}
        </p>
      </div>
    </div>
  );
}
