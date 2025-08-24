const { render, screen } = require('@testing-library/react');
const React = require('react');

// Simular o componente LoadingButton
const LoadingButton = ({ loading = false, children }) => {
  return React.createElement('button', {
    disabled: loading,
    className: 'flex items-center gap-2'
  }, [
    loading && React.createElement('div', {
      key: 'spinner',
      role: 'status',
      'aria-label': 'Carregando...',
      className: 'animate-spin h-4 w-4'
    }),
    children
  ]);
};

// Teste
render(React.createElement(LoadingButton, { loading: true }, 'Save'));

console.log('HTML:', document.body.innerHTML);
console.log('Status element:', screen.queryByRole('status'));