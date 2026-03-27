# Roadmap

## Phase 1 — Verify Hetzner Deploy

- [ ] Seed the DB: `POST /api/seed?token=<SEED_TOKEN>`
- [ ] Log in, generate a test payslip, download PDF
- [ ] Test email send (after Resend DNS propagates)
- [ ] Test WhatsApp connect + send
- [ ] Confirm logo upload persists on the Docker volume

## Phase 2 — Frontend

APIs exist for all of these — UI is the missing piece.

- [ ] Settings: change password form
- [ ] Settings: logo upload
- [ ] Templates: `companyId` scoping on server component
- [ ] Templates: create / edit / delete custom templates from UI
- [ ] Sidebar / visual polish pass
- [ ] Mobile: login page and payslips list at minimum

## Phase 3 — Hono Backend

Required for scheduled exports and cleaner architecture. In order:

1. Scaffold `apps/api/` with Hono + Bun
2. Migrate endpoints group by group (employees → payslips → company → templates)
3. Move WhatsApp (Baileys) into the Hono process — eliminates the Next.js global singleton
4. Add `node-cron` for scheduled exports (monthly payroll XLSX via Resend / WhatsApp)
5. Remove `proxy.ts` — Hono reads JWT directly, no header-forwarding needed
6. Update `docker-compose.yml` to run both `app` (Next.js) and `api` (Hono) services
7. Migrate build tooling to Bun — natural fit with Hono, faster installs and builds

## Phase 4 — Multi-tenant & User Management

- [ ] Invite users to a company
- [ ] Role-based access (admin vs viewer)
- [ ] Multiple companies (SaaS path)
