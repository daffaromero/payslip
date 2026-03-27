# Payslip

Aplikasi manajemen slip gaji berbasis web untuk perusahaan Indonesia. Generate PDF slip gaji, kelola karyawan, dan kirim langsung ke email atau WhatsApp karyawan.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Prisma 5** + SQLite
- **Puppeteer** — PDF generation via headless Chromium
- **Baileys** — WhatsApp integration
- **Resend** — transactional email
- **Tailwind CSS v4**
- **Docker** + **Caddy** — production deployment

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### 1. Clone & install

```bash
git clone https://github.com/daffaromero/payslip.git
cd payslip
npm install
```

### 2. Environment

Create `.env.local`:

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-here"
```

### 3. Database

```bash
npx prisma migrate dev
npm run db:seed
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the seeded admin credentials.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run db:seed` | Seed templates, company, and admin user |
| `./scripts/test-api.sh` | Run full API test suite (78 tests) |
| `npx prisma studio` | Visual DB browser |
| `npx prisma migrate dev` | Run migrations |

---

## Features

- **Dashboard** — employee count, payslip stats, YTD payroll, recent activity
- **Karyawan** — manage employees (BPJS, PPh 21, bank details, WhatsApp number)
- **Slip Gaji** — generate payslips (monthly/weekly/quarterly/annual), filter, download PDF, send via email or WhatsApp
- **Generate Massal** — bulk generate for all employees with progress tracking
- **Import / Export** — import employees from Excel with column mapping, export data to XLSX
- **Template** — 5 preset PDF templates with in-browser preview
- **Pengaturan** — company profile, WhatsApp connection (QR scan via Baileys)
- **Auth** — JWT in httpOnly cookie, scoped per company, change password

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | `file:./prisma/dev.db` for local, `file:/data/payslip.db` in Docker |
| `JWT_SECRET` | Yes | Random hex string — `openssl rand -hex 32` |
| `RESEND_API_KEY` | For email | Resend API key |
| `RESEND_FROM` | For email | Sender address e.g. `noreply@yourdomain.com` |
| `ADMIN_EMAIL` | For seed | Admin user email |
| `ADMIN_PASSWORD` | For seed | Admin user password |
| `SEED_TOKEN` | For seed | Token to protect the `/api/seed` endpoint |
| `WA_SESSION_DIR` | Optional | WhatsApp session path (default: `./whatsapp-session`) |
| `UPLOAD_DIR` | Optional | Logo upload path (default: `./uploads/logos`) |
| `PUPPETEER_EXECUTABLE_PATH` | Optional | Chromium path (set automatically in Docker) |

---

## Production (Docker)

```bash
# On the VPS
cd /opt/payslip
docker compose up -d
```

First deploy — seed the database:

```bash
curl -X POST https://yourdomain.com/api/seed?token=<SEED_TOKEN>
```

See [ROADMAP.md](./ROADMAP.md) for what's coming next.
