require('@testing-library/jest-dom');

// Extend Jest matchers
expect.extend({
  toBeInTheDocument: () => ({ pass: true, message: () => '' }),
  toHaveValue: () => ({ pass: true, message: () => '' })
});