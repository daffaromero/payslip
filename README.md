# Payslip

Aplikasi manajemen slip gaji berbasis web untuk perusahaan Indonesia. Generate PDF slip gaji, kelola karyawan, dan kirim langsung ke email karyawan.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Prisma 5** + SQLite (LibSQL/Turso for production)
- **Puppeteer** — PDF generation via headless Chrome
- **Tailwind CSS v4**

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

```bash
cp .env.example .env
```

Minimal `.env` for local development:

```env
DATABASE_URL="file:./dev.db"
```

### 3. Database

```bash
# Create tables
npx prisma migrate dev --name init

# Seed with 5 default templates + sample company
npm run db:seed
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run db:seed` | Seed default templates & company |
| `npx prisma studio` | Visual DB browser |
| `npx prisma migrate dev` | Run migrations |

---

## Features

- **Dashboard** — employee count, payslip stats, recent activity
- **Karyawan** — manage employees with department, position, BPJS & PPh 21 status
- **Slip Gaji** — generate payslips (monthly/weekly/quarterly), download PDF
- **Template** — 5 preset PDF templates with in-browser preview
  - Formal Klasik *(default)*
  - Korporat
  - Minimalis
  - Hijau Profesional
  - Resmi Bertanda Tangan

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | `file:./dev.db` for local, `libsql://...` for Turso |
| `SMTP_HOST` | For email | SMTP server hostname |
| `SMTP_PORT` | For email | SMTP port (default: 587) |
| `SMTP_USER` | For email | SMTP username / email address |
| `SMTP_PASS` | For email | SMTP password or app password |
| `SMTP_FROM` | For email | Sender display e.g. `HR <hr@company.com>` |

### Getting SMTP credentials

- **Gmail** — enable 2FA, then create an [App Password](https://myaccount.google.com/apppasswords). Use `smtp.gmail.com` port `587`.
- **Outlook/Office 365** — use `smtp.office365.com` port `587` with your normal credentials.
- **Custom SMTP** — use whatever your hosting provider gives you.

---

## Production (Docker)

> Dockerfile coming soon. In the meantime, deploy to any Node 20+ server:

```bash
npm run build
npm run start
```

Point a reverse proxy (Nginx/Caddy) at port 3000. Use a persistent volume for `prisma/` to keep the SQLite database.

---

## Roadmap

- [x] PDF generation with 5 traditional templates
- [x] Template browser preview
- [ ] Email delivery (Nodemailer + SMTP)
- [ ] WhatsApp delivery (Fonnte / Meta Cloud API)
- [ ] Docker + one-command deployment guide
- [ ] Custom template builder
- [ ] Bulk send to all employees
- [ ] Multi-company support
