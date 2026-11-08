import { expect, test } from '@playwright/test';

test('sin sesión, una ruta privada redirige al inicio de sesión', async ({ page }) => {
  await page.goto('/tabs/ventas');
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await expect(page.locator('ion-content')).toContainText('Iniciar sesión');
});

test('con la API: después de iniciar sesión se llega al destino y no se puede volver al login', async ({ page }) => {
  await page.goto('/tabs/ventas');
  await page.locator('ion-input input[type="email"]').fill('admin@example.com');
  await page.locator('ion-input input[type="password"]').fill('password');
  await page.getByRole('button', { name: 'Ingresar' }).click();

  await expect(page).toHaveURL(/\/tabs\/ventas$/);
  await page.goBack();
  await expect(page).not.toHaveURL(/\/login/);
});
