FROM node:22-slim

# yt-dlp reads captions and descriptions from TikTok, Instagram, YouTube, etc.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 ca-certificates curl \
  && curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod +x /usr/local/bin/yt-dlp \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
EXPOSE 4000
CMD ["npx", "tsx", "src/index.ts"]
