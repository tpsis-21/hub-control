import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingButton } from './src/components/ui/loading';

describe('LoadingButton Exact Test', () => {
  it('should render normal button when not loading', () => {
    const { container } = render(
      <LoadingButton loading={false}>
        Save
      </LoadingButton>
    );
    
    console.log('=== Test: loading=false ===');
    
    const statusElement = screen.queryByRole('status');
    console.log('Status element exists:', !!statusElement);
    
    const saveText = screen.queryByText('Save');
    console.log('Save text exists:', !!saveText);
    
    const loader2Element = screen.queryByTestId('loader2');
    console.log('Loader2 element exists:', !!loader2Element);
    
    // Check if there's any element with role="status" in the DOM
    const allStatusElements = container.querySelectorAll('[role="status"]');
    console.log('Total status elements found:', allStatusElements.length);
    
    if (allStatusElements.length > 0) {
      console.log('Status elements HTML:');
      allStatusElements.forEach((el, index) => {
        console.log(`  ${index + 1}:`, el.outerHTML);
      });
    }
    
    expect(statusElement).toBeNull();
    expect(saveText).toBeInTheDocument();
  });

  it('should show loading text when provided', () => {
    const { container } = render(
      <LoadingButton loading={true} loadingText="Salvando...">
        Save
      </LoadingButton>
    );
    
    console.log('=== Test: loading=true with loadingText ===');
    
    const loadingText = screen.queryByText('Salvando...');
    console.log('Loading text exists:', !!loadingText);
    
    const saveText = screen.queryByText('Save');
    console.log('Save text exists:', !!saveText);
    
    const statusElement = screen.queryByRole('status');
    console.log('Status element exists:', !!statusElement);
    
    expect(loadingText).toBeInTheDocument();
    expect(saveText).toBeNull();
    expect(statusElement).toBeInTheDocument();
  });
});