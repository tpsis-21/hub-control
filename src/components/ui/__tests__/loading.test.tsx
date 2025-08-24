import { render, screen } from '@testing-library/react';
import { 
  Loading, 
  LoadingSpinner, 
  LoadingDots, 
  LoadingPage, 
  LoadingButton 
} from '../loading';

describe('Loading', () => {
  it('should render spinner variant by default', () => {
    render(<Loading />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Carregando...');
  });

  it('should render with custom text', () => {
    render(<Loading text="Processando..." />);
    
    expect(screen.getByText('Processando...')).toBeInTheDocument();
  });

  it('should render dots variant', () => {
    render(<Loading variant="dots" />);
    
    const dotsContainer = screen.getByRole('status');
    expect(dotsContainer).toBeInTheDocument();
    
    // Should have 3 dots
    const dots = dotsContainer.querySelectorAll('div > div');
    expect(dots).toHaveLength(3);
  });

  it('should render pulse variant', () => {
    render(<Loading variant="pulse" />);
    
    const pulseElement = screen.getByRole('status');
    expect(pulseElement).toBeInTheDocument();
    expect(pulseElement.className).toContain('animate-pulse');
  });

  it('should render different sizes', () => {
    const { rerender } = render(<Loading size="sm" />);
    let spinner = screen.getByRole('status');
    expect(spinner.className).toContain('h-4 w-4');

    rerender(<Loading size="md" />);
    spinner = screen.getByRole('status');
    expect(spinner.className).toContain('h-6 w-6');

    rerender(<Loading size="lg" />);
    spinner = screen.getByRole('status');
    expect(spinner.className).toContain('h-8 w-8');

    rerender(<Loading size="xl" />);
    spinner = screen.getByRole('status');
    expect(spinner.className).toContain('h-12 w-12');
  });

  it('should render fullscreen when fullscreen prop is true', () => {
    render(<Loading fullScreen />);
    
    // O componente fullScreen renderiza um wrapper com fixed inset-0
    const fullScreenWrapper = document.querySelector('.fixed.inset-0');
    expect(fullScreenWrapper).toBeInTheDocument();
    expect(fullScreenWrapper?.className).toContain('fixed inset-0');
    expect(fullScreenWrapper?.className).toContain('bg-background/80');
    expect(fullScreenWrapper?.className).toContain('backdrop-blur-sm');
    
    // O spinner está dentro do wrapper
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<Loading className="custom-class" />);
    
    // A className customizada é aplicada ao container, não ao spinner
    const container = screen.getByRole('status').parentElement;
    expect(container?.className).toContain('custom-class');
    
    // O spinner mantém suas classes padrão
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });
});

describe('LoadingSpinner', () => {
  it('should render spinner with default props', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Carregando...');
  });

  it('should render with custom size and className', () => {
    render(<LoadingSpinner size="lg" className="custom-spinner" />);
    
    // O LoadingSpinner usa o componente Loading internamente
    // A className customizada é aplicada ao container
    const container = screen.getByRole('status').parentElement;
    expect(container?.className).toContain('custom-spinner');
    
    // O spinner tem o tamanho lg (h-8 w-8)
    const spinner = screen.getByRole('status');
    expect(spinner.className).toContain('h-8 w-8');
  });
});

describe('LoadingDots', () => {
  it('should render three animated dots', () => {
    render(<LoadingDots />);
    
    const container = screen.getByRole('status');
    expect(container).toBeInTheDocument();
    
    const dots = container.querySelectorAll('div > div');
    expect(dots).toHaveLength(3);
    
    // Check that each dot has animation delay
    expect(dots[0]).toHaveStyle('animation-delay: 0ms');
    expect(dots[1]).toHaveStyle('animation-delay: 150ms');
    expect(dots[2]).toHaveStyle('animation-delay: 300ms');
  });

  it('should apply custom size', () => {
    render(<LoadingDots size="lg" />);
    
    const container = screen.getByRole('status');
    const dots = container.querySelectorAll('div');
    
    // Para tamanho lg, os dots devem ter w-3 h-3
    dots.forEach(dot => {
      expect(dot.className).toContain('w-3 h-3');
    });
  });
});

describe('LoadingPage', () => {
  it('should render fullscreen loading with text', () => {
    render(<LoadingPage />);
    
    // LoadingPage renderiza com fullScreen, então o wrapper fixed deve existir
    const fullScreenWrapper = document.querySelector('.fixed.inset-0');
    expect(fullScreenWrapper).toBeInTheDocument();
    expect(fullScreenWrapper?.className).toContain('fixed inset-0');
    
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('should render with custom text', () => {
    render(<LoadingPage text="Inicializando aplicação..." />);
    
    expect(screen.getByText('Inicializando aplicação...')).toBeInTheDocument();
  });

  it('should use large size by default', () => {
    render(<LoadingPage />);
    
    // LoadingPage usa fullScreen e size lg por padrão
    const fullScreenWrapper = document.querySelector('.fixed.inset-0');
    expect(fullScreenWrapper).toBeInTheDocument();
    
    const spinner = screen.getByRole('status');
    expect(spinner.className).toContain('h-8 w-8');
  });
});

describe('LoadingButton', () => {
  it('should render button with loading spinner when loading', () => {
    render(
      <LoadingButton loading={true}>
        Save
      </LoadingButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('should render normal button when not loading', () => {
    render(
      <LoadingButton loading={false}>
        Save
      </LoadingButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('should show loading text when provided', () => {
    render(
      <LoadingButton loading={true} loadingText="Salvando...">
        Save
      </LoadingButton>
    );
    
    expect(screen.getByText('Salvando...')).toBeInTheDocument();
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  it('should apply custom variant and size', () => {
    render(
      <LoadingButton loading={false} variant="outline" size="lg">
        Custom Button
      </LoadingButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Custom Button')).toBeInTheDocument();
  });

  it('should be disabled when loading even if disabled prop is false', () => {
    render(
      <LoadingButton loading={true} disabled={false}>
        Save
      </LoadingButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should be disabled when disabled prop is true regardless of loading state', () => {
    render(
      <LoadingButton loading={false} disabled={true}>
        Save
      </LoadingButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should apply custom className', () => {
    render(
      <LoadingButton loading={false} className="custom-button">
        Save
      </LoadingButton>
    );
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('custom-button');
  });
});