// src/components/ui/logo.tsx
import React from 'react';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className = '', width = 120, height = 40 }: LogoProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background circle */}
      <circle cx="20" cy="20" r="18" fill="#3B82F6" />
      
      {/* Hub icon - interconnected nodes */}
      <circle cx="14" cy="14" r="2" fill="white" />
      <circle cx="26" cy="14" r="2" fill="white" />
      <circle cx="14" cy="26" r="2" fill="white" />
      <circle cx="26" cy="26" r="2" fill="white" />
      <circle cx="20" cy="20" r="2.5" fill="white" />
      
      {/* Connection lines */}
      <line x1="16" y1="16" x2="18" y2="18" stroke="white" strokeWidth="1.5" />
      <line x1="24" y1="16" x2="22" y2="18" stroke="white" strokeWidth="1.5" />
      <line x1="16" y1="24" x2="18" y2="22" stroke="white" strokeWidth="1.5" />
      <line x1="24" y1="24" x2="22" y2="22" stroke="white" strokeWidth="1.5" />
      
      {/* Text */}
      <text x="48" y="16" fill="currentColor" fontSize="14" fontWeight="bold" fontFamily="system-ui, sans-serif">
        Hub
      </text>
      <text x="48" y="30" fill="currentColor" fontSize="12" fontFamily="system-ui, sans-serif">
        Control
      </text>
      
      {/* IPTV indicator */}
      <rect x="90" y="12" width="24" height="16" rx="2" fill="#10B981" />
      <text x="102" y="22" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="system-ui, sans-serif">
        IPTV
      </text>
    </svg>
  );
}

export default Logo;