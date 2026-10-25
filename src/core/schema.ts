import { z } from 'zod';
import { database, getCard } from './cards';

const productIds = new Set(database.products.map((p) => p.id));
const cardId = z
  .string()
  .max(64)
  .regex(/^[a-z0-9-]+$/, 'invalid card id')
  .refine((id) => getCard(id) !== undefined, { message: 'unknown card' });

/**
 * Request schema shared by the API server and the client. Strict: unknown
 * fields are rejected, and every list is bounded so a request can't make the
 * server do unbounded work.
 */
export const generateRequestSchema = z
  .object({
    seed: z
      .string()
      .min(1)
      .max(32)
      .regex(/^[A-Za-z0-9_-]+$/, 'seed may only contain letters, digits, "-" and "_"')
      .optional(),
    products: z
      .array(
        z
          .string()
          .max(32)
          .refine((p) => productIds.has(p), { message: 'unknown product' }),
      )
      .max(64)
      .default([]),
    landscapes: z.number().int().min(0).max(4).default(1),
    attacks: z.enum(['none', 'some', 'any']).default('any'),
    allowComplex: z.boolean().default(true),
    maxProducts: z.number().int().min(0).max(10).default(0),
    locked: z.array(cardId).max(14).default([]),
    banned: z.array(cardId).max(300).default([]),
  })
  .strict();

export type GenerateRequestInput = z.input<typeof generateRequestSchema>;
export type GenerateRequest = z.output<typeof generateRequestSchema>;
