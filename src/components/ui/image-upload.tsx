"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { createClientSupabaseClient } from "@/lib/supabase-client";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem.",
        variant: "destructive"
      });
      return;
    }

    // Validar tamanho do arquivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "O arquivo deve ter no máximo 5MB.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      const supabase = createClientSupabaseClient();
      const user = await supabase.auth.getUser();
      
      if (!user.data.user) {
        throw new Error('Usuário não autenticado');
      }

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.data.user.id}/${type}_${Date.now()}.${fileExt}`;

      // Upload para o Supabase Storage
      const { data, error } = await supabase.storage
        .from('profiles')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(data.path);

      onChange(publicUrl);
      
      toast({
        title: "Sucesso",
        description: `${type === 'avatar' ? 'Foto de perfil' : 'Logomarca'} enviada com sucesso!`
      });
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao fazer upload da imagem.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Limpar o input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!value || !onRemove) return;

    try {
      const supabase = createClientSupabaseClient();
      
      // Extrair o caminho do arquivo da URL
      const url = new URL(value);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const userId = pathParts[pathParts.length - 2];
      const filePath = `${userId}/${fileName}`;

      // Remover do storage
      await supabase.storage
        .from('profiles')
        .remove([filePath]);

      onRemove();
      
      toast({
        title: "Sucesso",
        description: `${type === 'avatar' ? 'Foto de perfil' : 'Logomarca'} removida com sucesso!`
      });
    } catch (error: any) {
      console.error('Erro ao remover imagem:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover a imagem.",
        variant: "destructive"
      });
    }
  };

  if (type === 'avatar') {
    return (
      <div className={cn("flex flex-col items-center space-y-4", className)}>
        <div className="relative">
          <Avatar className="h-24 w-24">
            <AvatarImage src={value || ""} alt="Avatar" />
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
              disabled={disabled || uploading}
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
            disabled={disabled || uploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Enviando..." : "Alterar Foto"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            PNG, JPG até 5MB
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
              src={value}
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
              disabled={disabled || uploading}
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
          disabled={disabled || uploading}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex items-center gap-2 w-fit"
        >
          <Upload className="h-4 w-4" />
          {uploading ? "Enviando..." : value ? "Alterar Logomarca" : "Adicionar Logomarca"}
        </Button>
        <p className="text-xs text-muted-foreground">
          PNG, JPG até 5MB
        </p>
      </div>
    </div>
  );
}