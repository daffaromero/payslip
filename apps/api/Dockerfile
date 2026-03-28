# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y openssl --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Copy workspace manifests so npm ci can resolve the monorepo
COPY package*.json ./
COPY packages/core/package.json ./packages/core/
COPY apps/api/package.json ./apps/api/
COPY prisma ./prisma

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm ci

COPY src ./src
COPY apps/api ./apps/api
COPY packages ./packages
COPY tsconfig.json ./

RUN npx prisma generate

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM oven/bun:1-debian AS runner
WORKDIR /app

# Chromium + system deps for Puppeteer PDF generation
RUN apt-get update && apt-get install -y \
  openssl \
  chromium \
  fonts-liberation \
  libatk-bridge2.0-0 libatk1.0-0 libcups2 libdbus-1-3 \
  libgbm1 libgtk-3-0 libnspr4 libnss3 \
  libxcomposite1 libxdamage1 libxrandr2 xdg-utils \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PORT=3001 \
    HOSTNAME=0.0.0.0

# Create non-root user (Debian uses groupadd/useradd, not addgroup/adduser)
# Wrap crashpad handler to supply --database argument if it exists
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs apiuser \
  && if [ -f /usr/lib/chromium/chrome_crashpad_handler ]; then \
       mv /usr/lib/chromium/chrome_crashpad_handler /usr/lib/chromium/chrome_crashpad_handler.real \
       && printf '#!/bin/sh\nmkdir -p /tmp/chromium-crash\nexec /usr/lib/chromium/chrome_crashpad_handler.real --database=/tmp/chromium-crash "$@"\n' \
          > /usr/lib/chromium/chrome_crashpad_handler \
       && chmod +x /usr/lib/chromium/chrome_crashpad_handler \
       && ln -sf /usr/lib/chromium/chrome_crashpad_handler /usr/bin/chrome_crashpad_handler; \
     fi

COPY --from=builder --chown=apiuser:nodejs /app/package*.json ./
COPY --from=builder --chown=apiuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=apiuser:nodejs /app/packages ./packages
COPY --from=builder --chown=apiuser:nodejs /app/apps/api ./apps/api
COPY --from=builder --chown=apiuser:nodejs /app/src ./src
COPY --from=builder --chown=apiuser:nodejs /app/tsconfig.json ./
COPY --from=builder --chown=apiuser:nodejs /app/prisma ./prisma

USER apiuser
EXPOSE 3001
CMD ["bun", "run", "apps/api/src/index.ts"]
