// Teste simples para debug do LoadingButton
const { render, screen } = require('@testing-library/react');
const React = require('react');

// Mock do Loader2
jest.mock('lucide-react', () => ({
  Loader2: ({ className, role, 'aria-label': ariaLabel, ...props }) => {
    return React.createElement('div', {
      'data-testid': 'loader2',
      className,
      role,
      'aria-label': ariaLabel,
      ...props
    }, 'Loading...');
  }
}));

// Mock do Button
jest.mock('@/components/ui/button', () => ({
  Button: React.forwardRef(({ children, className, disabled, ...props }, ref) => {
    return React.createElement('button', {
      ref,
      className,
      disabled,
      ...props
    }, children);
  })
}));

// Mock do cn
jest.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' ')
}));

// Importar o componente
const { LoadingButton } = require('../loading');

describe('LoadingButton Debug', () => {
  test('should not render spinner when loading=false', () => {
    render(React.createElement(LoadingButton, { loading: false }, 'Save'));
    
    const button = screen.getByRole('button');
    const spinner = screen.queryByRole('status');
    
    console.log('Button HTML:', button.outerHTML);
    console.log('Spinner found:', spinner ? spinner.outerHTML : 'null');
    
    expect(spinner).toBeNull();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });
  
  test('should render spinner when loading=true', () => {
    render(React.createElement(LoadingButton, { loading: true, loadingText: 'Salvando...' }, 'Save'));
    
    const button = screen.getByRole('button');
    const spinner = screen.getByRole('status');
    
    console.log('Button HTML:', button.outerHTML);
    console.log('Spinner HTML:', spinner.outerHTML);
    
    expect(spinner).toBeInTheDocument();
    expect(screen.getByText('Salvando...')).toBeInTheDocument();
  });
});