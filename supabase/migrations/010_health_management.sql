-- ============================================================
-- 010: 보건관리 테이블 (작업환경측정, 건강진단)
-- ============================================================

-- ─── 작업환경측정 ─────────────────────────────────────────────
create table public.work_env_measurements (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  project_id      uuid references public.projects(id) on delete set null,
  doc_number      text,
  measurement_date date not null,
  agency_name     text,          -- 측정기관명
  measurement_period_start date,
  measurement_period_end   date,
  work_area       text not null default '',
  work_process    text not null default '',
  harmful_factors jsonb not null default '[]',  -- 유해인자 목록
  -- [{ factor, unit, standard, measured_value, result, action_needed }]
  overall_result  text check (overall_result in ('normal','warning','exceed','na')),
  action_items    text,
  next_due_date   date,
  status          text not null default 'draft' check (status in ('draft','completed','archived')),
  author_id       uuid not null references public.user_profiles(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index idx_work_env_company on public.work_env_measurements(company_id);
create index idx_work_env_date    on public.work_env_measurements(measurement_date desc);
create trigger trg_work_env_upd before update on public.work_env_measurements
  for each row execute function public.handle_updated_at();
alter table public.work_env_measurements enable row level security;
create policy "work_env select" on public.work_env_measurements for select using (company_id = public.my_company_id());
create policy "work_env insert" on public.work_env_measurements for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "work_env update" on public.work_env_measurements for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "work_env delete" on public.work_env_measurements for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));

-- ─── 건강진단 ─────────────────────────────────────────────────
create table public.health_checks (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  check_type      text not null check (check_type in ('general','placement','special')),
  -- general: 일반건강진단, placement: 배치전, special: 특수
  doc_number      text,
  check_date      date not null,
  agency_name     text,          -- 건강진단기관
  target_count    integer default 0,  -- 대상 인원
  completed_count integer default 0,  -- 수검 완료 인원
  records         jsonb not null default '[]',
  -- [{ name, birth_date, department, check_date, result('normal'|'observation'|'action'|'change'|'suspend'), note }]
  action_items    text,
  next_due_date   date,
  status          text not null default 'draft' check (status in ('draft','completed','archived')),
  author_id       uuid not null references public.user_profiles(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index idx_health_check_company on public.health_checks(company_id);
create index idx_health_check_type    on public.health_checks(check_type, check_date desc);
create trigger trg_health_check_upd before update on public.health_checks
  for each row execute function public.handle_updated_at();
alter table public.health_checks enable row level security;
create policy "health select" on public.health_checks for select using (company_id = public.my_company_id());
create policy "health insert" on public.health_checks for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "health update" on public.health_checks for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "health delete" on public.health_checks for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));
