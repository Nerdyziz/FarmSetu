# FarmSetu 🌾
**Trust · Timing · Zero-Loss Transit · Fast Cash**  
*SIH 2026 · Problem Statement ID26033 · Team Vitality*

---

## 🚀 Quick Start (Demo Mode — No Supabase needed)

```bash
cd farmsetu
npm run dev
```
Open http://localhost:3000 — the app runs fully on mock data.

---

## 🔐 Connecting Supabase (Persistent Backend)

### Step 1 — Create a free Supabase account
1. Go to https://supabase.com
2. Click **Start your project** → Sign up free
3. Create a new project (choose any region)

### Step 2 — Get your credentials
1. In your project → **Settings** → **API**
2. Copy **Project URL** and **anon public** key

### Step 3 — Set up .env.local
```bash
cp .env.local.example .env.local
# Edit .env.local with your credentials
```

### Step 4 — Run the database schema
1. In Supabase Dashboard → **SQL Editor** → **New Query**
2. Paste the contents of `supabase/migrations/001_farmsetu_schema.sql`
3. Click **Run**

### Step 5 — Restart dev server
```bash
npm run dev
```

---

## 📱 4 User Portals

| Portal | URL | Description |
|---|---|---|
| 🧑‍🌾 Farmer | `/farmer/dashboard` | Simple Hindi-first UI, big icons, no graphs |
| 🏭 PACS Operator | `/operator/dashboard` | Full analytics, grade charts, Arrhenius gauges |
| 🛒 Buyer | `/buyer/browse` | Marketplace with grade-filter and escrow orders |
| 🏛️ Govt PMD | `/government/dashboard` | Dark analytical UI, price forecast, shortage alerts |

---

## 🌐 Bilingual Mode

Every page has a **🇮🇳 हिंदी / 🇬🇧 English** toggle button.  
- Farmer portal defaults to **Hindi**  
- All other portals default to **English**  
- Language state is local to each portal

---

## 🧠 Key Algorithms

### Arrhenius Shelf-Life (lib/arrhenius.ts)
```
k(T) = A × e^(−Ea / RT)
Remaining life = initial × (k_ref / k_actual)
```
Using orange kinetic parameters (Ea ≈ 80 kJ/mol). BLE telemetry drives live updates.

### Grading Simulation (lib/grading.ts)
Inputs: Brix %, blemish %, uniformity % → Grade A/B/C + SHA-256 cert  
*(Production: swap with YOLOv8 ONNX inference call — zero frontend changes needed)*

### Escrow FSM (app/api/escrow/route.ts)
```
PENDING → LOCKED → PARTIAL_RELEASED (70%) → FULLY_RELEASED
```

### TFT Forecast Mock (lib/mock-data.ts)
Returns P10/P50/P90 price bands per day for 30 days ahead with seasonal patterns.

---

## 🗂️ Project Structure

```
farmsetu/
├── app/
│   ├── page.tsx              ← Landing (role selector)
│   ├── farmer/               ← Simple Hindi-first portal
│   ├── operator/             ← Analytics-heavy PACS portal
│   ├── buyer/                ← Marketplace + escrow
│   ├── government/           ← DoCA PMD monitoring
│   └── api/                  ← grade / forecast / arrhenius / escrow
├── lib/
│   ├── i18n/                 ← Hindi + English translations
│   ├── arrhenius.ts          ← Shelf-life math
│   ├── grading.ts            ← Grade + SHA-256 cert
│   └── mock-data.ts          ← Demo data
└── supabase/migrations/      ← PostgreSQL schema
```

---

## 💡 Unit Economics (from SIH PS)
```
₹100 consumer payment:
  ₹73  → Farmer
  ₹15  → Logistics
  ₹4   → PACS / Operator
  ₹1.5 → Insurance
  ₹1.5 → Cess
  ₹5   → FarmSetu
```

---

*Built for SIH 2026 · Team Vitality · Problem Statement ID26033*
