import { z } from "zod";

const list = z.array(z.string().trim().min(1).max(120)).max(30).default([]);

export const HealthProfileSchema = z.object({
  /** A label like "Me" or "Mum" - never sent to the AI. */
  displayName: z.string().trim().min(1).max(40).default("Me"),
  age: z.number().int().min(13).max(120).nullable().default(null),
  sex: z.enum(["female", "male", "intersex", "prefer_not_to_say"]).default("prefer_not_to_say"),
  heightCm: z.number().min(50).max(260).nullable().default(null),
  weightKg: z.number().min(20).max(400).nullable().default(null),
  pregnant: z.boolean().default(false),
  conditions: list,
  medications: list,
  allergies: list,
  injuries: list,
  fitnessLevel: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  goals: list,
  notes: z.string().trim().max(1000).default(""),
});

export type HealthProfile = z.infer<typeof HealthProfileSchema>;

/** The subset the AI sees. Drops the display name. */
export function profileForAi(p: HealthProfile) {
  const { displayName: _omit, ...rest } = p;
  return rest;
}
