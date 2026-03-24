-- ============================================================
-- 012: 산업안전보건위원회·노사협의체 + 안전보건관리규정 + 도급사업
-- ============================================================

-- ─── 산업안전보건위원회 / 노사협의체 회의록 ───────────────────
create table public.safety_committee_minutes (
  id               uuid primary key default uuid_generate_v4(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  project_id       uuid references public.projects(id) on delete set null,
  doc_number       text,
  committee_type   text not null default 'safety_committee'
    check (committee_type in ('safety_committee','labor_management')),
  -- safety_committee: 산업안전보건위원회, labor_management: 노사협의체
  meeting_type     text not null default 'regular'
    check (meeting_type in ('regular','extraordinary')),
  meeting_date     date not null,
  meeting_start    time, meeting_end  time,
  meeting_place    text not null default '',
  chairman_name    text not null default '',   -- 의장/위원장
  members          jsonb not null default '[]',
  -- [{ seq, name, position, affiliation, side('labor'|'management'), is_present }]
  agenda_items     jsonb not null default '[]',
  -- [{ seq, title, content, decision, owner, deadline }]
  resolution       text,
  next_meeting_date date,
  status           text not null default 'draft'
    check (status in ('draft','completed','archived')),
  author_id        uuid not null references public.user_profiles(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index idx_sc_company on public.safety_committee_minutes(company_id);
create index idx_sc_date    on public.safety_committee_minutes(meeting_date desc);
create trigger trg_sc_upd before update on public.safety_committee_minutes
  for each row execute function public.handle_updated_at();
alter table public.safety_committee_minutes enable row level security;
create policy "sc select" on public.safety_committee_minutes for select using (company_id = public.my_company_id());
create policy "sc insert" on public.safety_committee_minutes for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "sc update" on public.safety_committee_minutes for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "sc delete" on public.safety_committee_minutes for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));

-- ─── 안전보건관리규정 ─────────────────────────────────────────
create table public.safety_regulations (
  id               uuid primary key default uuid_generate_v4(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  doc_number       text,
  version          integer not null default 1,
  title            text not null default '안전보건관리규정',
  effective_date   date not null,
  revision_reason  text,   -- 개정 사유 (최초 제정인 경우 '최초 제정')
  -- 규정 본문 (섹션별)
  sections         jsonb not null default '[]',
  -- [{ seq, chapter, title, content }]
  -- 승인
  approver_name    text,
  approver_position text,
  approved_date    date,
  status           text not null default 'draft'
    check (status in ('draft','active','superseded','archived')),
  author_id        uuid not null references public.user_profiles(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index idx_sreg_company on public.safety_regulations(company_id);
create index idx_sreg_ver     on public.safety_regulations(version desc);
create trigger trg_sreg_upd before update on public.safety_regulations
  for each row execute function public.handle_updated_at();
alter table public.safety_regulations enable row level security;
create policy "sreg select" on public.safety_regulations for select using (company_id = public.my_company_id());
create policy "sreg insert" on public.safety_regulations for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "sreg update" on public.safety_regulations for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "sreg delete" on public.safety_regulations for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));

-- ─── 도급 > 적격 수급업체 선정 자료 ──────────────────────────
create table public.subcontract_vendors (
  id               uuid primary key default uuid_generate_v4(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  project_id       uuid references public.projects(id) on delete set null,
  doc_number       text,
  vendor_name      text not null default '',
  vendor_ceo       text,
  vendor_business_number text,
  vendor_address   text,
  work_type        text not null default '',   -- 도급 공종
  contract_start   date,
  contract_end     date,
  evaluation_date  date not null,
  -- 선정 평가 항목
  eval_items       jsonb not null default '[]',
  -- [{ category, item, score, max_score, note }]
  total_score      numeric(5,2),
  is_qualified     boolean not null default false,
  disqualify_reason text,
  evaluator_name   text,
  evaluator_position text,
  status           text not null default 'draft'
    check (status in ('draft','completed','archived')),
  author_id        uuid not null references public.user_profiles(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index idx_vendor_company on public.subcontract_vendors(company_id);
create trigger trg_vendor_upd before update on public.subcontract_vendors
  for each row execute function public.handle_updated_at();
alter table public.subcontract_vendors enable row level security;
create policy "vendor select" on public.subcontract_vendors for select using (company_id = public.my_company_id());
create policy "vendor insert" on public.subcontract_vendors for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "vendor update" on public.subcontract_vendors for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "vendor delete" on public.subcontract_vendors for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));

-- ─── 도급 > 안전 및 보건에 관한 정보제공 ────────────────────
create table public.subcontract_safety_info (
  id               uuid primary key default uuid_generate_v4(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  project_id       uuid references public.projects(id) on delete set null,
  doc_number       text,
  vendor_name      text not null default '',
  provision_date   date not null,
  work_type        text not null default '',
  -- 제공 정보 항목 (산안법 시행규칙 제83조)
  info_items       jsonb not null default '[]',
  -- [{ category, item, content, doc_attached }]
  receiver_name    text,    -- 수령자 (수급인 대표)
  receiver_sign    boolean default false,
  provider_name    text,
  provider_position text,
  status           text not null default 'draft'
    check (status in ('draft','completed','archived')),
  author_id        uuid not null references public.user_profiles(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index idx_sinfo_company on public.subcontract_safety_info(company_id);
create trigger trg_sinfo_upd before update on public.subcontract_safety_info
  for each row execute function public.handle_updated_at();
alter table public.subcontract_safety_info enable row level security;
create policy "sinfo select" on public.subcontract_safety_info for select using (company_id = public.my_company_id());
create policy "sinfo insert" on public.subcontract_safety_info for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "sinfo update" on public.subcontract_safety_info for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "sinfo delete" on public.subcontract_safety_info for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));
