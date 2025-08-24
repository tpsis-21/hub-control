import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';
import { isDevelopment } from '@/lib/env-validation';

// Mock do env-validation para poder testar desenvolvimento
jest.mock('@/lib/env-validation', () => ({
  isDevelopment: jest.fn()
}));

const mockedIsDevelopment = isDevelopment as jest.MockedFunction<typeof isDevelopment>;

// Componente que gera erro para teste
const ErrorThrowingComponent = () => {
  throw new Error('Erro de teste');
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Limpar mocks e console spies
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {}); 
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renderiza children quando não há erro', () => {
    const TestComponent = () => <div>Componente funcionando</div>;
    
    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Componente funcionando')).toBeInTheDocument();
  });

  it('renderiza fallback padrão quando há erro', () => {
    render(
      <ErrorBoundary>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Oops! Algo deu errado')).toBeInTheDocument();
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
    expect(screen.getByText('Recarregar página')).toBeInTheDocument();
  });

  it('chama callback onError quando fornecido', () => {
    const mockOnError = jest.fn();

    render(
      <ErrorBoundary onError={mockOnError}>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    expect(mockOnError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('exibe detalhes técnicos em modo desenvolvimento', () => {
    // Mock para simular ambiente de desenvolvimento
    mockedIsDevelopment.mockReturnValue(true);
    
    render(
      <ErrorBoundary>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Detalhes técnicos (desenvolvimento)')).toBeInTheDocument();
  });

  it('não exibe detalhes técnicos em modo produção', () => {
    // Mock para simular ambiente de produção
    mockedIsDevelopment.mockReturnValue(false);

    render(
      <ErrorBoundary>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Detalhes técnicos (desenvolvimento)')).not.toBeInTheDocument();
  });

  it('renderiza fallback customizado quando fornecido', () => {
    const customFallback = () => <div>Erro customizado</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ErrorThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Erro customizado')).toBeInTheDocument();
    expect(screen.queryByText('Oops! Algo deu errado')).not.toBeInTheDocument();
  });
});