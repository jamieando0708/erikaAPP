export type Platform =
  | "tiktok"
  | "instagram"
  | "youtube"
  | "facebook"
  | "x"
  | "snapchat"
  | "threads"
  | "pinterest"
  | "reddit"
  | "other";

const HOSTS: Array<[RegExp, Platform]> = [
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
  [/(^|\.)(facebook\.com|fb\.watch|fb\.com)$/, "facebook"],
  [/(^|\.)(x\.com|twitter\.com)$/, "x"],
  [/(^|\.)snapchat\.com$/, "snapchat"],
  [/(^|\.)threads\.(net|com)$/, "threads"],
  [/(^|\.)(pinterest\.[a-z.]+|pin\.it)$/, "pinterest"],
  [/(^|\.)(reddit\.com|redd\.it)$/, "reddit"],
];

/**
 * Share sheets often hand over text like "Check this out! https://vm.tiktok.com/abc"
 * rather than a bare URL, so pull the first http(s) link out of whatever we get.
 */
export function extractUrl(shared: string): URL | null {
  const match = shared.match(/https?:\/\/[^\s<>"']+/i);
  if (!match) return null;
  try {
    const url = new URL(match[0].replace(/[).,!?]+$/, ""));
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function detectPlatform(url: URL): Platform {
  const host = url.hostname.toLowerCase();
  for (const [pattern, platform] of HOSTS) {
    if (pattern.test(host)) return platform;
  }
  return "other";
}

/** Blocks links to internal addresses so the server can't be used to probe its own network. */
export function isPublicHost(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (/^\[?[0-9a-f:]+\]?$/i.test(host) && host.includes(":")) return false; // IPv6 literal
  const v4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10 || a === 127 || a === 0 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
  }
  return true;
}
