import { expect, test } from '@playwright/test';

test('renderiza o shell e o dashboard demo no desktop', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByRole('heading', { name: /bom dia, marina/i })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Navegação principal' })).toBeVisible();
  await expect(page.getByText('R$ 18.420,80')).toBeVisible();
});

test('permite recolher a sidebar mantendo a navegação acessível', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Recolher menu' }).click();
  await expect(page.getByRole('button', { name: 'Visão geral' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Expandir menu' })).toBeVisible();
});

test('oferece navegação mobile e troca de tema', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demo');
  await expect(page.getByRole('navigation', { name: 'Navegação mobile' })).toBeVisible();
  await page.evaluate(() => localStorage.setItem('finora-theme', 'dark'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Adicionar lançamento' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
