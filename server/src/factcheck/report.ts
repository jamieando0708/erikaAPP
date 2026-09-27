import { z } from "zod";

export const VERDICTS = ["accurate", "mostly_accurate", "mixed", "misleading", "false", "unverifiable"] as const;
export const CLAIM_VERDICTS = ["supported", "partly_supported", "unsupported", "contradicted", "unverifiable"] as const;
export const TOPICS = ["fitness", "nutrition", "medical", "mental_health", "supplements", "other"] as const;

/** What the model submits through the submit_report tool. */
export const ModelReportSchema = z.object({
  topic: z.enum(TOPICS),
  overall_score: z.number().int().min(0).max(100),
  verdict: z.enum(VERDICTS),
  summary: z.string().min(1),
  claims: z
    .array(
      z.object({
        claim: z.string(),
        verdict: z.enum(CLAIM_VERDICTS),
        explanation: z.string(),
        source_urls: z.array(z.string()),
      }),
    )
    .max(12),
  useful_takeaways: z.array(z.string()),
  red_flags: z.array(z.string()),
  personal: z
    .object({
      relevance: z.enum(["helpful_for_you", "not_relevant", "use_caution", "avoid"]),
      advice: z.string(),
      cautions: z.array(z.string()),
    })
    .nullable(),
  see_a_professional: z.boolean(),
  urgent_safety_warning: z.string().nullable(),
});

export type ModelReport = z.infer<typeof ModelReportSchema>;

export interface Source {
  url: string;
  title: string;
}

export interface FactCheckReport extends ModelReport {
  sources: Source[];
}

/** JSON Schema for the strict submit_report tool. Mirrors ModelReportSchema. */
export const SUBMIT_REPORT_INPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "topic",
    "overall_score",
    "verdict",
    "summary",
    "claims",
    "useful_takeaways",
    "red_flags",
    "personal",
    "see_a_professional",
    "urgent_safety_warning",
  ],
  properties: {
    topic: { type: "string", enum: [...TOPICS] },
    overall_score: {
      type: "integer",
      description: "0-100. How accurate and trustworthy the video's health/fitness information is overall.",
    },
    verdict: { type: "string", enum: [...VERDICTS] },
    summary: {
      type: "string",
      description: "One or two short sentences in plain, friendly English (reading age ~12). No jargon.",
    },
    claims: {
      type: "array",
      description: "The main factual claims the video makes (at most 8), most important first.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["claim", "verdict", "explanation", "source_urls"],
        properties: {
          claim: { type: "string", description: "The claim, restated neutrally in a short sentence." },
          verdict: { type: "string", enum: [...CLAIM_VERDICTS] },
          explanation: { type: "string", description: "1-3 plain-English sentences on what the evidence says." },
          source_urls: {
            type: "array",
            items: { type: "string" },
            description: "URLs from your web searches that back up the explanation. Only URLs you actually found.",
          },
        },
      },
    },
    useful_takeaways: {
      type: "array",
      items: { type: "string" },
      description: "The genuinely useful, evidence-backed bits worth keeping, with the noise filtered out. May be empty.",
    },
    red_flags: {
      type: "array",
      items: { type: "string" },
      description: "Warning signs, e.g. selling a product, miracle claims, 'doctors hate this', cherry-picked studies.",
    },
    personal: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["relevance", "advice", "cautions"],
          properties: {
            relevance: { type: "string", enum: ["helpful_for_you", "not_relevant", "use_caution", "avoid"] },
            advice: { type: "string", description: "2-4 plain sentences on what this means for this person." },
            cautions: { type: "array", items: { type: "string" } },
          },
        },
        { type: "null" },
      ],
      description: "Personal guidance based on the health profile. Must be null when no profile was provided.",
    },
    see_a_professional: {
      type: "boolean",
      description: "True if this person should check with a doctor, pharmacist, dietitian or physio before acting on the video.",
    },
    urgent_safety_warning: {
      type: ["string", "null"],
      description: "Only when following the video could cause real harm (e.g. stopping medication, extreme fasting). Otherwise null.",
    },
  },
} as const;
