import { expect, test } from '@playwright/test';

if (process.env.CI && !process.env.E2E_DATABASE_URL)
  throw new Error('CI exige E2E_DATABASE_URL para os testes E2E autenticados.');

async function onboard(page: import('@playwright/test').Page, suffix: string) {
  await page.goto('/cadastro');
  await page.getByLabel('Nome').fill('Pessoa Financeira');
  await page.getByLabel('E-mail').fill(`financial-${suffix}-${Date.now()}@test.local`);
  await page.getByLabel(/Crie uma senha/).fill('senha-e2e-segura-123');
  await page.getByRole('button', { name: 'Criar minha conta' }).click();
  await expect(page).toHaveURL(/onboarding/);
  for (let step = 0; step < 5; step += 1) {
    if (step === 2) {
      await page.getByLabel('Nome da conta').fill('Conta principal');
      await page.getByLabel('Saldo inicial').fill('100');
    }
    await page
      .getByRole('button', { name: step === 4 ? 'Ir para visão geral' : 'Continuar' })
      .click();
  }
  await expect(page).toHaveURL(/visao-geral/);
}

test.describe('motor financeiro real com PostgreSQL', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'requer PostgreSQL/API E2E configurado');

  test('adiciona receita e atualiza o dashboard', async ({ page }) => {
    await onboard(page, 'income');
    await page.getByRole('button', { name: 'Adicionar' }).click();
    await page.getByRole('button', { name: 'Nova receita' }).click();
    await page.getByLabel('Descrição').fill('Freelance E2E');
    await page.getByLabel('Valor').fill('250,50');
    await page.getByLabel('Categoria').selectOption({ label: 'Salário' });
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText(/R\$\s*350,50/)).toBeVisible();
  });

  test('registra despesa e mostra o lançamento no histórico', async ({ page }) => {
    await onboard(page, 'expense');
    await page.goto('/transacoes?new=expense');
    await page.getByLabel('Descrição').fill('Mercado E2E');
    await page.getByLabel('Valor').fill('20,00');
    await page.getByLabel('Categoria').selectOption({ label: 'Alimentação' });
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Mercado E2E')).toBeVisible();
    await page.goto('/visao-geral');
    await expect(page.getByText(/R\$\s*80,00/)).toBeVisible();
  });

  test('cria uma segunda conta e realiza transferência', async ({ page }) => {
    await onboard(page, 'transfer');
    await page.getByRole('button', { name: 'Contas' }).click();
    await page.getByRole('button', { name: 'Nova conta' }).click();
    await page.getByLabel('Nome').fill('Poupança E2E');
    await page.getByLabel('Saldo inicial').fill('0');
    await page.getByRole('button', { name: 'Salvar conta' }).click();
    await page.goto('/transacoes?new=transfer');
    await page.getByLabel('Descrição').fill('Reserva E2E');
    await page.getByLabel('Valor').fill('30,00');
    await page.getByLabel('Conta de origem').selectOption({ label: 'Conta principal' });
    await page.getByLabel('Conta de destino').selectOption({ label: 'Poupança E2E' });
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText(/Conta principal → Poupança E2E/)).toBeVisible();
    await page.goto('/visao-geral');
    await expect(page.getByText(/R\$\s*100,00/)).toBeVisible();
  });
});
