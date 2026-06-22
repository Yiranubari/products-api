import { z } from "zod";
import { decodeCursor } from "@/lib/cursor";

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),

  category: z.string().trim().min(1).optional(),

  direction: z.enum(["next", "prev"]).default("next"),

  cursor: z
    .string()
    .optional()
    .transform((raw) => (raw ? decodeCursor(raw) : undefined)),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
