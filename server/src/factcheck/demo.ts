import type { FactChecker, FactCheckInput } from "./claude.js";
import type { VideoContent, VideoExtractor } from "../video/extract.js";
import type { FactCheckReport } from "./report.js";

/**
 * DEMO_MODE=1: returns a clearly-labelled sample report without calling the AI,
 * so the app can be tried and developed without an API key. Never use in production.
 */
export class DemoFactChecker implements FactChecker {
  async check(input: FactCheckInput): Promise<FactCheckReport> {
    await new Promise((r) => setTimeout(r, 3000));
    return {
      topic: "nutrition",
      overall_score: 42,
      verdict: "misleading",
      summary: "[DEMO RESULT] Apple cider vinegar won't 'melt' belly fat, but diluted vinegar is mostly safe for healthy adults.",
      claims: [
        {
          claim: "A shot of apple cider vinegar every morning burns belly fat.",
          verdict: "unsupported",
          explanation: "A few small studies found tiny weight changes at most. There's no good evidence it targets belly fat.",
          source_urls: ["https://www.nhs.uk/live-well/healthy-weight/"],
        },
        {
          claim: "Vinegar can lower blood sugar after meals.",
          verdict: "partly_supported",
          explanation: "Some studies show a small drop in blood sugar after meals, but the effect is modest.",
          source_urls: [],
        },
      ],
      useful_takeaways: ["Always dilute vinegar in water to protect your teeth and throat."],
      red_flags: ["The creator links to their own vinegar gummies.", "Uses the phrase 'melts fat'."],
      personal: input.profile
        ? {
            relevance: input.profile.medications.length ? "use_caution" : "not_relevant",
            advice: input.profile.medications.length
              ? "Because you take medication, ask your pharmacist before taking vinegar every day - it can affect blood sugar and potassium."
              : "This is unlikely to help your goals much. Regular activity and balanced meals will do far more.",
            cautions: input.profile.medications.length ? ["Can interact with diabetes and heart medications."] : [],
          }
        : null,
      see_a_professional: Boolean(input.profile?.medications.length),
      urgent_safety_warning: null,
      sources: [{ url: "https://www.nhs.uk/live-well/healthy-weight/", title: "NHS - Healthy weight" }],
    };
  }
}

/** DEMO_MODE=1: pretends every link is the same sample video. */
export class DemoExtractor implements VideoExtractor {
  async extract(): Promise<VideoContent> {
    return {
      title: "Drink THIS every morning to melt belly fat 🔥",
      description: "Apple cider vinegar shot every morning. Link in bio for my ACV gummies!",
      creator: "demo_fitness_creator",
      durationSec: 42,
      transcript: "One shot of apple cider vinegar every morning melts belly fat and fixes your blood sugar.",
      source: "captions",
    };
  }
}
