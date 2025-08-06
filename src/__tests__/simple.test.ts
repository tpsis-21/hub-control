/**
 * Teste simples para verificar se Jest está funcionando
 */

describe('Teste Simples', () => {
  test('deve somar dois números', () => {
    expect(2 + 2).toBe(4);
  });

  test('deve verificar se string contém texto', () => {
    expect('Hub Control').toContain('Control');
  });
});