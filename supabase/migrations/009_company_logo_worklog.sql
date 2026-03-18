-- ============================================================
-- 009: 회사 로고 + 설정 + 작업일보 분석 테이블
-- ============================================================

-- ─── 회사 테이블에 로고·설정 컬럼 추가 ──────────────────────
alter table public.companies
  add column if not exists logo_url        text,
  add column if not exists logo_name       text,
  add column if not exists doc_header_type text not null default 'logo_and_name'
    check (doc_header_type in ('logo_only','name_only','logo_and_name','custom')),
  add column if not exists doc_header_custom text,   -- custom HTML/텍스트
  add column if not exists address         text,
  add column if not exists ceo_name        text,
  add column if not exists business_number text,     -- 사업자등록번호
  add column if not exists safety_manager  text,
  add column if not exists phone           text,
  add column if not exists fax             text,
  add column if not exists updated_at      timestamptz default now();

-- ─── 작업일보 분석 ───────────────────────────────────────────
create table public.worklog_analyses (
  id                uuid primary key default uuid_generate_v4(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  project_id        uuid references public.projects(id) on delete set null,
  upload_date       date not null default current_date,
  file_name         text,
  file_url          text,
  raw_text          text,          -- 원본 텍스트
  -- AI 분석 결과
  detected_worktypes  text[]  not null default '{}',   -- 감지된 공종
  detected_keywords   text[]  not null default '{}',   -- 위험 키워드
  risk_suggestions    jsonb   not null default '[]',   -- 위험성평가 제안
  edu_suggestions     jsonb   not null default '[]',   -- 교육 제안
  workplan_suggestions jsonb  not null default '[]',   -- 작업계획서 제안
  hazard_suggestions  jsonb   not null default '[]',   -- 필요 점검 서류
  summary             text,
  note                text,
  author_id         uuid not null references public.user_profiles(id),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index idx_worklog_company on public.worklog_analyses(company_id);
create index idx_worklog_date    on public.worklog_analyses(upload_date desc);

create trigger trg_worklog_upd
  before update on public.worklog_analyses
  for each row execute function public.handle_updated_at();

alter table public.worklog_analyses enable row level security;
create policy "같은 회사 작업일보 조회"
  on public.worklog_analyses for select
  using (company_id = public.my_company_id());
create policy "manager 이상 작업일보 작성"
  on public.worklog_analyses for insert
  with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "작성자·admin 수정"
  on public.worklog_analyses for update
  using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "admin 삭제"
  on public.worklog_analyses for delete
  using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));
