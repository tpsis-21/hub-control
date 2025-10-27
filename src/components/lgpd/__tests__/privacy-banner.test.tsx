import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrivacyBanner } from '../privacy-banner';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('PrivacyBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render banner when no consent is stored', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    render(<PrivacyBanner />);
    
    expect(screen.getByText(/utilizamos cookies e coletamos dados pessoais/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /aceitar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rejeitar/i })).toBeInTheDocument();
  });

  it('should not render banner when consent is already given', () => {
    localStorageMock.getItem.mockReturnValue('accepted');
    
    const { container } = render(<PrivacyBanner />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should not render banner when consent is rejected', () => {
    localStorageMock.getItem.mockReturnValue('rejected');
    
    const { container } = render(<PrivacyBanner />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should store consent in localStorage when accept button is clicked', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    render(<PrivacyBanner />);
    
    const acceptButton = screen.getByRole('button', { name: /aceitar/i });
    fireEvent.click(acceptButton);
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('lgpd-consent', 'accepted');
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'lgpd-consent-date', 
      expect.any(String)
    );
  });

  it('should store rejection in localStorage when reject button is clicked', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    render(<PrivacyBanner />);
    
    const rejectButton = screen.getByRole('button', { name: /rejeitar/i });
    fireEvent.click(rejectButton);
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('lgpd-consent', 'rejected');
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'lgpd-consent-date', 
      expect.any(String)
    );
  });

  it('should render privacy policy and terms links', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    render(<PrivacyBanner />);
    
    expect(screen.getByRole('link', { name: /política de privacidade/i })).toHaveAttribute(
      'href',
      '/privacy-policy'
    );
    expect(screen.getByRole('link', { name: /termos de uso/i })).toHaveAttribute(
      'href',
      '/terms'
    );
  });
});
