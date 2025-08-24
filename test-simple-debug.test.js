import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingButton } from './src/components/ui/loading';

describe('Simple Debug Test', () => {
  it('should check loading=false HTML', () => {
    const { container } = render(
      <LoadingButton loading={false}>
        Save
      </LoadingButton>
    );
    
    // Log apenas o HTML do botão
    const button = container.querySelector('button');
    console.log('BUTTON HTML:', button ? button.outerHTML : 'NO BUTTON FOUND');
    
    // Verificar se há elementos com role status
    const statusElements = container.querySelectorAll('[role="status"]');
    console.log('STATUS ELEMENTS COUNT:', statusElements.length);
    
    if (statusElements.length > 0) {
      statusElements.forEach((el, i) => {
        console.log(`STATUS ${i}:`, el.outerHTML);
      });
    }
    
    expect(statusElements.length).toBe(0);
  });
});