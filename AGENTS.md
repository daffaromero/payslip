<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Prisma / Database rules

**NEVER manually write migration SQL files.** Always generate migrations with:

```
npx prisma migrate dev --name <short_description>
```

This updates `prisma/schema.prisma`, generates the migration SQL under `prisma/migrations/`, and regenerates the Prisma client in one step. Manual SQL files risk being malformed, skipped, or out of sync with the Prisma client.

- Changing the schema without a migration = production 500s (the column won't exist in the DB).
- `prisma migrate deploy` runs automatically on `npm run build` and `npm run start` (API), so every pending migration is applied on deploy.
- After any schema change, verify the migration file was created under `prisma/migrations/` before committing.
