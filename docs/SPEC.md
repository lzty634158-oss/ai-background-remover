# AI Background Remover - MVP Specification

## 1. Product Overview

| Item | Content |
|------|---------|
| **Product Name** | AI Background Remover |
| **Positioning** | Online image background removal tool for global users |
| **Core Features** | Upload image, auto-remove background, multi-language support |
| **Business Model** | Freemium - 10 free images, then $0.5/image |
| **Target Users** | Designers, e-commerce sellers, content creators, general users |

---

## 2. Functional Requirements

### 2.1 Core Features (MVP)

| Priority | Feature | Description |
|----------|---------|-------------|
| P0 | Image Upload | Drag & drop or click to upload PNG/JPG/WebP, max 10MB |
| P0 | Background Removal | Call Remove.bg API to remove image background |
| P0 | Result Download | Download processed PNG image |
| P0 | Multi-language | Support 7 languages with auto/manual switch |
| P1 | Free Quota | 10 free images for new users, then paid |
| P1 | User Registration | Email registration/login, save usage history |
| P1 | Balance Recharge | Users can purchase credit packages |

### 2.2 User Flow

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

### 2.3 Permission Control

| User Status | Free Quota | Behavior When Exceeded |
|-------------|------------|------------------------|
| Not Logged In | 0 | Prompt registration |
| Logged In (Unpaid) | 10 | Prompt recharge |
| Paid | Balance runs out | Prompt recharge |

---

## 3. Technical Architecture

### 3.1 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 + Tailwind CSS |
| Backend | Next.js API Routes |
| Database | SQLite (via better-sqlite3) |
| Image Processing | Remove.bg API |
| Authentication | JWT |
| Payment | Stripe (International) / Alipay (China) |

### 3.2 Directory Structure

```
project/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/page.tsx
│   │   │   └── history/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── images/route.ts
│   │   │   └── user/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/           # Reusable UI components
│   │   ├── Upload.tsx
│   │   ├── Result.tsx
│   │   ├── LanguageSwitch.tsx
│   │   └── Pricing.tsx
│   ├── lib/
│   │   ├── db.ts         # Database connection
│   │   ├── auth.ts       # Authentication utilities
│   │   └── translations.ts
│   └── types/
│       └── index.ts
├── public/
│   └── results/
└── data/                 # SQLite database file
```

---

## 4. Pricing Strategy

### 4.1 Package Design

| Package | Price | Quantity | Unit Price |
|---------|-------|----------|------------|
| Free | $0 | 10 images | - |
| Basic | $5 | 10 images | $0.5/image |
| Standard | $25 | 60 images | $0.42/image |
| Premium | $100 | 300 images | $0.33/image |

---

## 5. Page Design

### 5.1 Home Page

- Top: Language switch button
- Center: Upload area (drag & drop + click)
- Below upload: Supported image types
- Bottom: Pricing packages link

### 5.2 User Dashboard

- Remaining free quota / remaining credits
- Recharge入口
- Usage history
- Profile settings

---

## 6. Milestones

### Phase 1 - MVP (Week 1)
- [x] Image upload and background removal
- [x] Multi-language support
- [ ] User registration/login
- [ ] Free quota control
- [ ] Payment integration

### Phase 2 - Enhancement (Week 2)
- [ ] User dashboard
- [ ] Recharge system
- [ ] Usage statistics

### Phase 3 - Growth (Week 3+)
- [ ] SEO optimization
- [ ] Social sharing
- [ ] Batch processing

---

*Document Version: v2.0*
*Last Updated: 2026-03-18*
