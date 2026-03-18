-- ============================================================
-- SafeDoc 산업안전보건 문서관리 플랫폼
-- 초기 DB 스키마 + RLS 정책
-- ============================================================

-- uuid 확장 활성화
create extension if not exists "uuid-ossp";

-- ─── 회사 테이블 ────────────────────────────────────────────

create table public.companies (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  biz_number    text unique,                    -- 사업자등록번호
  ceo_name      text,
  address       text,
  industry      text,
  logo_url      text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── 사용자 프로필 ──────────────────────────────────────────
-- auth.users 는 Supabase Auth가 관리, 여기는 추가 정보

create table public.user_profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  company_id    uuid references public.companies(id) on delete cascade,
  email         text not null,
  name          text not null,
  position      text not null default '',       -- 직급
  department    text,
  phone         text,
  role          text not null default 'viewer'
                  check (role in ('super_admin','company_admin','manager','viewer')),
  is_active     boolean not null default true,
  avatar_url    text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── 현장·프로젝트 ──────────────────────────────────────────

create table public.projects (
  id            uuid primary key default uuid_generate_v4(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  name          text not null,
  site_name     text not null,
  site_address  text,
  start_date    date,
  end_date      date,
  status        text not null default 'active'
                  check (status in ('active','completed','suspended')),
  created_at    timestamptz default now()
);

-- ─── 위험성평가 헤더 ────────────────────────────────────────

create table public.risk_assessments (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  project_id      uuid references public.projects(id) on delete set null,
  title           text not null,
  eval_type       text not null default 'periodic'
                    check (eval_type in ('initial','periodic','special','always_on')),
  eval_start_date date not null,
  eval_end_date   date not null,
  work_types      text[] not null default '{}',
  overview        text,
  status          text not null default 'draft'
                    check (status in ('draft','in_review','approved','archived')),
  version         integer not null default 1,
  author_id       uuid not null references public.user_profiles(id),
  reviewer_id     uuid references public.user_profiles(id),
  approver_id     uuid references public.user_profiles(id),
  approved_at     timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─── 위험성평가 항목 ────────────────────────────────────────

create table public.risk_items (
  id                    uuid primary key default uuid_generate_v4(),
  assessment_id         uuid not null references public.risk_assessments(id) on delete cascade,
  seq                   integer not null,
  work_content          text not null,
  hazard_factor         text not null,
  hazard_type           text not null default 'other'
                          check (hazard_type in
                            ('fall','entanglement','collision','fire','hazmat','electrical','ergonomic','other')),
  -- 현재 위험도
  current_probability   integer not null check (current_probability between 1 and 5),
  current_severity      integer not null check (current_severity between 1 and 5),
  current_score         integer generated always as (current_probability * current_severity) stored,
  current_level         text generated always as (
                          case
                            when (current_probability * current_severity) >= 15 then 'high'
                            when (current_probability * current_severity) >= 8  then 'medium'
                            else 'low'
                          end
                        ) stored,
  -- 감소대책
  engineering_measure   text,
  admin_measure         text,
  ppe_measure           text,
  measure_owner         text,
  measure_due_date      date,
  -- 개선 후 위험도
  residual_probability  integer check (residual_probability between 1 and 5),
  residual_severity     integer check (residual_severity between 1 and 5),
  residual_score        integer generated always as (
                          case when residual_probability is not null and residual_severity is not null
                            then residual_probability * residual_severity
                          end
                        ) stored,
  residual_level        text generated always as (
                          case
                            when (residual_probability * residual_severity) >= 15 then 'high'
                            when (residual_probability * residual_severity) >= 8  then 'medium'
                            when residual_probability is not null                  then 'low'
                          end
                        ) stored,
  -- 연계
  link_to_education     boolean not null default false,
  link_to_work_plan     boolean not null default false,
  created_at            timestamptz default now(),
  unique(assessment_id, seq)
);

-- ─── 문서 연계 로그 ─────────────────────────────────────────

create table public.document_links (
  id                uuid primary key default uuid_generate_v4(),
  source_doc_id     uuid not null,
  source_doc_type   text not null,
  target_doc_id     uuid not null,
  target_doc_type   text not null,
  link_type         text not null default 'auto' check (link_type in ('auto','manual')),
  auto_fields       jsonb not null default '{}',
  created_at        timestamptz default now()
);

-- ─── 활동계획표 ─────────────────────────────────────────────

create table public.activity_plans (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete set null,
  year        integer not null,
  month       integer not null check (month between 1 and 12),
  created_at  timestamptz default now(),
  unique(company_id, project_id, year, month)
);

create table public.activity_items (
  id                  uuid primary key default uuid_generate_v4(),
  plan_id             uuid not null references public.activity_plans(id) on delete cascade,
  activity_type       text not null,
  title               text not null,
  scheduled_date      date not null,
  is_completed        boolean not null default false,
  completed_at        timestamptz,
  linked_doc_id       uuid,
  notify_days_before  integer[] not null default '{1,3}',
  notify_email        boolean not null default true,
  created_at          timestamptz default now()
);

-- ─── 인덱스 ─────────────────────────────────────────────────

create index idx_risk_assessments_company    on public.risk_assessments(company_id);
create index idx_risk_assessments_project    on public.risk_assessments(project_id);
create index idx_risk_assessments_status     on public.risk_assessments(status);
create index idx_risk_assessments_updated    on public.risk_assessments(updated_at desc);
create index idx_risk_items_assessment       on public.risk_items(assessment_id);
create index idx_risk_items_level            on public.risk_items(current_level);
create index idx_user_profiles_company       on public.user_profiles(company_id);
create index idx_projects_company            on public.projects(company_id);

-- ─── updated_at 자동 갱신 트리거 ────────────────────────────

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_companies_updated_at
  before update on public.companies
  for each row execute function public.handle_updated_at();

create trigger trg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.handle_updated_at();

create trigger trg_risk_assessments_updated_at
  before update on public.risk_assessments
  for each row execute function public.handle_updated_at();

-- ─── 신규 사용자 프로필 자동 생성 트리거 ────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'viewer')
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── RLS 활성화 ─────────────────────────────────────────────

alter table public.companies         enable row level security;
alter table public.user_profiles     enable row level security;
alter table public.projects          enable row level security;
alter table public.risk_assessments  enable row level security;
alter table public.risk_items        enable row level security;
alter table public.document_links    enable row level security;
alter table public.activity_plans    enable row level security;
alter table public.activity_items    enable row level security;

-- ─── RLS 헬퍼 함수 ──────────────────────────────────────────

-- 현재 사용자의 company_id 반환
create or replace function public.my_company_id()
returns uuid language sql stable security definer as $$
  select company_id from public.user_profiles where id = auth.uid()
$$;

-- 현재 사용자의 role 반환
create or replace function public.my_role()
returns text language sql stable security definer as $$
  select role from public.user_profiles where id = auth.uid()
$$;

-- ─── RLS 정책: companies ────────────────────────────────────

create policy "소속 회사만 조회"
  on public.companies for select
  using (id = public.my_company_id());

create policy "company_admin만 수정"
  on public.companies for update
  using (id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));

-- ─── RLS 정책: user_profiles ────────────────────────────────

create policy "같은 회사 사용자 조회"
  on public.user_profiles for select
  using (company_id = public.my_company_id());

create policy "본인 프로필 수정"
  on public.user_profiles for update
  using (id = auth.uid());

create policy "company_admin이 사용자 생성"
  on public.user_profiles for insert
  with check (
    company_id = public.my_company_id()
    and public.my_role() in ('super_admin','company_admin')
  );

create policy "company_admin이 사용자 비활성화"
  on public.user_profiles for delete
  using (
    company_id = public.my_company_id()
    and public.my_role() in ('super_admin','company_admin')
  );

-- ─── RLS 정책: projects ─────────────────────────────────────

create policy "같은 회사 현장 조회"
  on public.projects for select
  using (company_id = public.my_company_id());

create policy "manager 이상 현장 생성"
  on public.projects for insert
  with check (
    company_id = public.my_company_id()
    and public.my_role() in ('super_admin','company_admin','manager')
  );

create policy "manager 이상 현장 수정"
  on public.projects for update
  using (
    company_id = public.my_company_id()
    and public.my_role() in ('super_admin','company_admin','manager')
  );

-- ─── RLS 정책: risk_assessments ─────────────────────────────

create policy "같은 회사 위험성평가 조회"
  on public.risk_assessments for select
  using (company_id = public.my_company_id());

create policy "manager 이상 위험성평가 작성"
  on public.risk_assessments for insert
  with check (
    company_id = public.my_company_id()
    and public.my_role() in ('super_admin','company_admin','manager')
  );

create policy "작성자·admin이 수정"
  on public.risk_assessments for update
  using (
    company_id = public.my_company_id()
    and (
      author_id = auth.uid()
      or public.my_role() in ('super_admin','company_admin')
    )
  );

create policy "admin만 삭제"
  on public.risk_assessments for delete
  using (
    company_id = public.my_company_id()
    and public.my_role() in ('super_admin','company_admin')
  );

-- ─── RLS 정책: risk_items ───────────────────────────────────

create policy "같은 회사 항목 조회"
  on public.risk_items for select
  using (
    assessment_id in (
      select id from public.risk_assessments where company_id = public.my_company_id()
    )
  );

create policy "manager 이상 항목 CRUD"
  on public.risk_items for all
  using (
    assessment_id in (
      select id from public.risk_assessments
      where company_id = public.my_company_id()
    )
    and public.my_role() in ('super_admin','company_admin','manager')
  );

-- ─── 샘플 데이터 (개발용) ────────────────────────────────────

-- 실제 배포 시 제거하세요.
-- insert into public.companies (id, name, biz_number, ceo_name, address, industry)
-- values ('11111111-0000-0000-0000-000000000001', '(주)한국건설', '123-45-67890', '홍길동', '서울시 강남구', '건설업');
