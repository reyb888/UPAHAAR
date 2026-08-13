# UPAHAAR — System Architecture

## 1. Overall Architecture

UPAHAAR is a full-stack digital health wallet with a **three-tier architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT TIER (Next.js 14)                     │
│  - Next.js 14 App Router + React 18                             │
│  - Tailwind CSS, framer-motion, lucide-react, recharts           │
│  - Fully responsive; dark mode via `.dark` class on <html>        │
│  - Deployed: Vercel / static HTML output                        │
└─────────────────────▲───────────────────────────────────────────┘
                      │ HTTPS/JSON
┌─────────────────────▼───────────────────────────────────────────┐
│                    API TIER (Express.js)                        │
│  - Port: 5000 (process.env.PORT || 5000)                        │
│  - REST under /api/auth, /api/patients, /api/doctors            │
│  - SQLite3 primary DB + Sup PostgreSQL (via @supabase/js)        │
│  - Auth: bcryptjs passwords + jsonwebtoken + speakeasy 2FA       │
│  - CORS enabled; 50mb request body limit                        │
│  - Uploads served from /uploads/ (static)                       │
└─────────────────────▲───────────────────────────────────────────┘
                      │ SQL/HTTPS
┌─────────────────────▼───────────────────────────────────────────┐
│                    DATA TIER                                      │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐ │
│  │ SQLite (local)      │  │ Supabase PostgreSQL (cloud)       │ │
│  │ upahaar.db          │  │ — tables: profiles, records,      │ │
│  │                     │  │   prescriptions, medical_profiles │ │
│  └─────────────────────┘  └─────────────────────────────────┘ │
│  └─────────────────────┘  └─────────────────────────────────┘ │
│  └─────────────────────┘  └─────────────────────────────────┘ │
│                    AI MICROSERVICES (Python FastAPI)              │
│  - Port: 8000 (uvicorn)                                         │
│  - Endpoints: /extract-prescription, /generate-summary,         │
│    /check-conflicts, /generate-face-embedding                  │
│  - Mocked services for prototype; production APIs plug-compatible│
└───────────────────────────────────────────────────────────────────┘
```

## 2. Component Diagram

### 2.1 Client (Next.js App Router)
- `app/` — Route handlers (auth/, dashboard/, layout.tsx, page.tsx)
- `src/components/` — Reusable UI (buttons, cards, sidebar, QR card, feature steps)
- `src/app/` — Server components and client components
- `globals.css` — Tailwind base + dark-mode overrides with `!important`
- `tailwind.config.js` — `darkMode: 'class'`, `colors.medical` extension

### 2.2 API Layer (Express.js)
- `src/routes/authRoutes.js` — Citizen/Doctor registration & login
- `src/routes/patientRoutes.js` — Patient-facing flows (QR, timeline, vitals, pharmacy, scheduler)
- `src/routes/doctorRoutes.js` — Doctor-facing flows (patient list, patient detail/timeline)
- `src/db/sqliteSetup.js` — Database initialization, schema, migration scripts
- Middlewares: cors, json body parsing, static uploads

### 2.3 Database Layer
- **SQLite3** (`upahaar.db`) — Primary offline/store dataset; tables: users, medical_profiles, prescriptions, timeline, vitals, pharmacy, vaccines, notifications
- **Supabase PostgreSQL** — Extended features: auth flows, realtime, storage, row-level security
- **Migration approach:** Embedded SQL in `server.js` (ALTER TABLE adds columns progressively)

### 2.4 AI Microservices (FastAPI + uvicorn)
- `ai-service/main.py` — Entry point, registers all routes
- `ai-service/services/` — Individual service implementations:
  - `august_ai_service.py` — Prescription image → JSON extraction (mocked)
  - `chatgpt_service.py` — Medical history → summary (mocked GPT)
  - `face_recognition_service.py` — Face photo → embedding, compare (mocked ArcFace/FaceNet)
  - `drug_conflict_service.py` — Medicine lists → conflict/allergy check
- All services expose POST JSON endpoints under `http://localhost:8000`
- Invoked from Express backend via axios; fallback to mock data in prototype

### 2.5 Authentication & Authorization
- **Dual-flow:** separate auth for `CITIZEN` (patient) and `DOCTOR` (clinician)
- **Password:** bcryptjs hashed, stored in SQLite + Supabase auth
- **JWT:** jsonwebtoken for stateless API sessions; short-lived access + refresh
- **2FA:** speakeasy TOTP keys (optional)
- **Role middleware:** `express` route guards `/api/patients/*` vs `/api/doctors/*`

### 2.6 Data Flow — Typical User Journey
1. **Register** → POST `/api/auth/register` → bcrypt hash → JWT issued → `upahaar_theme` persisted in localStorage
2. **QR Generation** → client requests QR code → `qrcode` package → displays in `.hc-qr` card
3. **Prescription Upload** → `multer` → `/uploads/` → FastAPI `/extract-prescription` → OCR JSON → stored in SQLite
4. **Drug Conflict Check** → frontend sends current + new medicines → Express → FastAPI `/check-conflicts` → conflict list → UI badge
5. **Vitals Track** → POST to `/api/patients/vitals` → SQLite `vitals` table → recharts line chart renders
6. **Doctor View** → JWT role=doctor → `/api/doctors/patients` → patient list with timeline cards

## 3. Deployment Architecture

| Environment | Services | Notes |
|---|---|---|
| **Development** | `next dev` (port 3000) + `npm run dev` backend (port 5000) + `uvicorn main:app` (port 8000) | All three tiers run locally |
| **Production** | Next.js built + served (Vercel/Node) | Static HTML + optimized CSS |
| **AI Services** | uvicorn behind reverse proxy or separate host | Can be containerized independently |
| **Database** | SQLite file in repo + Supabase project | Sync strategy: supabase CLI or custom migration |
| **CDN / Edge** | Vercel (default) | Handles HTTPS, DNS, global cache |

## 4. Security Architecture

- **Passwords:** bcryptjs `rounds ≥ 12`; never stored in plaintext
- **API Access:** JWT signed with `process.env.JWT_SECRET`; HMAC SHA-256
- **CORS:** Configured for production domain only (origin whitelist)
- **Upload Validation:** multer `fileFilter` + MIME type check; size limit 50mb
- **SQL Injection:** Parameterized queries (pg library for Supabase; sqlite3 `?` placeholders)
- **2FA:** speakeasy TOTP, QR code displayed in UI for setup
- **XSS:** React auto-escaping + `sanitizeHtml` where user-generated content renders
- **Content Security:** `.dark` class toggling; no `eval()` in production code

## 5. Observability

- **Health endpoints:** `/health` on both Express (port 5000) and FastAPI (port 8000)
- **Logging:** `console.info` + `nodemon` auto-restart in dev; structured logs planned for prod
- **Error Tracking:** `db_errors.log` in backend root; `test_*.js` scripts for regression
- **Supabase Dashboard:** Realtime, auth metrics, storage usage

---
*Extracted from `backend/server.js`, `ai-service/main.py`, `frontend/package.json`, `backend/package.json`, `frontend/tailwind.config.js`, `DESIGN.md`, and the directory structure at `D:\Computer Science\UPAHAAR`.*