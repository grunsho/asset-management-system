import { expect, test } from '@playwright/test'

test('admin inicia sesión y abre la gestión de usuarios', async ({ page }) => {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill('admin@ams.com')
  await page.locator('input[type="password"]').fill('Admin123!')
  await page.getByRole('button', { name: 'Ingresar a la Plataforma' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(
    page.getByRole('heading', { name: 'Dashboard de Activos' }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Usuarios' }).click()
  await expect(page).toHaveURL(/\/admin\/users$/)
  await expect(
    page.getByRole('heading', { name: 'Usuarios y roles' }),
  ).toBeVisible()
  await expect(page.getByText('admin@ams.com')).toBeVisible()
})
