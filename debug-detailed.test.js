const React = require('react');
const { render, screen } = require('@testing-library/react');

// Mock do Loader2
jest.mock('lucide-react', () => ({
  Loader2: ({ className, role, 'aria-label': ariaLabel, ...props }) => {
    console.log('Loader2 rendered with props:', { className, role, 'aria-label': ariaLabel, ...props });
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
    console.log('Button rendered with props:', { className, disabled, ...props });
    console.log('Button children:', children);
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
  cn: (...classes) => {
    const result = classes.filter(Boolean).join(' ');
    console.log('cn called with:', classes, 'result:', result);
    return result;
  }
}));

// Importar o componente
const { LoadingButton } = require('./src/components/ui/loading');

describe('LoadingButton Detailed Debug', () => {
  beforeEach(() => {
    console.log('\n=== Starting new test ===');
  });
  
  test('should not render spinner when loading=false', () => {
    console.log('\n--- Test: loading=false ---');
    const { container } = render(React.createElement(LoadingButton, { loading: false }, 'Save'));
    
    console.log('Full container HTML:', container.innerHTML);
    
    const button = screen.getByRole('button');
    console.log('Button found:', button.outerHTML);
    
    const statusElements = screen.queryAllByRole('status');
    console.log('Status elements found:', statusElements.length);
    statusElements.forEach((el, i) => {
      console.log(`Status element ${i + 1}:`, el.outerHTML);
    });
    
    const loader2Elements = screen.queryAllByTestId('loader2');
    console.log('Loader2 elements found:', loader2Elements.length);
    loader2Elements.forEach((el, i) => {
      console.log(`Loader2 element ${i + 1}:`, el.outerHTML);
    });
    
    expect(statusElements.length).toBe(0);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });
  
  test('should render spinner when loading=true', () => {
    console.log('\n--- Test: loading=true ---');
    const { container } = render(React.createElement(LoadingButton, { loading: true }, 'Save'));
    
    console.log('Full container HTML:', container.innerHTML);
    
    const button = screen.getByRole('button');
    console.log('Button found:', button.outerHTML);
    
    const statusElements = screen.queryAllByRole('status');
    console.log('Status elements found:', statusElements.length);
    statusElements.forEach((el, i) => {
      console.log(`Status element ${i + 1}:`, el.outerHTML);
    });
    
    const loader2Elements = screen.queryAllByTestId('loader2');
    console.log('Loader2 elements found:', loader2Elements.length);
    loader2Elements.forEach((el, i) => {
      console.log(`Loader2 element ${i + 1}:`, el.outerHTML);
    });
    
    expect(statusElements.length).toBe(1);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });
  
  test('should render loadingText when provided', () => {
    console.log('\n--- Test: loading=true with loadingText ---');
    const { container } = render(React.createElement(LoadingButton, { loading: true, loadingText: 'Salvando...' }, 'Save'));
    
    console.log('Full container HTML:', container.innerHTML);
    
    expect(screen.getByText('Salvando...')).toBeInTheDocument();
    
    const saveElements = screen.queryAllByText('Save');
    console.log('Save text elements found:', saveElements.length);
    saveElements.forEach((el, i) => {
      console.log(`Save element ${i + 1}:`, el.outerHTML);
    });
    
    expect(saveElements.length).toBe(0);
  });
});