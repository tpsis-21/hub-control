// Mock dinâmico para lucide-react
const React = require('react');

// Mock específico para Loader2 que retorna um elemento com role="status"
const Loader2 = React.forwardRef((props, ref) => {
  return React.createElement('div', {
    ref,
    role: 'status',
    'aria-label': 'Carregando...',
    'data-testid': 'loader2',
    className: props.className,
    ...props
  });
});
Loader2.displayName = 'Loader2';

// Fábrica de componente mock genérico
const createMockComponent = (name) => {
  const Component = React.forwardRef((props, ref) => React.createElement('span', { ref, 'data-icon': String(name), ...props }, props.children));
  Component.displayName = String(name);
  return Component;
};

// Exporta um Proxy para retornar um componente mock para QUALQUER ícone acessado
module.exports = new Proxy({}, {
  get: (target, prop) => {
    if (prop === '__esModule') return false;
    if (prop === 'Loader2') return Loader2;
    // Retorna sempre um componente mock, mesmo para ícones não previamente listados
    return createMockComponent(prop);
  }
});