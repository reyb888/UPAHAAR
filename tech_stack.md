# UPAHAAR — Tech Stack

Full-stack digital health wallet: **Next.js 14 frontend + Express.js backend + Python FastAPI AI microservices**, with **SQLite ↔ Supabase PostgreSQL** dual-database support and Supabase Auth.

---

## 1. Frontend

| Layer | Technology | Version | Notes |
|---|---|---|---|
| **Framework** | Next.js | 14.2.3 | App Router |
| **UI Library** | React | ^18 | Client + Server Components |
| **Language** | TypeScript | ^5 | strict-ish, `@types/*` |
| **Styling** | Tailwind CSS | ^3.4.1 | `darkMode: 'class'`; extends `colors.medical` |
| **CSS Post-processing** | PostCSS / Autoprefixer | ^8 / ^10.5 | |
| **Animations** | framer-motion | ^11.1.9 | dashboard transitions, reveals |
| **Icons** | lucide-react | ^0.378.0 | monoline, stroke 1.8 |
| **Charts** | recharts | ^3.9.0 | vitals line/area charts |
| **QR Generation** | qrcode + @types/qrcode | ^1.5.4 / ^1.5.6 | local QR health card (width 600, ECC M) |
| **HTTP Client** | axios | ^1.6.8 | |
| **Fonts** | next/font/google | — | Inter (body), Sora (display) |

### Key frontend conventions
- Dark mode via `.dark` class on `<html>`, persisted in `localStorage` key `upahaar_theme`; auth pages force light.
- API base from `NEXT_PUBLIC_API_URL` (default `http://localhost:5000`); token stored as `upahaar_token`.
- Fully responsive; no horizontal scroll below 720px; sidebar collapses to top nav on small screens.

### Pages
- **Auth:** citizen/doctor × login, register, forgot-password, email-confirm (`/auth/*`).
- **Citizen dashboard:** timeline + uploads, QR card, vitals, notifications, pharmacy finder, vaccines, profile setup, settings.
- **Doctor dashboard:** patient list → patient detail (`/dashboard/doctor/patient/[id]`).
- **Landing:** static `frontend/public/landing.html`.
- **Shared components:** `CitizenSidebar`, `GoogleTranslate`, `TwoFactorSetup`, `VitalChart`.

## 2. Backend

| Layer | Technology | Version | Notes |
|---|---|---|---|
| **Runtime** | Node.js | — | ES modules (`"type": "module"`) |
| **Framework** | Express.js | ^4.18.2 | REST API gateway, port `PORT \|\| 5000` |
| **Database — Primary** | PostgreSQL (Supabase) | via `pg` ^8.22 | used when `DATABASE_URL` is set |
| **Database — Fallback** | SQLite3 | ^5.1.6 | `backend/src/db/upahaar.db` |
| **Auth (identity)** | Supabase Auth | via `@supabase/supabase-js` ^2.112.1 | sign-up / email confirmation / sign-in |
| **Auth (session)** | jsonwebtoken | ^9.0.2 | JWT `expiresIn: 5h` |
| **Password hashing** | bcryptjs | ^2.4.3 | salt rounds 10 |
| **2FA** | speakeasy + qrcode | ^2.0.0 / ^1.5.4 | TOTP, QR setup |
| **File upload** | multer | ^1.4.5-lts.1 | memory storage, 5 MB, JPG/PNG/WEBP/PDF |
| **Email** | nodemailer | ^9.0.5 | SMTP password-reset OTP (Gmail app passwords, SendGrid, Mailtrap, custom) |
| **LLM** | @google/generative-ai | ^0.11.1 | `gemini-2.5-flash`, primary + backup keys |
| **IDs** | uuid | ^9.0.1 | UUID v4 for rows, `UPHR-XXXXXXXXXX` for users |
| **Environment** | dotenv | ^16.3.1 | `backend/.env` |
| **Dev** | nodemon | ^3.0.1 | `npm run dev` |

### API surface
- **Auth** (`/api/auth`): `register`, `confirm`, `login`, `forgot-password`, `reset-password`, `2fa/generate`, `2fa/turn-on`.
- **Patients** (`/api/patients`): `profile` (GET/PUT), `prescriptions` (POST/DELETE), `timeline`, `prescriptions/:id/remove-medicine`, `pharmacies`, `notifications` (GET + acknowledge/revoke/delete), `vitals` (GET/POST).
- **Doctors** (`/api/doctors`): `scan/:upahaar_id`, `scan/:upahaar_id/ai-search`, `scan-face`, `access-status/:request_id`, `close-access`.
- **Health:** `GET /health`.

### Middleware
- `authMiddleware.js` — `auth` (Bearer JWT) + `requireRole(['CITIZEN' | 'DOCTOR'])`.
- `uploadMiddleware.js` — multer memory storage with MIME allowlist.

### Database adapter
`sqliteSetup.js` exports a `db` object (`run`/`get`/`all`) that auto-selects:
- **PostgreSQL** via `pg.Pool` when `DATABASE_URL` is set (converts `?` → `$1` placeholders, `DATETIME` → `TIMESTAMP`),
- **SQLite** otherwise.

Tables: `users`, `medical_profiles`, `prescriptions`, `access_logs`, `revoked_access`, `vitals`, `password_reset_tokens`. Schema evolution via idempotent migrations in `server.js` + `sqliteSetup.js`.

## 3. AI / Machine Learning Microservices

| Layer | Technology | Version | Notes |
|---|---|---|---|
| **Framework** | FastAPI | (requirements.txt) | Python |
| **Runtime** | uvicorn | — | `main:app`, port 8000, `--reload` |
| **Data models** | pydantic | — | request schemas |
| **File uploads** | python-multipart | — | prescription/face files |
| **HTTP** | requests | — | for upstream AI APIs |

### Endpoints (`ai-service/main.py`)
| Endpoint | Purpose | Backing service (mocked) |
|---|---|---|
| `GET /health` | liveness | — |
| `POST /extract-prescription` | prescription image/PDF → JSON | August AI (`august_ai_service.py`) |
| `POST /generate-summary` | medical history → summary | ChatGPT (`chatgpt_service.py`) |
| `POST /check-conflicts` | new meds vs current meds + allergies | custom logic (`drug_conflict_service.py`) |
| `POST /generate-face-embedding` | face photo → embedding | ArcFace/FaceNet (`face_recognition_service.py`) |

> **Note:** all AI services are currently **mocked prototypes**. The Express backend calls them over HTTP (`http://localhost:8000`); production providers are plug-compatible.

## 4. Data & Infra

| Service | Purpose | Notes |
|---|---|---|
| **Supabase** | Auth, PostgreSQL, storage, realtime, RLS | anon + service-role clients in `utils/supabaseClient.js` |
| **Supabase trigger** | `auth.users` → `public.users`/`medical_profiles` sync | `supabase_trigger.sql`, SECURITY DEFINER |
| **RLS migration** | Row Level Security on all public tables | `supabase/migrations/20260812000000_enable_rls.sql` |
| **Geoapify Places** | nearby-pharmacy lookup | `GEOAPIFY_API_KEY` |
| **Google Gemini** | doctor-side medical summary | primary + backup API keys |
| **SMTP** | password-reset OTP emails | nodemailer; console-log fallback in dev |
| **Vercel / Render** | frontend / backend hosting | env-driven config |

## 5. Development & Tooling

| Category | Tool | Notes |
|---|---|---|
| **Package manager** | npm | frontend + backend workspaces |
| **Linting** | `next lint` (eslint) | frontend script |
| **DB scripting** | `sqlite3` CLI, `pg` scripts | `query_db.js`, `query_pg.js` |
| **QA scripts** | `test_*.js` | register / login / scan / full-flow smoke tests |
| **Utilities** | `clear_users.js` | dev-only DB reset ("fresh start" nuke) |
| **Logging** | `db_errors.log` | backend query errors |
| **Version control** | git | GitHub: `reyb888/UPAHAAR` |

## 6. Environment variables (`backend/.env`)

See `backend/.env.example`:

```
PORT=5000
DATABASE_URL=          # Supabase Postgres connection string (else SQLite)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # required for password-reset sync to Supabase Auth
GEMINI_API_KEY=
GEMINI_BACKUP_API_KEY=
GEOAPIFY_API_KEY=
JWT_SECRET=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

Frontend uses `NEXT_PUBLIC_API_URL` (default `http://localhost:5000`).

---

*Source of truth: `frontend/package.json`, `backend/package.json`, `backend/.env.example`, `ai-service/requirements.txt`, `ai-service/main.py`, `backend/server.js`, `backend/src/db/sqliteSetup.js`, `supabase/`, and `DESIGN.md`.*