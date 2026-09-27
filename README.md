# Sift

**Cut through the noise. Understand your health.**

Fact-check health and fitness videos, posts and claims from social media. See a video on TikTok, Instagram, YouTube, Facebook or X, tap **Share → Sift** (or paste a link, post or claim), and get:

- a simple **score out of 100** and a verdict (Accurate, Mostly accurate, Mixed, Misleading, False)
- each **claim** checked against real evidence, with **sources**
- the **useful bits worth keeping**, with the noise filtered out
- **red flags** (selling a product, miracle claims, etc.)
- on Plus and Pro, **what it means for you**, based on your own health profile

> Sift gives general information, not medical advice. It always tells people to talk to a professional before changing medication or treatment.

## What's in this repo

| Folder | What it is |
| --- | --- |
| `mobile/` | The iPhone + Android app (Expo / React Native). Appears in the phone's Share menu. |
| `server/` | The backend API: accounts, encrypted health profiles, fact-checking, subscriptions. |

### How a fact-check works

1. The app sends the shared link to the server.
2. The server reads the video's caption and title with [yt-dlp](https://github.com/yt-dlp/yt-dlp), and works out what's **said** in it: from the video's captions when it has them, otherwise with **speech-to-text** ([Deepgram](https://deepgram.com)). For speech-to-text only the audio is downloaded, and it's deleted straight after. Articles are read by the AI directly, and pasted posts or claims are checked as they are.
3. Claude (Anthropic's AI) finds the claims, **searches the web** for strong evidence (health agencies, clinical guidelines, research) and writes a plain-English report.
4. Any source the AI cites that didn't come from a real search result is thrown away, so sources can't be made up.

## Brand

The app follows the Sift brand book: Midnight `#0B0F12`, Teal `#00D1B2`, Sage `#7ED3C6`, Sand `#EDEBE6`, Slate `#A7B0B8`, with Plus Jakarta Sans for headlines and Inter for body text. Colours, fonts and verdict styles live in `mobile/src/lib/theme.ts`, and the pulse logo in `mobile/src/components/Logo.tsx`. App icons and the splash screen are in `mobile/assets/`.

## Plans

| Plan | Price | Includes |
| --- | --- | --- |
| Free trial | $0 | 3 checks a month |
| Basic | $10/mo | 30 checks a month |
| Plus | $20/mo | Unlimited checks* + personal advice from your health profile |
| Pro | $40/mo | Everything in Plus + family profiles (up to 4 people) + reports to share with your doctor |

\* "Unlimited" plans have a fair-use cap (300 a month on Plus, 1,000 on Pro) so AI costs can't run away. Change these in `server/src/tiers.ts`.

## Privacy (built to GDPR standard)

- Health data needs **explicit, plain-language consent** first, and it's optional.
- Health profiles and results are **encrypted at rest** (AES-256-GCM).
- Only the relevant health details go to the AI, never the person's name or email.
- Users can **download** all their data, **withdraw consent** (deletes health data) or **delete their account** from Settings.
- Passwords are hashed with scrypt. Login tokens are stored hashed, and in the phone's secure keychain.

## Try it on your computer

You need [Node.js 22](https://nodejs.org).

**1. Start the server in demo mode** (no API key needed; results are fake and labelled `[DEMO RESULT]`):

```bash
cd server
npm install
npm run demo
```

**2. Start the app** in a second terminal:

```bash
cd mobile
npm install
npx expo start --web     # opens in your browser
```

The Share-menu feature only works in a real phone build (see below). In the browser, paste a link instead.

**3. Use real fact-checks:** copy `server/.env.example` to `server/.env`, add your `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY` and a `HEALTH_DATA_KEY`, install [yt-dlp](https://github.com/yt-dlp/yt-dlp#installation), then run `npm run dev`.

## Run it on a phone

The Share-menu integration uses native code, so it can't run in Expo Go. Build a development app:

```bash
cd mobile
npx expo run:ios        # needs a Mac with Xcode
npx expo run:android    # needs Android Studio
# or build in the cloud with no Mac needed:
npx eas-cli@latest build --profile development
```

Set `EXPO_PUBLIC_API_URL` to your server's address for real builds.

## Going live checklist

- [ ] **Name and branding.** "Sift" and the `com.sifthealth.app` bundle ID are placeholders (`mobile/app.json`).
- [ ] **Apple Developer** ($99/yr) and **Google Play** ($25 one-off) accounts.
- [ ] **Subscriptions.** Apple and Google require their own in-app billing for app subscriptions. Create the three products (`sift_basic_monthly`, `sift_plus_monthly`, `sift_pro_monthly`) in both stores, connect them in [RevenueCat](https://www.revenuecat.com), set the RevenueCat keys in the app (`EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY`), point RevenueCat's webhook at `/billing/revenuecat/webhook`, and set `BILLING_MODE=revenuecat`.
- [ ] **Hosting.** Deploy `server/` (a Dockerfile is included) with a persistent disk for the database, or move to managed Postgres as you grow.
- [ ] **Legal.** A privacy policy and terms of service, reviewed by a lawyer, and a data processing agreement with Anthropic (health data is "special category" data under GDPR). Check whether personal health advice needs extra approval in your launch countries.
- [ ] **Speech-to-text.** Create a [Deepgram](https://deepgram.com) account and set `DEEPGRAM_API_KEY` so Sift can hear videos without captions. It costs roughly half a cent per minute of video. Videos over 15 minutes aren't transcribed (change with `MAX_TRANSCRIBE_SECONDS`).

## Development

```bash
cd server && npm test          # AI and speech-to-text are mocked, so no API costs
cd server && npm run typecheck
cd mobile && npx tsc --noEmit
```
