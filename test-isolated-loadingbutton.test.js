import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock simples do Button
const Button = ({ children, disabled, className, ...props }) => (
  <button disabled={disabled} className={className} {...props}>
    {children}
  </button>
);

// Mock simples do Loader2
const Loader2 = ({ className, role, 'aria-label': ariaLabel, ...props }) => (
  <div
    className={className}
    role={role}
    aria-label={ariaLabel}
    data-testid="loader2"
    {...props}
  />
);

// Mock simples do cn
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Componente LoadingButton inline para teste isolado
const LoadingButton = React.forwardRef((
  { loading = false, loadingText, disabled = false, children, className, ...props },
  ref
) => {
  const isDisabled = loading || disabled;
  
  return (
    <Button
      ref={ref}
      disabled={isDisabled}
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 
            className="h-4 w-4 animate-spin" 
            role="status"
            aria-label="Carregando..."
          />
          {loadingText ? loadingText : children}
        </>
      ) : (
        children
      )}
    </Button>
  );
});

LoadingButton.displayName = "LoadingButton";

describe('Isolated LoadingButton Test', () => {
  test('should render normal button when loading=false', () => {
    const { container } = render(
      <LoadingButton loading={false}>Save</LoadingButton>
    );
    
    console.log('=== Isolated Test: loading=false ===');
    console.log('Container HTML:', container.innerHTML);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    
    const statusElement = screen.queryByRole('status');
    console.log('Status element found:', !!statusElement);
    expect(statusElement).toBeNull();
    
    const saveText = screen.getByText('Save');
    expect(saveText).toBeInTheDocument();
  });
  
  test('should render loading button when loading=true', () => {
    const { container } = render(
      <LoadingButton loading={true}>Save</LoadingButton>
    );
    
    console.log('=== Isolated Test: loading=true ===');
    console.log('Container HTML:', container.innerHTML);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
    
    const statusElement = screen.getByRole('status');
    expect(statusElement).toBeInTheDocument();
    
    const saveText = screen.getByText('Save');
    expect(saveText).toBeInTheDocument();
  });
  
  test('should show loading text when provided', () => {
    const { container } = render(
      <LoadingButton loading={true} loadingText="Salvando...">Save</LoadingButton>
    );
    
    console.log('=== Isolated Test: loading=true with loadingText ===');
    console.log('Container HTML:', container.innerHTML);
    
    const loadingText = screen.getByText('Salvando...');
    expect(loadingText).toBeInTheDocument();
    
    const saveText = screen.queryByText('Save');
    expect(saveText).toBeNull();
    
    const statusElement = screen.getByRole('status');
    expect(statusElement).toBeInTheDocument();
  });
});