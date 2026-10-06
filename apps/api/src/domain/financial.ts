import type { TransactionStatus, TransactionType } from '@prisma/client';
import type { MoneyCents } from './money.js';
import { addCents } from './money.js';

export type BalanceEntry = {
  amount: MoneyCents;
  type: TransactionType;
  status: TransactionStatus;
};

export type TransferEntry = {
  amount: MoneyCents;
  incoming: boolean;
};

export function balanceFromEntries(
  initialBalance: MoneyCents,
  transactions: BalanceEntry[],
  transfers: TransferEntry[],
): MoneyCents {
  const posted = transactions.reduce((total, entry) => {
    if (entry.status !== 'PAID') return total;
    return addCents(total, entry.type === 'INCOME' ? entry.amount : -entry.amount);
  }, 0n);
  const moved = transfers.reduce(
    (total, transfer) => addCents(total, transfer.incoming ? transfer.amount : -transfer.amount),
    0n,
  );
  return addCents(initialBalance, posted, moved);
}

export function projectedBalanceFromEntries(
  initialBalance: MoneyCents,
  transactions: BalanceEntry[],
  transfers: TransferEntry[],
): MoneyCents {
  const projected = transactions.reduce((total, entry) => {
    if (entry.status === 'CANCELED') return total;
    return addCents(total, entry.type === 'INCOME' ? entry.amount : -entry.amount);
  }, 0n);
  const moved = transfers.reduce(
    (total, transfer) => addCents(total, transfer.incoming ? transfer.amount : -transfer.amount),
    0n,
  );
  return addCents(initialBalance, projected, moved);
}

export function percentageChange(current: MoneyCents, previous: MoneyCents): number | null {
  if (previous === 0n) return current === 0n ? 0 : null;
  return Number(((current - previous) * 10000n) / (previous < 0n ? -previous : previous)) / 100;
}
