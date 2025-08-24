import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingButton } from './src/components/ui/loading';

describe('Debug Original LoadingButton Test', () => {
  it('should render normal button when not loading - debug', () => {
    const { container } = render(
      <LoadingButton loading={false}>
        Save
      </LoadingButton>
    );
    
    console.log('Container HTML:', container.innerHTML);
    
    const button = screen.getByRole('button');
    console.log('Button HTML:', button.outerHTML);
    
    const statusElements = screen.queryAllByRole('status');
    console.log('Status elements found:', statusElements.length);
    statusElements.forEach((el, index) => {
      console.log(`Status element ${index}:`, el.outerHTML);
    });
    
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });
  
  it('should show loading text when provided - debug', () => {
    const { container } = render(
      <LoadingButton loading={true} loadingText="Salvando...">
        Save
      </LoadingButton>
    );
    
    console.log('Loading Container HTML:', container.innerHTML);
    
    const statusElements = screen.queryAllByRole('status');
    console.log('Loading Status elements found:', statusElements.length);
    statusElements.forEach((el, index) => {
      console.log(`Loading Status element ${index}:`, el.outerHTML);
    });
    
    expect(screen.getByText('Salvando...')).toBeInTheDocument();
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });
});