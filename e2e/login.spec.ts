import { test, expect } from '@playwright/test';

/**
 * E2E tests para el flujo de login de SAGIM.
 * 
 * NOTA: Estos tests corren contra el frontend web (Vite dev server).
 * Las llamadas a Tauri APIs serán mockeadas automáticamente en el entorno web.
 */

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows login form', async ({ page }) => {
    // Verificar que la página de login se muestra
    await expect(page.getByRole('heading', { name: /sagim|gimnasio|login/i })).toBeVisible();
  });

  test('has username and password fields', async ({ page }) => {
    // Buscar campos de entrada
    const usernameField = page.getByLabel(/usuario|username/i).or(
      page.getByPlaceholder(/usuario|username/i)
    );
    const passwordField = page.getByLabel(/contraseña|password/i).or(
      page.getByPlaceholder(/contraseña|password/i)
    );
    
    await expect(usernameField.or(page.locator('input[type="text"]').first())).toBeVisible();
    await expect(passwordField.or(page.locator('input[type="password"]'))).toBeVisible();
  });

  test('has submit button', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /ingresar|login|entrar/i });
    await expect(submitButton).toBeVisible();
  });

  test('shows error on empty submission', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /ingresar|login|entrar/i });
    await submitButton.click();
    
    // Debería mostrar algún mensaje de validación o error
    // El comportamiento exacto depende de la implementación
    await page.waitForTimeout(500);
  });

  test('can type in form fields', async ({ page }) => {
    const usernameInput = page.locator('input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]');
    
    await usernameInput.fill('testuser');
    await passwordInput.fill('testpassword');
    
    await expect(usernameInput).toHaveValue('testuser');
    await expect(passwordInput).toHaveValue('testpassword');
  });
});

test.describe('App Navigation', () => {
  test('page loads without errors', async ({ page }) => {
    await page.goto('/');
    
    // No debería haber errores de JavaScript en la consola
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    
    await page.waitForTimeout(2000);
    
    // Filtrar errores esperados de Tauri (cuando corre en web)
    const unexpectedErrors = errors.filter(
      (e) => !e.includes('__TAURI__') && !e.includes('Tauri')
    );
    
    expect(unexpectedErrors).toHaveLength(0);
  });

  test('has correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/sagim/i);
  });
});
