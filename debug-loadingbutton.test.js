import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingButton } from './src/components/ui/loading';

// Mock Button component
jest.mock('./src/components/ui/button', () => ({
  Button: ({ children, disabled, className, ...props }) => (
    <button disabled={disabled} className={className} {...props}>
      {children}
    </button>
  ),
}));

// Mock cn utility
jest.mock('./src/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}));

describe('LoadingButton Debug', () => {
  test('should render normal button when not loading', () => {
    const { container } = render(
      <LoadingButton loading={false}>Save</LoadingButton>
    );
    
    console.log('=== Test 1: loading=false ===');
    console.log('Container HTML:', container.innerHTML);
    
    // Check if Save text is present
    const saveText = screen.queryByText('Save');
    console.log('Save text found:', !!saveText);
    expect(saveText).toBeInTheDocument();
    
    // Check if no status element is present
    const statusElement = screen.queryByRole('status');
    console.log('Status element found:', !!statusElement);
    if (statusElement) {
      console.log('Status element HTML:', statusElement.outerHTML);
    }
    expect(statusElement).toBeNull();
    
    // Check if no loader2 testid is present
    const loader2 = screen.queryByTestId('loader2');
    console.log('Loader2 found:', !!loader2);
    expect(loader2).toBeNull();
  });

  test('should render spinner when loading=true', () => {
    const { container } = render(
      <LoadingButton loading={true}>Save</LoadingButton>
    );
    
    console.log('=== Test 2: loading=true ===');
    console.log('Container HTML:', container.innerHTML);
    
    // Check if status element is present
    const statusElement = screen.queryByRole('status');
    console.log('Status element found:', !!statusElement);
    expect(statusElement).toBeInTheDocument();
    
    // Check if loader2 testid is present
    const loader2 = screen.queryByTestId('loader2');
    console.log('Loader2 found:', !!loader2);
    expect(loader2).toBeInTheDocument();
  });

  test('should show loadingText when provided', () => {
    const { container } = render(
      <LoadingButton loading={true} loadingText="Saving...">Save</LoadingButton>
    );
    
    console.log('=== Test 3: loading=true with loadingText ===');
    console.log('Container HTML:', container.innerHTML);
    
    // Check if loadingText is present
    const loadingText = screen.queryByText('Saving...');
    console.log('Loading text found:', !!loadingText);
    expect(loadingText).toBeInTheDocument();
    
    // Check if original text is not present
    const saveText = screen.queryByText('Save');
    console.log('Save text found:', !!saveText);
    if (saveText) {
      console.log('Save text HTML:', saveText.outerHTML);
    }
    expect(saveText).toBeNull();
    
    // Check if status element is present
    const statusElement = screen.queryByRole('status');
    console.log('Status element found:', !!statusElement);
    expect(statusElement).toBeInTheDocument();
  });
});