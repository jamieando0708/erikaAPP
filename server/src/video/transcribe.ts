import { readFile } from "node:fs/promises";

export interface Transcriber {
  /** Turns the speech in an audio/video file into text. Returns null if nothing was said. */
  transcribe(filePath: string, mimeType: string): Promise<string | null>;
}

interface DeepgramResponse {
  results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> };
}

/**
 * Speech-to-text via Deepgram (https://deepgram.com). Accepts the audio or video
 * file as-is (mp4, m4a, webm, ...), so no ffmpeg is needed.
 */
export class DeepgramTranscriber implements Transcriber {
  constructor(
    private readonly apiKey: string,
    private readonly model = "nova-3",
  ) {}

  async transcribe(filePath: string, mimeType: string): Promise<string | null> {
    const params = new URLSearchParams({ model: this.model, smart_format: "true", detect_language: "true" });
    const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
      method: "POST",
      headers: { Authorization: `Token ${this.apiKey}`, "Content-Type": mimeType },
      body: await readFile(filePath),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      throw new Error(`Deepgram ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const data = (await res.json()) as DeepgramResponse;
    const text = data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim();
    return text ? text : null;
  }
}

const MIME_BY_EXT: Record<string, string> = {
  m4a: "audio/mp4",
  mp4: "video/mp4",
  webm: "audio/webm",
  weba: "audio/webm",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  wav: "audio/wav",
  aac: "audio/aac",
  mov: "video/quicktime",
};

export function mimeForFile(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}
