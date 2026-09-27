import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { Platform } from "./platform.js";
import { mimeForFile, type Transcriber } from "./transcribe.js";

const execFileAsync = promisify(execFile);

export interface VideoContent {
  title: string | null;
  description: string | null;
  creator: string | null;
  durationSec: number | null;
  /** What was said in the video, from captions or speech-to-text. Null when unavailable. */
  transcript: string | null;
  source: "captions" | "speech" | "metadata" | "none";
}

export interface VideoExtractor {
  extract(url: URL, platform: Platform): Promise<VideoContent>;
}

const MAX_TRANSCRIPT_CHARS = 60_000;

interface YtDlpTrack {
  ext: string;
  url: string;
}
interface YtDlpInfo {
  title?: string;
  description?: string;
  uploader?: string;
  channel?: string;
  duration?: number;
  subtitles?: Record<string, YtDlpTrack[]>;
  automatic_captions?: Record<string, YtDlpTrack[]>;
}

/**
 * Reads a video's caption, title and what's said in it, using yt-dlp (supports
 * TikTok, Instagram, YouTube, Facebook, X and many more).
 *
 * What was said comes from the video's captions when it has them. Otherwise, if a
 * transcriber is configured, the audio is downloaded to a temp folder, turned into
 * text, and deleted. Falls back to public oEmbed endpoints if yt-dlp fails.
 */
export class YtDlpExtractor implements VideoExtractor {
  constructor(
    private readonly ytDlpPath: string,
    private readonly transcriber: Transcriber | null = null,
    private readonly maxTranscribeSeconds = 15 * 60,
  ) {}

  async extract(url: URL, platform: Platform): Promise<VideoContent> {
    try {
      const { stdout } = await execFileAsync(
        this.ytDlpPath,
        ["--dump-single-json", "--skip-download", "--no-playlist", "--no-warnings", url.toString()],
        { timeout: 45_000, maxBuffer: 50 * 1024 * 1024 },
      );
      const info = JSON.parse(stdout) as YtDlpInfo;
      const base = {
        title: info.title ?? null,
        description: info.description ?? null,
        creator: info.uploader ?? info.channel ?? null,
        durationSec: info.duration ?? null,
      };
      const captions = await fetchCaptions(info);
      if (captions) return { ...base, transcript: captions, source: "captions" };

      const tooLong = info.duration !== undefined && info.duration > this.maxTranscribeSeconds;
      if (this.transcriber && !tooLong) {
        const speech = await this.transcribeAudio(url).catch((err: Error) => {
          console.warn(`speech-to-text failed for ${platform}: ${err.message.split("\n")[0]}`);
          return null;
        });
        if (speech) return { ...base, transcript: speech.slice(0, MAX_TRANSCRIPT_CHARS), source: "speech" };
      }
      return { ...base, transcript: null, source: "metadata" };
    } catch (err) {
      console.warn(`yt-dlp failed for ${platform}: ${(err as Error).message.split("\n")[0]}`);
      return oEmbedFallback(url, platform);
    }
  }

  private async transcribeAudio(url: URL): Promise<string | null> {
    const dir = await mkdtemp(join(tmpdir(), "sift-audio-"));
    try {
      const { stdout } = await execFileAsync(
        this.ytDlpPath,
        [
          // Smallest useful download: audio only when the site offers it, else the whole video.
          "-f",
          "bestaudio[filesize<60M]/bestaudio/best[filesize<150M]/best",
          "--max-filesize",
          "150M",
          "--no-playlist",
          "--no-warnings",
          "-o",
          join(dir, "media.%(ext)s"),
          "--print",
          "after_move:filepath",
          "--no-simulate",
          url.toString(),
        ],
        { timeout: 120_000, maxBuffer: 1024 * 1024 },
      );
      const file = stdout.trim().split("\n").pop();
      if (!file) return null;
      return await this.transcriber!.transcribe(file, mimeForFile(file));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}

function pickTrack(tracks: Record<string, YtDlpTrack[]> | undefined): YtDlpTrack | null {
  if (!tracks) return null;
  const langs = Object.keys(tracks);
  const lang =
    langs.find((l) => l === "en") ?? langs.find((l) => l.startsWith("en")) ?? langs[0];
  if (!lang) return null;
  const list = tracks[lang] ?? [];
  return list.find((t) => t.ext === "vtt") ?? list.find((t) => t.ext === "srt") ?? null;
}

async function fetchCaptions(info: YtDlpInfo): Promise<string | null> {
  const track = pickTrack(info.subtitles) ?? pickTrack(info.automatic_captions);
  if (!track) return null;
  try {
    const res = await fetch(track.url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    const text = captionsToText(await res.text());
    return text ? text.slice(0, MAX_TRANSCRIPT_CHARS) : null;
  } catch {
    return null;
  }
}

/** Converts WebVTT/SRT into plain text, dropping timings, tags and the repeated lines auto-captions produce. */
export function captionsToText(raw: string): string {
  const out: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (
      !t ||
      t === "WEBVTT" ||
      /^(Kind|Language|NOTE|STYLE)\b/.test(t) ||
      /^\d+$/.test(t) ||
      t.includes("-->")
    ) {
      continue;
    }
    const clean = t.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
    if (clean && clean !== out[out.length - 1]) out.push(clean);
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}

const OEMBED: Partial<Record<Platform, string>> = {
  tiktok: "https://www.tiktok.com/oembed?url=",
  youtube: "https://www.youtube.com/oembed?format=json&url=",
};

async function oEmbedFallback(url: URL, platform: Platform): Promise<VideoContent> {
  const empty: VideoContent = {
    title: null,
    description: null,
    creator: null,
    durationSec: null,
    transcript: null,
    source: "none",
  };
  const endpoint = OEMBED[platform];
  if (!endpoint) return empty;
  try {
    const res = await fetch(endpoint + encodeURIComponent(url.toString()), {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return empty;
    const data = (await res.json()) as { title?: string; author_name?: string };
    return { ...empty, title: data.title ?? null, creator: data.author_name ?? null, source: "metadata" };
  } catch {
    return empty;
  }
}
