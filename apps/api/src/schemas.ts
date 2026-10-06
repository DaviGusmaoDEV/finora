import { z } from 'zod';

const password = z.string().min(8).max(128);
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z
    .string()
    .trim()
    .email()
    .max(320)
    .transform((value) => value.toLowerCase()),
  password,
});
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(320)
    .transform((value) => value.toLowerCase()),
  password,
});
const timezone = z
  .string()
  .min(1)
  .max(64)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }, 'Fuso horário inválido.');
export const preferenceSchema = z.object({
  currency: z.string().length(3).toUpperCase().default('BRL'),
  locale: z.string().min(2).max(16).default('pt-BR'),
  timezone: timezone.default('America/Sao_Paulo'),
  theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']).default('SYSTEM'),
  dateFormat: z.string().min(4).max(32).default('dd/MM/yyyy'),
  onboardingCompleted: z.boolean().optional(),
});
export const accountSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(['CHECKING', 'SAVINGS', 'CASH', 'DIGITAL_WALLET', 'INVESTMENT', 'OTHER']),
  initialBalance: z
    .string()
    .trim()
    .regex(/^-?\d{1,12}(?:[.,]\d{1,2})?$/, 'Saldo inválido.'),
  currency: z.string().length(3).toUpperCase().default('BRL'),
  institution: z.string().trim().max(120).optional(),
  description: z.string().trim().max(500).optional(),
});
export const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(['INCOME', 'EXPENSE']),
  parentId: z.string().uuid().nullable().optional(),
  icon: z.string().max(40).optional(),
});
export const profileSchema = z.object({ name: z.string().trim().min(2).max(120) });

const money = z
  .string()
  .trim()
  .regex(
    /^\d{1,12}(?:[.,]\d{1,2})?$/,
    'Valor deve ter no máximo duas casas decimais e 12 dígitos inteiros.',
  );
const isoDate = z.string().datetime({ offset: true });
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const transactionSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
  type: z.enum(['INCOME', 'EXPENSE']),
  status: z.enum(['PENDING', 'PAID', 'CANCELED']).default('PAID'),
  description: z.string().trim().min(1).max(160),
  amount: money,
  transactionDate: isoDate,
  dueDate: dateOnly.nullable().optional(),
  paidAt: isoDate.nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});
export const transactionUpdateSchema = transactionSchema.partial();
export const transferSchema = z.object({
  sourceAccountId: z.string().uuid(),
  destinationAccountId: z.string().uuid(),
  amount: money.refine(
    (value) => !/^0+(?:[.,]0{1,2})?$/.test(value),
    'A transferência deve ser maior que zero.',
  ),
  transferDate: isoDate,
  description: z.string().trim().max(160).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});
export const transactionQuerySchema = z.object({
  period: z.enum(['today', '7d', '30d', 'month', 'previous_month', 'year']).optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  status: z.enum(['PENDING', 'PAID', 'CANCELED']).optional(),
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
  sort: z.enum(['recent', 'oldest', 'highest', 'lowest']).default('recent'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export const dashboardQuerySchema = z.object({
  period: z.enum(['today', '7d', '30d', 'month', 'previous_month', 'year']).default('month'),
});
