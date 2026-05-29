-- ============================================================
-- EyePik Schema — Run in Supabase SQL Editor
-- ============================================================

-- Storage bucket for document files
insert into storage.buckets (id, name, public)
values ('eyepik-documents', 'eyepik-documents', true)
on conflict do nothing;

-- ── Companies ─────────────────────────────────────────────────────────────
create table if not exists public.eyepik_companies (
  id                   uuid default gen_random_uuid() primary key,
  user_id              uuid references public.profiles(id) on delete cascade not null,
  name                 text not null,
  type                 text not null check (type in ('self_employed','company')),
  vat_number           text,
  id_card_number       text,
  registration_number  text,
  address              text,
  town                 text,
  postcode             text,
  country              text default 'Malta',
  contact_email        text,
  contact_phone        text,
  fiscal_year_start    date,
  fiscal_year_end      date,
  currency             text default 'EUR',
  notes                text,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- ── Documents ─────────────────────────────────────────────────────────────
create table if not exists public.eyepik_documents (
  id                   uuid default gen_random_uuid() primary key,
  company_id           uuid references public.eyepik_companies(id) on delete cascade not null,
  user_id              uuid references public.profiles(id) on delete cascade not null,
  document_type        text not null,
  document_number      text,
  document_date        date,
  due_date             date,
  period_from          date,
  period_to            date,
  supplier_name        text,
  supplier_vat         text,
  supplier_address     text,
  customer_name        text,
  customer_vat         text,
  customer_address     text,
  subtotal             numeric(14,2),
  vat_rate             numeric(5,2),
  vat_amount           numeric(14,2),
  total_amount         numeric(14,2),
  currency             text default 'EUR',
  notes                text,
  status               text default 'pending' check (status in ('pending','ai_processed','confirmed','rejected')),
  ai_confidence        numeric(4,2),
  confirmed_by         uuid references public.profiles(id),
  confirmed_at         timestamptz,
  original_file_url    text,
  original_file_type   text,
  original_file_path   text,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- ── Change logs ───────────────────────────────────────────────────────────
create table if not exists public.eyepik_change_logs (
  id           uuid default gen_random_uuid() primary key,
  document_id  uuid references public.eyepik_documents(id) on delete cascade not null,
  user_id      uuid references public.profiles(id) on delete set null,
  reason       text,
  changes      jsonb not null default '{}',
  created_at   timestamptz default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────
create index if not exists eyepik_companies_user_id  on public.eyepik_companies(user_id);
create index if not exists eyepik_documents_company  on public.eyepik_documents(company_id);
create index if not exists eyepik_documents_user_id  on public.eyepik_documents(user_id);
create index if not exists eyepik_documents_status   on public.eyepik_documents(status);
create index if not exists eyepik_changes_doc_id     on public.eyepik_change_logs(document_id);

-- ── Updated_at triggers ───────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger eyepik_companies_updated
  before update on public.eyepik_companies
  for each row execute procedure update_updated_at();

create trigger eyepik_documents_updated
  before update on public.eyepik_documents
  for each row execute procedure update_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────
alter table public.eyepik_companies  enable row level security;
alter table public.eyepik_documents  enable row level security;
alter table public.eyepik_change_logs enable row level security;

-- Companies
create policy "company_select" on public.eyepik_companies for select
  using (auth.uid() = user_id or auth.jwt()->>'email' = 'maxmicallefa@gmail.com');
create policy "company_insert" on public.eyepik_companies for insert
  with check (auth.uid() = user_id);
create policy "company_update" on public.eyepik_companies for update
  using (auth.uid() = user_id or auth.jwt()->>'email' = 'maxmicallefa@gmail.com');
create policy "company_delete" on public.eyepik_companies for delete
  using (auth.uid() = user_id or auth.jwt()->>'email' = 'maxmicallefa@gmail.com');

-- Documents
create policy "doc_select" on public.eyepik_documents for select
  using (auth.uid() = user_id or auth.jwt()->>'email' = 'maxmicallefa@gmail.com');
create policy "doc_insert" on public.eyepik_documents for insert
  with check (auth.uid() = user_id);
create policy "doc_update" on public.eyepik_documents for update
  using (auth.uid() = user_id or auth.jwt()->>'email' = 'maxmicallefa@gmail.com');
create policy "doc_delete" on public.eyepik_documents for delete
  using (auth.uid() = user_id or auth.jwt()->>'email' = 'maxmicallefa@gmail.com');

-- Change logs
create policy "changelog_select" on public.eyepik_change_logs for select
  using (
    exists (select 1 from public.eyepik_documents d where d.id = document_id and
      (d.user_id = auth.uid() or auth.jwt()->>'email' = 'maxmicallefa@gmail.com'))
  );
create policy "changelog_insert" on public.eyepik_change_logs for insert
  with check (auth.uid() = user_id);

-- Storage policy
create policy "eyepik_upload" on storage.objects for insert
  with check (bucket_id = 'eyepik-documents' and auth.uid() is not null);
create policy "eyepik_read" on storage.objects for select
  using (bucket_id = 'eyepik-documents');
