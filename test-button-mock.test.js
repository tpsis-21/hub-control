import React from 'react';
import { render, screen } from '@testing-library/react';
import { Button } from './src/components/ui/button';
import { Loader2 } from 'lucide-react';

describe('Button and Loader2 Mock Test', () => {
  test('should render Button correctly', () => {
    render(<Button>Test Button</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });

  test('should render Loader2 only when explicitly used', () => {
    const TestComponent = ({ showLoader }) => (
      <div>
        {showLoader && <Loader2 />}
        <span>Content</span>
      </div>
    );

    // Test without loader
    const { rerender } = render(<TestComponent showLoader={false} />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Content')).toBeInTheDocument();

    // Test with loader
    rerender(<TestComponent showLoader={true} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  test('should render Button with conditional Loader2', () => {
    const TestButton = ({ loading }) => (
      <Button>
        {loading && <Loader2 role="status" />}
        <span>Save</span>
      </Button>
    );

    // Test without loading
    const { rerender } = render(<TestButton loading={false} />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Save')).toBeInTheDocument();

    // Test with loading
    rerender(<TestButton loading={true} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });
});