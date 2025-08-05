import React from "react";

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

/**
 * Botão acessível reutilizável, com suporte a ARIA, navegação por teclado e foco visível.
 * Exemplo de uso:
 * <AccessibleButton label="Salvar" onClick={...} />
 */
export const AccessibleButton: React.FC<AccessibleButtonProps> = ({ label, className = "", ...props }) => (
  <button
    aria-label={label}
    tabIndex={0}
    className={`focus:outline focus:ring ${className}`}
    {...props}
  >
    {label}
  </button>
);