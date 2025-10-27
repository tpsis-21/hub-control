// @/components/ui/undo-snackbar.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  AlertTriangle,
  Trash2,
  Undo2,
  X,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UndoAction {
  id: string;
  type: 'delete' | 'update' | 'archive' | 'custom';
  title: string;
  description?: string;
  onUndo: () => Promise<void> | void;
  onConfirm?: () => Promise<void> | void;
  duration?: number; // em segundos, padrão 5
  variant?: 'default' | 'destructive' | 'warning';
  icon?: React.ReactNode;
}

interface UndoSnackbarProps {
  action: UndoAction | null;
  onClose: () => void;
  className?: string;
}

function getActionIcon(type: UndoAction['type'], customIcon?: React.ReactNode) {
  if (customIcon) return customIcon;
  
  switch (type) {
    case 'delete':
      return <Trash2 className="h-4 w-4" />;
    case 'update':
      return <CheckCircle className="h-4 w-4" />;
    case 'archive':
      return <AlertTriangle className="h-4 w-4" />;
    default:
      return <CheckCircle className="h-4 w-4" />;
  }
}

function getVariantStyles(variant: UndoAction['variant'] = 'default') {
  switch (variant) {
    case 'destructive':
      return {
        card: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950',
        icon: 'text-red-600 dark:text-red-400',
        progress: 'bg-red-600'
      };
    case 'warning':
      return {
        card: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950',
        icon: 'text-yellow-600 dark:text-yellow-400',
        progress: 'bg-yellow-600'
      };
    default:
      return {
        card: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
        icon: 'text-green-600 dark:text-green-400',
        progress: 'bg-green-600'
      };
  }
}

export function UndoSnackbar({ action, onClose, className }: UndoSnackbarProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const duration = action?.duration || 5;

  useEffect(() => {
    if (!action) return;

    setTimeLeft(duration);
    setIsUndoing(false);
    setIsConfirming(false);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleConfirm();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [action, duration]);

  const handleUndo = useCallback(async () => {
    if (!action || isUndoing) return;

    setIsUndoing(true);
    try {
      await action.onUndo();
      onClose();
    } catch (error) {
      console.error('Erro ao desfazer ação:', error);
      setIsUndoing(false);
    }
  }, [action, isUndoing, onClose]);

  const handleConfirm = useCallback(async () => {
    if (!action || isConfirming) return;

    setIsConfirming(true);
    try {
      if (action.onConfirm) {
        await action.onConfirm();
      }
      onClose();
    } catch (error) {
      console.error('Erro ao confirmar ação:', error);
      setIsConfirming(false);
    }
  }, [action, isConfirming, onClose]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!action) return null;

  const styles = getVariantStyles(action.variant);
  const progressPercentage = (timeLeft / duration) * 100;

  return (
    <div className={cn(
      "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-2",
      className
    )}>
      <Card className={cn(
        "p-4 shadow-lg border-2 min-w-[400px] max-w-md",
        styles.card
      )}>
        <div className="flex items-start gap-3">
          {/* Ícone */}
          <div className={cn("flex-shrink-0 mt-0.5", styles.icon)}>
            {getActionIcon(action.type, action.icon)}
          </div>

          {/* Conteúdo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-medium text-foreground">
                {action.title}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-6 w-6 p-0 hover:bg-background/80"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {action.description && (
              <p className="text-xs text-muted-foreground mb-2">
                {action.description}
              </p>
            )}

            {/* Barra de progresso */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {Math.ceil(timeLeft)}s restantes
                </span>
              </div>
              <Progress 
                value={progressPercentage} 
                className="h-1"
                style={{
                  '--progress-background': styles.progress
                } as React.CSSProperties}
              />
            </div>

            {/* Botões de ação */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={isUndoing || isConfirming}
                className="flex-1 h-8"
              >
                {isUndoing ? (
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Desfazendo...
                  </div>
                ) : (
                  <>
                    <Undo2 className="h-3 w-3 mr-1" />
                    Desfazer
                  </>
                )}
              </Button>

              {action.onConfirm && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleConfirm}
                  disabled={isUndoing || isConfirming}
                  className="flex-1 h-8"
                >
                  {isConfirming ? (
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Confirmando...
                    </div>
                  ) : (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Confirmar
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Hook para gerenciar ações de undo
export function useUndoSnackbar() {
  const [currentAction, setCurrentAction] = useState<UndoAction | null>(null);

  const showUndo = useCallback((action: Omit<UndoAction, 'id'>) => {
    const undoAction: UndoAction = {
      ...action,
      id: `undo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setCurrentAction(undoAction);
  }, []);

  const hideUndo = useCallback(() => {
    setCurrentAction(null);
  }, []);

  const UndoSnackbarComponent = useCallback(() => (
    <UndoSnackbar 
      action={currentAction} 
      onClose={hideUndo}
    />
  ), [currentAction, hideUndo]);

  return {
    showUndo,
    hideUndo,
    UndoSnackbar: UndoSnackbarComponent,
    currentAction
  };
}

// Funções utilitárias para ações comuns
export const undoActions = {
  deleteClient: (clientName: string, onUndo: () => void, onConfirm?: () => void) => ({
    type: 'delete' as const,
    title: `Cliente "${clientName}" excluído`,
    description: 'A exclusão será permanente após o tempo limite.',
    variant: 'destructive' as const,
    onUndo,
    onConfirm,
    duration: 5
  }),

  deleteServer: (serverName: string, onUndo: () => void, onConfirm?: () => void) => ({
    type: 'delete' as const,
    title: `Servidor "${serverName}" excluído`,
    description: 'A exclusão será permanente após o tempo limite.',
    variant: 'destructive' as const,
    onUndo,
    onConfirm,
    duration: 5
  }),

  archiveTest: (testName: string, onUndo: () => void, onConfirm?: () => void) => ({
    type: 'archive' as const,
    title: `Teste "${testName}" arquivado`,
    description: 'O teste foi movido para o arquivo.',
    variant: 'warning' as const,
    onUndo,
    onConfirm,
    duration: 5
  }),

  updateSettings: (onUndo: () => void) => ({
    type: 'update' as const,
    title: 'Configurações atualizadas',
    description: 'As alterações foram salvas com sucesso.',
    variant: 'default' as const,
    onUndo,
    duration: 3
  })
};
