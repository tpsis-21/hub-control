import { test, expect } from '@playwright/test';

test.describe('API smoke', () => {
  test('GET /api/health retorna ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toMatchObject({
      status: 'ok',
      service: 'Hub Control',
    });
  });

  test('GET /api/status responde', async ({ request }) => {
    const response = await request.get('/api/status');
    expect(response.ok()).toBeTruthy();
  });

  test('GET /api/gates2b/webhook retorna endpoint ativo', async ({ request }) => {
    const response = await request.get('/api/gates2b/webhook');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body).toMatchObject({
      success: true,
      data: { endpoint: '/api/gates2b/webhook', method: 'POST' },
    });
  });
});

test.describe('Login UI', () => {
  test('página de login exibe formulário', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    await expect(page.getByText('Entre com suas credenciais')).toBeVisible();
  });

  test('credenciais inválidas não redireciona ao dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('e2e-invalido@example.com');
    await page.locator('#password').fill('senha-invalida-e2e-123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(page).not.toHaveURL(/\/dashboard/);
  });
});

test.describe('Layout mobile (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('login cabe na viewport sem scroll horizontal', async ({ page }) => {
    await page.goto('/login');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    await expect(page.locator('#email')).toBeVisible();
  });

  test('dashboard redireciona login quando não autenticado', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});

test.describe('Login autenticado', () => {
  test('admin entra com credenciais E2E configuradas', async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;
    test.skip(!email || !password, 'Defina E2E_TEST_EMAIL e E2E_TEST_PASSWORD');

    await page.goto('/login');
    await page.locator('#email').fill(email!);
    await page.locator('#password').fill(password!);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
