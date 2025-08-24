import React from 'react';
import { render, screen } from '@testing-library/react';
import { Loader2 } from 'lucide-react';

describe('Loader2 Mock Test', () => {
  test('should render Loader2 when explicitly used', () => {
    render(<Loader2 className="test-class" />);
    
    const loader = screen.getByRole('status');
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveAttribute('data-testid', 'loader2');
  });

  test('should not render Loader2 when not used', () => {
    render(<div>No loader here</div>);
    
    const loader = screen.queryByRole('status');
    expect(loader).toBeNull();
  });

  test('conditional rendering test', () => {
    const ConditionalLoader = ({ show }) => {
      return (
        <div>
          {show && <Loader2 />}
          <span>Content</span>
        </div>
      );
    };

    // Test when show=false
    const { rerender } = render(<ConditionalLoader show={false} />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Content')).toBeInTheDocument();

    // Test when show=true
    rerender(<ConditionalLoader show={true} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});