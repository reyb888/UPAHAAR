# UPAHAAR — Tech Stack

## 1. Frontend

| Layer | Technology | Version / Notes |
|---|---|---|
| **Framework** | Next.js | 14.2.3 (App Router) |
| **UI Library** | React | 18.2.2 |
| **Styling** | Tailwind CSS | 3.4.1 (with `darkMode: 'class'`) |
| **Animations** | framer-motion | 11.1.9 |
| **Icons** | lucide-react | 0.378.0 |
| **Charts** | recharts | 3.9.0 |
| **QR Generation** | qrcode | 1.5.4 |
| **HTTP Client** | axios | 1.6.8 |
| **Forms** | React Hook Form (implied) | — |

### Key Frontend Conventions
- `darkMode: 'class'` — toggle `document.documentElement.classList`, persisted key `upahaar_theme`
- All pages responsive; no horizontal scroll below 720px
- Tailwind config extends `colors.medical` (`blue: #2563EB`, `light: #DBEAFE`, `dark: #1E3A8A`)
- `globals.css` contains dark-mode overrides with `!important` for `.dark` class
- `next/font/google` used for `Inter` (body) and `Sora` (display)

## 2. Backend

| Layer | Technology | Version / Notes |
|---|---|---|
| **Runtime** | Node.js | — |
| **Framework** | Express.js | 4.18.2 |
| **Language** | JavaScript (ES modules) | `"type": "module"` in `package.json` |
| **Database — Primary** | SQLite3 | 5.1.6 via `sqlite3` |
| **Database — Cloud** | Supabase (PostgreSQL) | via `@supabase/supabase-js` |
| **Auth** | bcryptjs, jsonwebtoken, speakeasy | Password hashing, JWTs, 2FA keys |
| **File Upload** | multer | `uploads/` directory served statically |
| **Environment** | dotenv | — |

### Key Backend Conventions
- API prefix: `/api/auth`, `/api/patients`, `/api/doctors`
- Health endpoint: `/health`
- PORT: `process.env.PORT || 5000`
- CORS enabled for all origins
- Request body limit: `50mb` (JSON + URL-encoded)
- Migration scripts embedded in `server.js` for schema evolution

## 3. AI / Machine Learning Services

| Layer | Technology | Version / Notes |
|---|---|---|
| **Framework** | FastAPI | Python |
| **Runtime** | uvicorn | — |
| **Prescription Extraction** | August AI (mocked) | `services/august_ai_service.py` |
| **Medical Summarization** | ChatGPT (mocked) | `services/chatgpt_service.py` |
| **Face Recognition** | ArcFace / FaceNet (mocked) | `services/face_recognition_service.py` |
| **Drug Conflict Check** | Custom logic | `services/drug_conflict_service.py` |

### AI Service Conventions
- All services expose REST POST endpoints under `http://localhost:8000`
- Health check: `GET /health` → `{"status": "AI Microservices running"}`
- Services are invoked from the Express backend via axios
- Mock implementations for prototype; production APIs ready to swap in

## 4. Development & Tooling

| Category | Tool | Notes |
|---|---|---|
| **Package Manager** | npm | — |
| **Type Checking** | TypeScript | 5.x (frontend) |
| **CSS Post-processing** | PostCSS | 8.x |
| **Linting** | next lint / eslint | — |
| **Database CLI** | sqlite3 CLI | For SQLite operations |
| **API Testing** | Supabase dashboard, raw SQL | — |
| **Version Control** | git | — |

## 5. Third-Party Integrations

| Service | Purpose | Notes |
|---|---|---|
| **Supabase** | Auth, PostgreSQL, storage, realtime | `@supabase/supabase-js` |
| **Google Generative AI** (mocked) | LLM summarization | `main.py` references |
| **August AI** (mocked) | Prescription OCR/extraction | Prototype service |
| **ArcFace / FaceNet** (mocked) | Face embeddings / comparison | Prototype service |

---
*Extracted from `frontend/package.json`, `backend/package.json`, `ai-service/main.py`, `backend/server.js`, `frontend/tailwind.config.js`, and `DESIGN.md`.*