import { getShareExtensionKey } from "expo-share-intent";

// When the app is opened from the share sheet, send it straight to the share screen.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) return "/share";
    return path;
  } catch {
    return "/";
  }
}
