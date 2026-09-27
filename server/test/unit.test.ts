import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptJson, encryptJson, hashPassword, verifyPassword } from "../src/security.js";
import { effectiveTier } from "../src/tiers.js";
import { captionsToText } from "../src/video/extract.js";
import { detectPlatform, extractUrl, isPublicHost } from "../src/video/platform.js";

describe("share links", () => {
  it("pulls the link out of share-sheet text", () => {
    const url = extractUrl("Check this out!! https://vm.tiktok.com/ZMabc123/ via @someone");
    expect(url?.toString()).toBe("https://vm.tiktok.com/ZMabc123/");
  });

  it("strips trailing punctuation", () => {
    expect(extractUrl("watch (https://youtu.be/abc).")?.toString()).toBe("https://youtu.be/abc");
  });

  it("returns null without a link", () => {
    expect(extractUrl("no link here")).toBeNull();
  });

  it.each([
    ["https://www.tiktok.com/@a/video/1", "tiktok"],
    ["https://www.instagram.com/reel/abc/", "instagram"],
    ["https://youtu.be/abc", "youtube"],
    ["https://m.facebook.com/watch?v=1", "facebook"],
    ["https://fb.watch/abc", "facebook"],
    ["https://x.com/a/status/1", "x"],
    ["https://www.threads.net/@a/post/1", "threads"],
    ["https://example.com/video", "other"],
  ])("detects %s as %s", (link, platform) => {
    expect(detectPlatform(new URL(link))).toBe(platform);
  });

  it("rejects internal addresses", () => {
    for (const link of ["http://localhost:4000", "http://127.0.0.1", "http://10.0.0.5", "http://192.168.1.1", "http://169.254.169.254", "http://[::1]/"]) {
      expect(isPublicHost(new URL(link))).toBe(false);
    }
    expect(isPublicHost(new URL("https://www.tiktok.com/x"))).toBe(true);
  });
});

describe("captions", () => {
  it("converts WebVTT to plain text and removes auto-caption repeats", () => {
    const vtt = `WEBVTT
Kind: captions
Language: en

00:00:00.000 --> 00:00:02.000
<c>Eat</c> <c>more</c> protein

00:00:02.000 --> 00:00:04.000
Eat more protein

00:00:04.000 --> 00:00:06.000
to build muscle &amp; recover`;
    expect(captionsToText(vtt)).toBe("Eat more protein to build muscle & recover");
  });
});

describe("security", () => {
  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("correct horse");
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("encrypts and decrypts JSON, and detects tampering", () => {
    const key = randomBytes(32);
    const enc = encryptJson(key, { medications: ["metformin"] });
    expect(enc).not.toContain("metformin");
    expect(decryptJson(key, enc)).toEqual({ medications: ["metformin"] });
    const tampered = Buffer.from(enc, "base64");
    tampered[tampered.length - 1]! ^= 1;
    expect(() => decryptJson(key, tampered.toString("base64"))).toThrow();
  });
});

describe("tiers", () => {
  it("falls back to free when a subscription has expired", () => {
    expect(effectiveTier("pro", Date.now() + 1000).id).toBe("pro");
    expect(effectiveTier("pro", Date.now() - 1000).id).toBe("free");
    expect(effectiveTier("bogus", null).id).toBe("free");
  });
});
