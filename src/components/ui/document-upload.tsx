// 🔒 Componente de Upload Seguro de Documentos
// Upload de documentos com validação completa e interface intuitiva

"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  X, 
  FileText, 
  File, 
  AlertCircle, 
  CheckCircle,
  Download,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocumentUpload } from "@/hooks/use-secure-upload";
import { formatFileSize } from "@/lib/file-validation";

interface DocumentUploadProps {
  value?: string[];
  onChange: (urls: string[]) => void;
  onRemove?: (index: number) => void;
  maxFiles?: number;
  allowedTypes?: ('pdf' | 'document' | 'spreadsheet' | 'presentation')[];
  className?: string;
  disabled?: boolean;
  label?: string;
  description?: string;
}

interface UploadedFile {
  url: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
}

export function DocumentUpload({
  value = [],
  onChange,
  onRemove,
  maxFiles = 5,
  allowedTypes = ['pdf', 'document'],
  className,
  disabled = false,
  label = "Documentos",
  description = "Faça upload de documentos importantes"
}: DocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { upload, isUploading, progress, validateFile, getMaxFileSize, getAllowedTypes } = useDocumentUpload({
    onSuccess: (result) => {
      if (result.data) {
        const newFile: UploadedFile = {
          url: result.data.publicUrl || result.data.path,
          name: result.data.fileName,
          size: result.data.fileSize,
          type: result.data.fileType,
          uploadedAt: new Date()
        };
        
        const updatedFiles = [...uploadedFiles, newFile];
        setUploadedFiles(updatedFiles);
        onChange(updatedFiles.map(f => f.url));
        setValidationErrors([]);
      }
    },
    onError: (error, details) => {
      setValidationErrors(details || [error]);
    },
    showToasts: true
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Verificar limite de arquivos
    if (uploadedFiles.length + files.length > maxFiles) {
      setValidationErrors([`Máximo de ${maxFiles} arquivos permitidos`]);
      return;
    }

    setValidationErrors([]);

    // Processar cada arquivo
    for (const file of files) {
      try {
        // Determinar tipo do arquivo baseado na extensão
        const fileType = getFileTypeFromExtension(file.name);
        
        if (!allowedTypes.includes(fileType)) {
          setValidationErrors(prev => [...prev, `Tipo de arquivo não permitido: ${file.name}`]);
          continue;
        }

        await upload(file, fileType);
      } catch (error) {
        console.error('Erro no upload:', error);
      }
    }

    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updatedFiles);
    onChange(updatedFiles.map(f => f.url));
    onRemove?.(index);
  };

  const getFileTypeFromExtension = (fileName: string): 'pdf' | 'document' | 'spreadsheet' | 'presentation' => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'pdf':
        return 'pdf';
      case 'xls':
      case 'xlsx':
      case 'csv':
        return 'spreadsheet';
      case 'ppt':
      case 'pptx':
        return 'presentation';
      default:
        return 'document';
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    if (type.includes('sheet') || type.includes('excel')) return <File className="h-4 w-4 text-green-500" />;
    if (type.includes('presentation') || type.includes('powerpoint')) return <File className="h-4 w-4 text-orange-500" />;
    return <File className="h-4 w-4 text-blue-500" />;
  };

  const getAcceptedFileTypes = () => {
    const typeMap = {
      pdf: '.pdf',
      document: '.doc,.docx,.txt,.rtf',
      spreadsheet: '.xls,.xlsx,.csv',
      presentation: '.ppt,.pptx'
    };
    
    return allowedTypes.map(type => typeMap[type]).join(',');
  };

  const getMaxFileSizeForTypes = () => {
    return Math.max(...allowedTypes.map(type => {
      try {
        return parseInt(getMaxFileSize(type).replace(/[^0-9]/g, ''));
      } catch {
        return 10; // Default 10MB
      }
    }));
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      {/* Área de Upload */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
        <Input
          ref={fileInputRef}
          type="file"
          accept={getAcceptedFileTypes()}
          onChange={handleFileSelect}
          disabled={disabled || isUploading || uploadedFiles.length >= maxFiles}
          className="hidden"
          multiple={maxFiles > 1}
        />
        
        <div className="space-y-3">
          <div className="flex justify-center">
            <Upload className="h-8 w-8 text-gray-400" />
          </div>
          
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading || uploadedFiles.length >= maxFiles}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {isUploading ? "Enviando..." : "Selecionar Arquivos"}
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              Tipos permitidos: {allowedTypes.map(type => {
                const typeNames = {
                  pdf: 'PDF',
                  document: 'DOC/DOCX',
                  spreadsheet: 'XLS/XLSX',
                  presentation: 'PPT/PPTX'
                };
                return typeNames[type];
              }).join(', ')}
            </p>
            <p>Tamanho máximo: {getMaxFileSizeForTypes()}MB por arquivo</p>
            <p>Máximo {maxFiles} arquivo(s) | {uploadedFiles.length} enviado(s)</p>
          </div>
        </div>
      </div>

      {/* Barra de Progresso */}
      {isUploading && progress && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Enviando arquivo...</span>
            <span>{progress.percentage}%</span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {Math.round(progress.loaded / 1024)}KB de {Math.round(progress.total / 1024)}KB
          </p>
        </div>
      )}

      {/* Erros de Validação */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Lista de Arquivos Enviados */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Arquivos Enviados</Label>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{file.uploadedAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Enviado
                  </Badge>
                  
                  {/* Botões de Ação */}
                  <div className="flex space-x-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(file.url, '_blank')}
                      className="h-8 w-8 p-0"
                      title="Visualizar"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = file.url;
                        link.download = file.name;
                        link.click();
                      }}
                      className="h-8 w-8 p-0"
                      title="Download"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(index)}
                      disabled={disabled}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      title="Remover"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}