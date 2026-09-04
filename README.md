# UPAHAAR

**Unified Permanent Account for Healthcare Access & Authorization Registry**

*(Hindi: "upahaar" = "a gift")*

UPAHAAR is a full-stack digital health wallet for India. It gives every citizen one portable, consent-controlled medical identity — a QR "health card" — that connects patients, doctors, pharmacies, and health records in a single secure platform. Instead of records living "in a shoebox," everything (prescriptions, vitals, allergies, vaccine schedule, medical timeline) lives in one verified account the patient controls.

---

## Table of Contents

- [Features](#features)
- [Roles](#roles)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Flow](#data-flow)
- [Database Schema](#database-schema)
- [Security](#security)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Status & Roadmap](#status--roadmap)

---

## Features

| Capability | Description |
|---|---|
| **Unified health identity** | Every citizen gets a unique `UPHR-XXXXXXXXXX` ID and a scannable QR health card |
| **Medical wallet** | Centralized medical profile: DOB, blood group, allergies, family history, vision, mental health, emergency contacts, and more |
| **Prescription management** | Upload prescription images/PDFs; OCR-extracted data stored on the medical timeline |
| **Medical timeline** | Chronological history of prescriptions + vitals, viewable by the citizen and (with consent) by doctors |
| **Vitals tracking** | Record heart rate, blood sugar, BP; rendered as charts (recharts) |
| **Consent-based doctor access** | Doctor scans the patient's QR → access is auto-approved or pending-approval; the citizen can approve, revoke, or block any doctor |
| **Access audit log** | Every QR scan / access event is logged (`access_logs`) and shown as notifications to the citizen |
| **Pharmacy finder** | Nearby-pharmacy lookup via Geoapify Places |
| **Vaccine scheduler** | Vaccine tracking/scheduling page |
| **Face recognition (prototype)** | Doctor-side face-scan identity verification (ArcFace/FaceNet, mocked) |
| **Drug conflict check (prototype)** | Warns on allergic reactions / drug interactions (mocked AI) |
| **AI summarization** | Gemini-powered summary of a patient's medical history for doctors |
| **2FA + password reset** | TOTP two-factor auth, email-OTP password reset via SMTP |
| **Multilingual** | Google Translate widget baked into auth pages |

## Roles

- **CITIZEN** — patient. Owns a medical profile, QR card, timeline, vitals, notifications, pharmacy finder, vaccine scheduler, settings.
- **DOCTOR** — clinician. Scans patient QR / face, searches patients by UPAHAAR ID, views patient timeline (with an approved access session), closes/expires access.
- **SUPER_ADMIN** — reserved role in schema (not yet built out in UI).

## Architecture

Three-tier architecture with dedicated AI microservices:

```
┌──────────────────────────────────────────────┐
│  CLIENT  — Next.js 14 (App Router) + React 18 │
│  Tailwind CSS, framer-motion, recharts,       │
│  lucide-react, qrcode                         │
└───────────────────────▲──────────────────────┘
                        │ HTTPS/JSON
┌───────────────────────▼──────────────────────┐
│  API  — Express.js (Node, ES modules)         │
│  /api/auth, /api/patients, /api/doctors       │
│  JWT auth + role middleware, multer uploads   │
└───────────────────────▲──────────────────────┘
                        │ SQL
┌───────────────────────▼──────────────────────┐
│  DATA — SQLite (local, fallback)              │
│  OR  Supabase PostgreSQL (production,         │
│  via DATABASE_URL + pg) + Supabase Auth       │
└────────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│  AI — Python FastAPI (uvicorn, port 8000)     │
│  /extract-prescription, /generate-summary,    │
│  /check-conflicts, /generate-face-embedding   │
│  (mock services; production-ready to swap)    │
└──────────────────────────────────────────────┘
```

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS, framer-motion, recharts, lucide-react, qrcode
- **Backend:** Express.js (Node, ES modules), JWT auth, multer
- **Database:** SQLite (dev fallback) / Supabase PostgreSQL (production) with Supabase Auth + Row Level Security
- **AI Services:** Python FastAPI (uvicorn) — OCR, LLM summarization (Gemini), face recognition, drug conflict checks
- **Other integrations:** Geoapify Places API (pharmacy finder), nodemailer/SMTP (email OTP), speakeasy (TOTP 2FA), Google Translate widget

## Project Structure

```
UPAHAAR/
├── frontend/            Next.js 14 client
│   ├── src/app/         App Router pages (auth/, dashboard/, components/)
│   ├── src/app/auth/    citizen & doctor login/register/forgot-password/confirm
│   ├── src/app/dashboard/citizen/   timeline, qr-card, vitals, notifications,
│   │                                 pharmacy-finder, vaccines, profile-setup, settings
│   ├── src/app/dashboard/doctor/    patient list + patient detail
│   ├── src/app/components/          CitizenSidebar, GoogleTranslate,
│   │                                TwoFactorSetup, VitalChart
│   └── public/landing.html          marketing/landing page
├── backend/             Express.js API gateway
│   ├── server.js        entrypoint, migrations, static /uploads
│   ├── src/routes/      authRoutes, patientRoutes, doctorRoutes
│   ├── src/controllers/ auth, patient, doctor controllers
│   ├── src/db/          sqliteSetup.js (SQLite ⟷ PostgreSQL adapter), upahaar.db
│   ├── src/middlewares/ authMiddleware (JWT + roles), uploadMiddleware (multer)
│   ├── src/utils/       gemini.js, emailService.js (nodemailer), supabaseClient.js
│   └── *.js             dev/QA scripts (test_*.js, query_*.js, clear_users.js)
├── ai-service/          Python FastAPI microservices
│   ├── main.py          routes: extract-prescription, generate-summary,
│   │                    check-conflicts, generate-face-embedding
│   └── services/        august_ai, chatgpt, face_recognition, drug_conflict (mocked)
├── supabase/            migrations (RLS) + supabase_trigger.sql (auth sync)
├── DESIGN.md            design-system/theme spec (tokens, type, motion, components)
├── system_architecture.md  architecture deep-dive
└── SESSION_CACHE.md     dev session notes/investigations
```

## Data Flow

1. **Register** → `POST /api/auth/register` → Supabase Auth sign-up (SQLite fallback) → DB trigger syncs to `public.users` + initializes `medical_profiles`.
2. **Login** → email or UPAHAAR ID + password (bcrypt) → optional TOTP → JWT (`expiresIn: 5h`).
3. **QR card** → generated locally with the `qrcode` package (width 600, ECC M) — no external QR service.
4. **Prescription upload** → `multer` (5 MB, JPG/PNG/WEBP/PDF) → optional FastAPI `/extract-prescription` OCR → stored in `prescriptions` (with `medicines` + `raw_ocr_text`).
5. **Doctor access** → QR scan is auto-approved (`QR_SCAN`/`APPROVED`); manual/face lookup creates a `PENDING` request the citizen approves/revokes. Approved sessions expire after 30 minutes.
6. **Vitals** → `POST /api/patients/vitals` → `vitals` table → recharts chart.
7. **AI summary** → doctor requests `/scan/:id/ai-search` → backend calls Gemini (`gemini-2.5-flash`, primary + backup keys) → summary returned.

## Database Schema

Core tables: `users`, `medical_profiles`, `prescriptions`, `access_logs`, `revoked_access` (blocklist), `vitals`, `password_reset_tokens`.

- **Dual-backend adapter:** `sqliteSetup.js` exposes `db.run/get/all` that transparently run against PostgreSQL (when `DATABASE_URL` is set, converting `?` → `$1`) or SQLite (local `upahaar.db`).
- **Migrations** are embedded as idempotent `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE` statements.
- **Supabase Auth sync** via `supabase_trigger.sql` (`handle_new_user` on `auth.users` → inserts into `public.users` / `medical_profiles`).
- **RLS** enabled on all tables (`supabase/migrations/20260812000000_enable_rls.sql`) so the Supabase anon key can't read/modify patient data; the backend `postgres` superuser bypasses RLS.

## Security

- bcrypt password hashing; JWTs (`JWT_SECRET`); optional TOTP 2FA (speakeasy).
- Role-gated routes (`requireRole(['CITIZEN'|'DOCTOR'])`).
- Multer MIME-type allowlist (JPG/PNG/WEBP/PDF) + 5 MB limit; 50 MB JSON body cap.
- Parameterized SQL everywhere; `db_errors.log` for query failures.
- Row Level Security on Supabase; masked email in password-reset responses.

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+ (for the AI microservices)
- A Supabase project (optional for local dev — SQLite fallback works out of the box)

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/UPAHAAR.git
cd UPAHAAR
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in your values — see Environment Variables below
npm run dev             # starts on :5000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev              # starts on :3000
```

### 4. AI service

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload   # starts on :8000
```

## Environment Variables

Configured via `backend/.env` (see `backend/.env.example`):

| Variable | Purpose |
|---|---|
| `PORT` | Backend server port |
| `DATABASE_URL` | Supabase/Postgres connection string (omit to use local SQLite) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `GEMINI_API_KEY` / `GEMINI_BACKUP_API_KEY` | Google Gemini API keys for AI summarization |
| `GEOAPIFY_API_KEY` | Geoapify Places API key for pharmacy finder |
| `JWT_SECRET` | Secret for signing JWTs |
| SMTP settings | Used by nodemailer for email OTP / password reset |

> ⚠️ Never commit your `.env` file. Keep secrets out of version control.

## Deployment

| Service | Dev | Prod |
|---|---|---|
| Frontend | `next dev` (:3000) | `next build` / `next start` (Vercel) |
| Backend | `npm run dev` (:5000) | Render / Node — `DATABASE_URL` points at Supabase Postgres |
| AI service | `uvicorn main:app --reload` (:8000) | Independent host/container |
| Database | SQLite `upahaar.db` | Supabase PostgreSQL + Auth |

## Status & Roadmap

- ✅ Production database is Supabase Postgres (data persists across Render redeploys); local SQLite is a dev fallback.
- ✅ RLS migration applied and verified (anon key locked out; `postgres` superuser bypasses RLS).
- ✅ Recent work: local QR generation fix, forgot-password flow (SMTP + OTP + Supabase Auth password sync), revocation/consent flow fixes, RLS enablement.
- 🚧 AI microservices are mocked prototypes — real OCR/LLM/face-recognition providers (August AI, ChatGPT/Gemini, ArcFace/FaceNet) are plug-compatible and pending integration.
- 🚧 `SUPER_ADMIN` role is reserved in the schema but not yet built out in the UI.

---

## Contributing

Contributions, issues, and feature requests are welcome. Feel free to open an issue or submit a pull request.

## License

_Add your license here (e.g. MIT, Apache 2.0)._
