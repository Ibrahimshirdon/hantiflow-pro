import { z } from "zod";

// Requiring the exact phrase server-side is a deliberate second layer of
// defense beneath the frontend's own type-to-confirm dialog — this endpoint
// permanently deletes nearly all data in the system, so a stray/automated
// POST without the phrase must not be able to trigger it.
export const resetSystemSchema = z.object({
  confirm: z.literal("RESET EVERYTHING"),
});
export type ResetSystemInput = z.infer<typeof resetSystemSchema>;
