#!/bin/sh
set -e

if [ ! -d "$PUPPETEER_CACHE_DIR/chrome" ]; then
  echo "[entrypoint] Downloading Chrome for PDF generation..."
  npx puppeteer browsers install chrome
fi

echo "[entrypoint] Running database migrations..."
npx prisma migrate deploy

echo "[entrypoint] Starting application..."
exec node_modules/.bin/next start
