import { z } from 'zod';

export const idSchema = z.string().uuid();
export const moneySchema = z.number().finite().nonnegative();
