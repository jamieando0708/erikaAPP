import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { YtDlpExtractor } from "../src/video/extract.js";
import type { Transcriber } from "../src/video/transcribe.js";

/** A stand-in for yt-dlp: prints metadata, or "downloads" a file and prints its path. */
async function fakeYtDlp(info: object): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "fake-ytdlp-"));
  const script = join(dir, "yt-dlp");
  await writeFile(
    script,
    `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args.includes("--dump-single-json")) {
  process.stdout.write(${JSON.stringify(JSON.stringify(info))});
} else {
  const out = args[args.indexOf("-o") + 1].replace("%(ext)s", "m4a");
  require("fs").writeFileSync(out, "fake audio");
  process.stdout.write(out + "\\n");
}
`,
  );
  await chmod(script, 0o755);
  return script;
}

function recordingTranscriber(text: string | null) {
  const calls: Array<{ path: string; mime: string }> = [];
  const t: Transcriber = {
    transcribe: async (path, mime) => {
      calls.push({ path, mime });
      return text;
    },
  };
  return { t, calls };
}

const url = new URL("https://www.tiktok.com/@a/video/1");

describe("YtDlpExtractor speech-to-text", () => {
  it("transcribes the audio when a video has no captions", async () => {
    const bin = await fakeYtDlp({ title: "ACV hack", duration: 40 });
    const { t, calls } = recordingTranscriber("drink vinegar every morning");
    const out = await new YtDlpExtractor(bin, t).extract(url, "tiktok");
    expect(out).toMatchObject({ title: "ACV hack", transcript: "drink vinegar every morning", source: "speech" });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.mime).toBe("audio/mp4");
  });

  it("skips speech-to-text for very long videos", async () => {
    const bin = await fakeYtDlp({ title: "3 hour podcast", duration: 3 * 3600 });
    const { t, calls } = recordingTranscriber("x");
    const out = await new YtDlpExtractor(bin, t, 900).extract(url, "youtube");
    expect(out.source).toBe("metadata");
    expect(calls).toHaveLength(0);
  });

  it("still returns metadata when no transcriber is configured", async () => {
    const bin = await fakeYtDlp({ title: "No captions", description: "desc" });
    const out = await new YtDlpExtractor(bin).extract(url, "tiktok");
    expect(out).toMatchObject({ title: "No captions", transcript: null, source: "metadata" });
  });
});
