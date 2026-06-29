import { z } from "zod";

export const createSubmissionSchema = z.object({
  quantity: z.coerce.number().positive(),
});
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;

export const rejectSubmissionSchema = z.object({
  reason: z.string().optional(),
});
export type RejectSubmissionInput = z.infer<typeof rejectSubmissionSchema>;
