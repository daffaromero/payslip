# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y openssl --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Copy workspace manifests first so npm ci can resolve the monorepo
COPY package*.json ./
COPY packages/core/package.json ./packages/core/
COPY prisma ./prisma

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm ci

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

# System deps required by Puppeteer's bundled Chrome
RUN apt-get update && apt-get install -y \
  openssl \
  fonts-liberation \
  libatk-bridge2.0-0 libatk1.0-0 libcups2 libdbus-1-3 \
  libgbm1 libgtk-3-0 libnspr4 libnss3 \
  libxcomposite1 libxdamage1 libxrandr2 xdg-utils \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Chrome is downloaded at first startup into the /data volume
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_CACHE_DIR=/data/.cache/puppeteer \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
