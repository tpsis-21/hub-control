"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { ErrorService, ErrorType } from "@/services/error.service";
import { LoggerService } from "@/services/logger.service";
import { reloadPage } from "@/utils/browser";
import { isDevelopment } from "@/lib/env-validation";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Atualiza o state para que a próxima renderização mostre a UI de fallback.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Atualiza o state com informações do erro
    this.setState({ errorInfo });

    // Log simples do erro no console
    console.error('ErrorBoundary caught error:', error.message, errorInfo);

    // Chama callback personalizado se fornecido
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Integração com Sentry ou outros serviços de monitoramento
    // Sentry.captureException(error, { extra: errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    reloadPage();
  };

  private getErrorMessage(): string {
    if (!this.state.error) return 'Erro desconhecido';
    
    const errorType = ErrorService.categorizeError(this.state.error);
    return ErrorService.getUserFriendlyMessage(errorType, this.state.error.message);
  }

  private getErrorDetails(): string {
    if (!this.state.error) return '';
    
    if (isDevelopment()) {
      return `${this.state.error.message}\n\nStack: ${this.state.error.stack}`;
    }
    
    return 'Detalhes técnicos foram registrados para análise.';
  }

  public render() {
    if (this.state.hasError && this.state.error) {
      // Usa fallback customizado se fornecido
      if (this.props.fallback && this.state.errorInfo) {
        return this.props.fallback(this.state.error, this.state.errorInfo);
      }

      // UI de fallback padrão
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
          <div className="mx-auto max-w-lg text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-destructive">
                Oops! Algo deu errado
              </h1>
              <p className="text-lg text-muted-foreground">
                {this.getErrorMessage()}
              </p>
            </div>
            
            {isDevelopment() && (
              <details className="text-left bg-muted p-4 rounded-lg">
                <summary className="cursor-pointer font-medium mb-2">
                  Detalhes técnicos (desenvolvimento)
                </summary>
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap overflow-auto">
                  {this.getErrorDetails()}
                </pre>
              </details>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="rounded-md bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Tentar novamente
              </button>
              <button
                onClick={this.handleReload}
                className="rounded-md border border-input bg-background px-6 py-2 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Recarregar página
              </button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Se o problema persistir, entre em contato com o suporte.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;