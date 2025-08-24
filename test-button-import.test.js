import React from 'react';
import { render, screen } from '@testing-library/react';
import { Button } from './src/components/ui/button';
import { LoadingButton } from './src/components/ui/loading';

describe('Button Import Test', () => {
  test('should import Button correctly', () => {
    render(<Button>Test Button</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Test Button')).toBeInTheDocument();
    
    console.log('Button component type:', typeof Button);
    console.log('Button HTML:', button.outerHTML);
  });
  
  test('should import LoadingButton correctly', () => {
    const { container } = render(
      <LoadingButton loading={false}>Save</LoadingButton>
    );
    
    console.log('LoadingButton component type:', typeof LoadingButton);
    console.log('LoadingButton HTML:', container.innerHTML);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    
    // Check if there's any status element
    const statusElement = screen.queryByRole('status');
    console.log('Status element found:', !!statusElement);
    if (statusElement) {
      console.log('Status element HTML:', statusElement.outerHTML);
    }
    
    expect(statusElement).toBeNull();
  });
  
  test('should render LoadingButton with loading=true', () => {
    const { container } = render(
      <LoadingButton loading={true}>Save</LoadingButton>
    );
    
    console.log('LoadingButton (loading=true) HTML:', container.innerHTML);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
    
    const statusElement = screen.getByRole('status');
    expect(statusElement).toBeInTheDocument();
    
    expect(screen.getByText('Save')).toBeInTheDocument();
  });
});