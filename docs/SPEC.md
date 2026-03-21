# AI Background Remover - MVP Specification

## 1. Product Overview

| Item | Content |
|------|---------|
| **Product Name** | AI Background Remover |
| **Positioning** | Online image background removal tool for global users |
| **Core Features** | Upload image, auto-remove background, multi-language support |
| **Business Model** | Freemium - 10 free images, then $0.5/image |
| **Target Users** | Designers, e-commerce sellers, content creators, general users |
| **Version** | v1.0.1 |
| **Live URL** | https://ai-background-remover-5h2.pages.dev |
| **API Endpoint** | https://ai-background-remover-api.lzty634158.workers.dev |

---

## 2. Functional Requirements

### 2.1 Core Features (MVP)

| Priority | Feature | Status | Description |
|----------|---------|--------|-------------|
| P0 | Image Upload | ✅ Done | Drag & drop or click to upload PNG/JPG/WebP, max 10MB |
| P0 | Background Removal | ✅ Done | Call Remove.bg API to remove image background |
| P0 | Result Download | ✅ Done | Download processed PNG image |
| P0 | Multi-language | ✅ Done | Support 7 languages (en/zh/ja/ko/es/fr/de) with auto/manual switch |
| P1 | Free Quota | ✅ Done | 10 free images for new registered users |
| P1 | Guest Trials | ✅ Done | 3 trials for unregistered users |
| P1 | User Registration | ✅ Done | Email registration/login, save usage history |
| P2 | Balance Recharge | 🔜 Planned | Users can purchase credit packages |

### 2.2 Supported Image Types

All images with a clear distinction between subject and background:

- 👤 Portraits
- 🏍️ Products / Items
- 🐱 Animals
- 🖼️ Logos / Icons
- 🚗 Cars
- 🏠 Buildings / Architecture

### 2.3 User Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Visit Home │ ──▶ │  Upload      │ ──▶ │  Process     │
└──────────────┘     └──────────────┘     └──────────────┘
                                               │
                                               ▼
                    ┌──────────────┐     ┌──────────────┐
                    │  Download    │ ◀── │  Show Result │
                    └──────────────┘     └──────────────┘
```

### 2.4 Permission Control

| User Status | Quota | Behavior When Exceeded |
|-------------|-------|------------------------|
| Guest | 3 trials | Prompt registration |
| Logged In (Free) | 10 images | Prompt recharge |
| Paid | Balance runs out | Prompt recharge |

---

## 3. Technical Architecture

### 3.1 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 + Tailwind CSS |
| Hosting | Cloudflare Pages |
| Backend | Cloudflare Workers (standalone) |
| Database | Cloudflare D1 (SQLite-compatible) |
| Image Processing | Remove.bg API |
| Authentication | Custom JWT (base64 payload) |
| Password Hashing | Web Crypto API (SHA-256) |

### 3.2 Architecture Diagram

```
User Browser
     │
     │  https://ai-background-remover-5h2.pages.dev
     │  (Next.js static site + API routes proxying to Worker)
     │
     ▼
Cloudflare Pages (Edge)
     │
     │  Frontend calls Worker URL directly
     │  (bypasses Pages Edge Functions to avoid D1 binding issues)
     │
     ▼
Cloudflare Worker  ──────────────────┐
https://ai-background-remover-api.lzty634158.workers.dev
     │
     ├── D1 Database (ai-background-remover-db)
     │       └── Tables: users, image_records, guest_trials
     │
     └── Remove.bg API (external)
             └── API Key: stored as secret_text
```

### 3.3 Key Design Decisions

- **Frontend → Worker direct**: All API calls from the frontend go directly to the standalone Worker URL (not via Pages Edge Functions), because Pages Edge Functions lack D1 bindings
- **Remove.bg for background removal**: Single API call, returns transparent PNG
- **Base64 data URL for results**: Processed image is returned as `data:image/png;base64,...` and displayed directly in browser (no R2 storage needed)

### 3.4 Directory Structure

```
project/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx       # Login page
│   │   │   └── register/page.tsx     # Register page
│   │   ├── api/                     # Proxy routes (not used in prod)
│   │   ├── page.tsx                 # Home page
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                     # Reusable UI components
│   │   ├── Upload.tsx              # Upload area
│   │   ├── Result.tsx              # Result display
│   │   ├── LanguageSwitch.tsx      # Language switcher
│   │   └── Navbar.tsx
│   ├── lib/
│   │   ├── auth.ts                 # Client-side auth calls to Worker
│   │   ├── translations.ts         # All 7 languages
│   │   └── translations.ts
│   └── types/
│       └── index.ts
├── worker/
│   ├── index.ts                    # Cloudflare Worker (D1 + Remove.bg)
│   └── wrangler.toml               # Worker config + D1 binding
├── drizzle/
│   └── schema.sql                  # D1 schema
├── wrangler.toml                    # Pages config
└── package.json
```

---

## 4. API Reference

### 4.1 Worker Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/images` | Optional | Check quota / guest trials |
| POST | `/api/images` | Optional | Upload image for processing |
| POST | `/api/auth/login` | None | Login |
| POST | `/api/auth/register` | None | Register |

### 4.2 Response Formats

**GET /api/images**
```json
// Logged in
{ "isLoggedIn": true, "remainingQuota": 9, "freeQuota": 10, "paidCredits": 0 }
// Guest
{ "isLoggedIn": false, "guestTrialsRemaining": 2 }
```

**POST /api/images**
```json
// Success
{ "success": true, "imageData": "data:image/png;base64,...", "remainingQuota": 8 }
// Error
{ "success": false, "message": "No credits left. Please login or upgrade." }
```

**POST /api/auth/register**
```json
{ "success": true, "token": "...", "user": { "id": "...", "email": "...", "freeQuota": 10 } }
```

---

## 5. Pricing Strategy

### 5.1 Package Design

| Package | Price | Quantity | Unit Price |
|---------|-------|----------|------------|
| Free | $0 | 10 images | - |
| Basic | $5 | 10 images | $0.5/image |
| Standard | $25 | 60 images | $0.42/image |
| Premium | $100 | 300 images | $0.33/image |

---

## 6. Cloudflare Resources

| Resource | ID / Name |
|----------|-----------|
| Pages Project | ai-background-remover |
| Pages Domain | ai-background-remover-5h2.pages.dev |
| Worker | ai-background-remover-api |
| Worker Domain | ai-background-remover-api.lzty634158.workers.dev |
| D1 Database | ai-background-remover-db (643d2e7e-79e2-44c1-ad6e-5d41933e12e2) |
| Remove.bg Key | Stored as Worker secret |

---

## 7. Deployment

### 7.1 Frontend (Cloudflare Pages)
- Connected to GitHub repo `lzty634158-oss/ai-background-remover`
- Auto-deploys on push to `main`
- Build command: `npm run pages:build && npm run postbuild`
- Output dir: `.vercel/output/static`

### 7.2 Backend (Cloudflare Worker)
- Deployed via `wrangler deploy` from `worker/` directory
- D1 binding: `DB` → `ai-background-remover-db`
- Secret: `REMOVE_BG_API_KEY`

---

## 8. Milestones

### Phase 1 - MVP (Week 1) ✅
- [x] Image upload and background removal
- [x] Multi-language support (7 languages)
- [x] User registration/login
- [x] Free quota control
- [x] Guest trial support
- [x] Supported image types display
- [x] Cloudflare Pages deployment
- [x] Cloudflare Worker + D1 migration

### Phase 2 - Enhancement (Week 2)
- [ ] User dashboard
- [ ] Recharge system
- [ ] Usage statistics

### Phase 3 - Growth (Week 3+)
- [ ] Custom background replacement (AI-generated backgrounds)
- [ ] SEO optimization
- [ ] Social sharing
- [ ] Batch processing

---

## 9. Changelog

### v1.0.1 (2026-03-21)
- Add supported image types hint with icons (multi-language)
- Add version number in footer
- Fix Buffer → Uint8Array for Workers compatibility
- Fix Worker error messages for debugging
- Fix frontend: use imageData (base64) instead of imageUrl
- Fix auth routes: proxy to standalone Worker URL
- Add D1 database tables
- Deploy standalone Worker with D1 binding
- Set Remove.bg API key as Worker secret

### v1.0.0 (2026-03-21)
- Initial release after Cloudflare migration
- Migrate from better-sqlite3 to Cloudflare D1 + Workers
- Fix nodejs_compat and compatibility_date flags
- Multi-language support (7 languages)

---

*Document Version: v3.0*
*Last Updated: 2026-03-21*
