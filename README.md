# InternPath (InternHub) — Trusted Internship Discovery Platform for India

InternPath is a production-ready, full-stack web application architected to help undergraduate students across India discover authentic, relevant, and verified internship opportunities directly from premier institutions, central government departments, scientific research councils, and top organizations.

---

## 🎯 Project Vision & Values

- **Direct Official Linking:** Every listing redirects students straight to verified institutional domains (`.ac.in`, `.gov.in`, `.res.in`). No middleman fees or opaque application forms.
- **Strict Eligibility-First Personalization:** Recommendations are mathematically scored based on mandatory academic disciplines, undergraduate year standing, and verified prerequisites. (e.g., Medical students will not receive unrelated computer science opportunities unless multidisciplinary).
- **Zero Fabricated Listings:** Only genuine fellowships, stipends, and application deadlines from verified notification circulars.
- **Institutional Transparency:** Clear distinctions between "Official Source Verified", "Checked by InternPath", and "Pending Verification".

---

## 🚀 Key Features

1. **Intuitive Discovery & Fast Filters:**
   - Multi-faceted filtering by Academic Discipline, Source Type (IITs, NITs, IISc/IISERs, Government Ministries, Research Labs), Stipend Status (Paid, Unpaid, Not specified), Location, Delivery Format (Remote, Onsite, Hybrid), and Application Deadlines.
   - Real-time search by role title, hosting institution, required skills, or keywords.
2. **Student Profile & Personalized Matching:**
   - Fast student onboarding without mandatory intrusive questionnaires.
   - Declare academic discipline, undergraduate year, degree, technical skills, and career goals.
   - Eligibility matching engine with clear rationale explanations.
3. **Application Tracker & Saved Internships:**
   - Bookmark opportunities with personal stage tracking (`Interested`, `Planning to Apply`, `Applied`, `Not Pursuing`).
   - Personal application notes and deadline reminders.
4. **Institutional Directory & Category Hub:**
   - Curated directory of monitored Indian institutions with official domains, monitoring protocols, and verification notes.
5. **Quality Control & Community Reporting:**
   - In-app reporting modal for students to flag expired deadlines, broken URLs, or inaccurate criteria.
6. **Administrator Control Console (`/admin`):**
   - Protected interface to add and edit trusted sources.
   - Add, verify, publish, expire, or mark duplicate opportunities.
   - Monitor automated collection pipeline runs.
   - Review and resolve student error reports.

---

## 🛠️ Technology Stack

- **Framework:** Next.js 15 (App Router) with React 19 and TypeScript.
- **Styling:** Tailwind CSS with accessible semantic design and Lucide Icons.
- **Database:** PostgreSQL via Supabase (complete schemas, indexes, and triggers).
- **Security:** Supabase Row Level Security (RLS) policies and server-side validation with Zod.
- **Dual-Mode Data Architecture:** Runs seamlessly out-of-the-box in **Local Demo Mode** (persisted in browser storage with pre-seeded authentic Indian institutional opportunities) or connects directly to a live **Supabase Cloud PostgreSQL** instance via `.env.local`.

---

## 📁 Repository Structure

```
InternHub/
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout with AuthProvider & StatusBanner
│   │   ├── page.tsx                  # Homepage with Hero, Quick Filters & Featured Sections
│   │   ├── internships/
│   │   │   ├── page.tsx              # Explore Internships with live multi-faceted filters
│   │   │   └── [id]/page.tsx         # Dedicated Opportunity Details & Application warning modal
│   │   ├── categories/page.tsx       # Institutional categories & Monitored Source Directory
│   │   ├── profile/page.tsx          # Student Profile & Eligibility Recommendations
│   │   ├── saved/page.tsx            # Personal Application Tracker & Notes
│   │   ├── admin/page.tsx            # Protected Admin Console & Automation Pipeline
│   │   └── auth/
│   │       ├── login/page.tsx        # Login page with fast demo shortcuts
│   │       ├── signup/page.tsx       # Registration
│   │       └── reset-password/       # Password reset
│   ├── components/
│   │   ├── layout/                   # Navbar & Footer
│   │   ├── internships/              # InternshipCard, Filters, ReportModal
│   │   └── ui/                       # VerificationBadge, StatusBanner
│   ├── lib/
│   │   ├── supabase/                 # Browser & Server Supabase clients
│   │   ├── auth-context.tsx          # Supabase Auth + Local Demo fallback
│   │   ├── data-service.ts           # Centralized query & recommendation engine
│   │   └── validations.ts            # Zod validation schemas
│   ├── data/
│   │   └── seedData.ts               # Verified Indian institutional dataset
│   └── types/
│       └── index.ts                  # TypeScript interfaces
├── supabase/
│   └── migrations/
│       ├── 20261023000000_create_internhub_schema.sql         # PostgreSQL RLS & Schema
│       └── 20261023000001_seed_sources_and_internships.sql   # Initial SQL seed data
├── scripts/
│   └── test-internpath.ts            # Automated verification test suite (18 tests)
└── .env.example                      # Configuration template
```

---

## ⚡ Quick Start & Local Setup

### 1. Prerequisites
- Node.js 18+ (tested on Node v24.9)
- npm 9+

### 2. Installation
```bash
git clone <repo-url>
cd InternHub
npm install
```

### 3. Running Locally in Demo Mode (Zero Config Required)
You can immediately start the development server without creating a Supabase project:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
The application will boot in **Local Demo Mode**, seeded with authentic Indian opportunities (IIT Madras SFP, IIT Roorkee SPARK, NITI Aayog, MEA India, RBI Summer Placement, IISc SRFP, etc.).
- You can instantly switch between **Student** and **Admin** modes from the top notification banner or login shortcuts.

---

## 🗄️ Connecting to Live Supabase PostgreSQL

To connect to your cloud Supabase database:

1. Create a free project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
3. Fill in your project credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
   SUPABASE_SERVICE_ROLE_KEY=eyJh...
   ```
4. In the Supabase Dashboard, open the **SQL Editor** and run the SQL migration files in sequence:
   - `supabase/migrations/20261023000000_create_internhub_schema.sql` (Creates tables, triggers, and Row Level Security policies).
   - `supabase/migrations/20261023000001_seed_sources_and_internships.sql` (Loads verified Indian institutional listings).
5. Restart your development server (`npm run dev`). InternPath will automatically detect the Supabase connection!

---

## 🧪 Automated Testing

InternPath includes an automated test suite verifying data integrity, strict recommendation logic, search filters, and Zod schemas:

```bash
npm test
```

### What is tested:
- **Seed Data Quality:** Institutional domains (`.ac.in`, `.gov.in`, `.res.in`), valid application URLs, and required documentation fields.
- **Recommendation Engine:** Strict eligibility filtering ensuring medical students only receive medical/interdisciplinary opportunities, while engineering and pure science students receive matching fellowships.
- **Search & Filters:** Keyword search, combined multi-attribute filters (Paid + Remote, Unpaid governance schemes).
- **Zod Schemas:** Verification of profiles, opportunity creation, and user issue reports.
- **Duplicate Prevention:** Catching repeat submissions by official URL or title/organization pair.

---

## 🚢 Production Build

```bash
npm run build
npm run start
```
Tested and validated with Next.js 15 App Router production compilation.
