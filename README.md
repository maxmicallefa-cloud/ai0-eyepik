# ai0-eyepik 📄

AI-powered Maltese accountancy document management. Part of the AI0 suite.

## Features
- Company profiles (Self-Employed or Limited Company)
- Upload documents (image or PDF)
- Claude Vision AI reads and extracts all fields automatically
- User confirms or corrects AI output
- Full audit trail / change logs per document
- All Maltese document types (tax invoices, VAT returns, FS3/5/7, IT returns, payslips, bank statements, and more)
- CSV export of confirmed documents
- Per-user data, Max sees all companies (SuperAdmin)

## Setup

1. Run `supabase_eyepik.sql` in Supabase SQL Editor
2. Copy `.env.example` to `.env` and fill in all values including `VITE_ANTHROPIC_API_KEY`
3. Add GitHub Secrets (same Cloudflare + Supabase secrets as other apps, plus `VITE_ANTHROPIC_API_KEY`)
4. Push to `main` → Cloudflare auto-deploys

## GitHub Secrets needed
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_LANDING_URL`
- `VITE_ANTHROPIC_API_KEY`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Dev
```bash
npm install
npm run dev
```

## Stack
- React + Vite
- Supabase (PostgreSQL + RLS + Storage)
- Claude Vision API (document OCR)
- Cloudflare Pages
