import { z } from "zod";

export const createStocktakeSessionSchema = z.object({
  notes: z.string().optional(),
});

export const commitStocktakeSessionSchema = z.object({
  counts: z.record(z.string(), z.number().int().min(0)),
});

export type CreateStocktakeSessionInput = z.infer<typeof createStocktakeSessionSchema>;
export type CommitStocktakeSessionInput = z.infer<typeof commitStocktakeSessionSchema>;
