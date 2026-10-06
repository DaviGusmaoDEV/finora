import argon2 from 'argon2';
import { AccountType, CategoryType, PrismaClient, ThemeMode } from '@prisma/client';

const prisma = new PrismaClient();
const password = process.env.DEMO_PASSWORD;
if (!password) throw new Error('DEMO_PASSWORD é obrigatória para executar o seed demo.');

const expenseCategories = [
  ['Alimentação', ['Mercado', 'Restaurante', 'Delivery']],
  ['Moradia', ['Aluguel', 'Energia', 'Água', 'Internet']],
  ['Transporte', ['Combustível', 'Transporte público', 'Aplicativos', 'Manutenção']],
  ['Saúde', []],
  ['Educação', []],
  ['Lazer', []],
  ['Compras', []],
  ['Assinaturas', []],
  ['Contas', []],
  ['Impostos', []],
  ['Outros', []],
] as const;
const incomeCategories = [
  'Salário',
  'Freelance',
  'Investimentos',
  'Reembolsos',
  'Presentes',
  'Outras receitas',
];

async function main() {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await prisma.user.upsert({
    where: { email: 'demo@finora.local' },
    update: {},
    create: { name: 'Usuário Demo', email: 'demo@finora.local', passwordHash },
  });
  await prisma.userPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, theme: ThemeMode.SYSTEM, onboardingCompleted: true },
  });
  const account = await prisma.account.findFirst({
    where: { userId: user.id, name: 'Conta principal' },
  });
  if (!account)
    await prisma.account.create({
      data: {
        userId: user.id,
        name: 'Conta principal',
        type: AccountType.CHECKING,
        initialBalance: '18420.80',
        institution: 'Banco demo',
      },
    });
  for (const [name, children] of expenseCategories) {
    const parent =
      (await prisma.category.findFirst({
        where: { userId: user.id, name, type: CategoryType.EXPENSE, parentId: null },
      })) ??
      (await prisma.category.create({
        data: { userId: user.id, name, type: CategoryType.EXPENSE, isSystem: true },
      }));
    if (children.length)
      await prisma.category.createMany({
        data: children.map((child) => ({
          userId: user.id,
          parentId: parent.id,
          name: child,
          type: CategoryType.EXPENSE,
          isSystem: true,
        })),
        skipDuplicates: true,
      });
  }
  for (const name of incomeCategories) {
    const exists = await prisma.category.findFirst({
      where: { userId: user.id, name, type: CategoryType.INCOME, parentId: null },
    });
    if (!exists)
      await prisma.category.create({
        data: { userId: user.id, name, type: CategoryType.INCOME, isSystem: true },
      });
  }
}

main().finally(() => prisma.$disconnect());
