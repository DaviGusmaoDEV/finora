import { expect, test } from '@playwright/test';

if (process.env.CI && !process.env.E2E_DATABASE_URL)
  throw new Error('CI exige E2E_DATABASE_URL para os testes E2E autenticados.');

async function completeOnboarding(page: import('@playwright/test').Page, email: string) {
  await page.goto('/cadastro');
  await page.getByLabel('Nome').fill('Pessoa E2E');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel(/Crie uma senha/).fill('senha-e2e-segura-123');
  await page.getByRole('button', { name: 'Criar minha conta' }).click();
  await expect(page).toHaveURL(/onboarding/);
  for (let step = 0; step < 5; step += 1) {
    if (step === 2) {
      await page.getByLabel('Nome da conta').fill('Conta E2E');
      await page.getByLabel('Saldo inicial').fill('100');
    }
    await page
      .getByRole('button', { name: step === 4 ? 'Ir para visão geral' : 'Continuar' })
      .click();
  }
  await expect(page).toHaveURL(/visao-geral/);
}

test.describe('fluxos reais com PostgreSQL', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer PostgreSQL/API E2E configurado');

  test('cadastro, onboarding e conta inicial', async ({ page }) => {
    const email = `e2e-${Date.now()}@test.local`;
    await completeOnboarding(page, email);
    await expect(page.getByText('Saldo atual')).toBeVisible();
  });

  test('login, contas, edição e logout', async ({ page }) => {
    const email = `e2e-login-${Date.now()}@test.local`;
    await completeOnboarding(page, email);
    await page.getByRole('button', { name: 'Contas' }).click();
    await expect(page).toHaveURL(/contas/);
    await page.getByRole('button', { name: 'Nova conta' }).click();
    await page.getByLabel('Nome').fill('Carteira E2E');
    await page.getByRole('button', { name: 'Salvar conta' }).click();
    await expect(page.getByText('Carteira E2E')).toBeVisible();
    await page.getByRole('button', { name: 'Editar' }).click();
    await page.getByLabel('Nome').fill('Carteira editada');
    await page.getByRole('button', { name: 'Salvar conta' }).click();
    await expect(page.getByText('Carteira editada')).toBeVisible();
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/login/);
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill('senha-e2e-segura-123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/visao-geral/);
  });
});
