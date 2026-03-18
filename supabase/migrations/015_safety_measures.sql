-- ============================================================
-- 015: 안전조치 — 보호구 지급대장·관리감독자업무·작업지휘자·구조검토도
-- ============================================================

-- ─── 보호구 지급대장 ──────────────────────────────────────────
create table public.ppe_ledger (
  id             uuid primary key default uuid_generate_v4(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  project_id     uuid references public.projects(id) on delete set null,
  doc_number     text,
  ledger_date    date not null,         -- 지급 일자
  worker_name    text not null default '',
  worker_dept    text default '',
  worker_position text default '',
  ppe_items      jsonb not null default '[]',
  -- [{ seq, name, spec, qty, condition, issued_date, return_date, serial_no, notes }]
  remarks        text,
  author_id      uuid not null references public.user_profiles(id),
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index idx_ppe_company on public.ppe_ledger(company_id);
create trigger trg_ppe_upd before update on public.ppe_ledger
  for each row execute function public.handle_updated_at();
alter table public.ppe_ledger enable row level security;
create policy "ppe select" on public.ppe_ledger for select using (company_id = public.my_company_id());
create policy "ppe insert" on public.ppe_ledger for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "ppe update" on public.ppe_ledger for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "ppe delete" on public.ppe_ledger for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));

-- ─── 관리감독자의 유해위험방지업무 ────────────────────────────
create table public.supervisor_duties (
  id             uuid primary key default uuid_generate_v4(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  project_id     uuid references public.projects(id) on delete set null,
  doc_number     text,
  -- 연계 (위험성평가 or 작업계획서)
  linked_risk_id    uuid references public.risk_assessments(id) on delete set null,
  linked_workplan_id uuid,
  work_date      date not null,
  work_location  text default '',
  supervisor_name text not null default '',
  supervisor_position text default '',
  -- 적용된 별표2 항목 목록
  duty_items     jsonb not null default '[]',
  -- [{ duty_id, workType, legalRef, category, duties[], preChecks[], checked_duties[], checked_preChecks[], deviations, actions }]
  -- 특이사항
  overall_notes  text,
  status         text not null default 'draft' check (status in ('draft','completed','archived')),
  author_id      uuid not null references public.user_profiles(id),
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index idx_sdx_company on public.supervisor_duties(company_id);
create index idx_sdx_risk    on public.supervisor_duties(linked_risk_id);
create trigger trg_sdx_upd before update on public.supervisor_duties
  for each row execute function public.handle_updated_at();
alter table public.supervisor_duties enable row level security;
create policy "sdx select" on public.supervisor_duties for select using (company_id = public.my_company_id());
create policy "sdx insert" on public.supervisor_duties for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "sdx update" on public.supervisor_duties for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "sdx delete" on public.supervisor_duties for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));

-- ─── 작업지휘자·신호수·화재감시자 지정서 ──────────────────────
create table public.work_commanders (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  project_id      uuid references public.projects(id) on delete set null,
  doc_number      text,
  commander_type  text not null check (commander_type in ('work_director','signal_person','fire_watcher')),
  -- work_director: 작업지휘자, signal_person: 신호수, fire_watcher: 화재감시자
  work_type       text not null default '',   -- 해당 작업 종류
  legal_basis     text default '',
  person_name     text not null default '',
  person_position text default '',
  person_affiliation text default '',
  work_location   text default '',
  effective_date  date not null,
  expiry_date     date,
  duties          jsonb not null default '[]', -- 직무 목록
  issuer_name     text default '',
  issuer_position text default '',
  status          text not null default 'active' check (status in ('active','expired','revoked')),
  author_id       uuid not null references public.user_profiles(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index idx_wc_company on public.work_commanders(company_id);
create trigger trg_wc_upd before update on public.work_commanders
  for each row execute function public.handle_updated_at();
alter table public.work_commanders enable row level security;
create policy "wc select" on public.work_commanders for select using (company_id = public.my_company_id());
create policy "wc insert" on public.work_commanders for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "wc update" on public.work_commanders for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "wc delete" on public.work_commanders for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));

-- ─── 구조검토 및 조립상세도 ────────────────────────────────────
create table public.structural_reviews (
  id             uuid primary key default uuid_generate_v4(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  project_id     uuid references public.projects(id) on delete set null,
  doc_number     text,
  review_type    text not null check (review_type in ('scaffold','formwork','earth_retention','other')),
  title          text not null default '',
  work_location  text default '',
  review_date    date not null,
  reviewer_name  text default '',
  reviewer_cert  text default '',   -- 자격증 정보
  -- 구조검토 내용
  design_load    text default '',   -- 설계하중
  material_spec  text default '',   -- 재료 사양
  assembly_plan  text default '',   -- 조립계획
  review_result  text default 'pass' check (review_result in ('pass','conditional','fail')),
  review_notes   text,
  -- 파일 첨부 (조립상세도)
  files          jsonb not null default '[]',
  -- [{ file_name, file_url, file_size, file_type, uploaded_at }]
  status         text not null default 'draft' check (status in ('draft','completed','archived')),
  author_id      uuid not null references public.user_profiles(id),
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
create index idx_sr_company on public.structural_reviews(company_id);
create index idx_sr_type    on public.structural_reviews(review_type);
create trigger trg_sr_upd before update on public.structural_reviews
  for each row execute function public.handle_updated_at();
alter table public.structural_reviews enable row level security;
create policy "sr select" on public.structural_reviews for select using (company_id = public.my_company_id());
create policy "sr insert" on public.structural_reviews for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "sr update" on public.structural_reviews for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "sr delete" on public.structural_reviews for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));
