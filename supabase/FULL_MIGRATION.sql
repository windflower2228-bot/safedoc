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
-- ============================================================
-- 002: 안전보건교육일지 테이블 추가
-- ============================================================

-- ─── 안전보건교육일지 헤더 ────────────────────────────────────

create table public.education_journals (
  id                  uuid primary key default uuid_generate_v4(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  project_id          uuid references public.projects(id) on delete set null,

  -- 소스 문서 (위험성평가 연계)
  source_risk_id      uuid references public.risk_assessments(id) on delete set null,
  link_type           text not null default 'manual'
                        check (link_type in ('auto_from_risk', 'manual')),

  -- 교육 기본정보
  title               text not null,
  edu_type            text not null default 'regular'
                        check (edu_type in (
                          'onboarding',   -- 채용 시 교육
                          'regular',      -- 정기교육
                          'special',      -- 특별교육
                          'job_specific', -- 작업내용 변경 교육
                          'accident',     -- 사고 후 교육
                          'other'
                        )),
  edu_date            date not null,
  edu_start_time      time,
  edu_end_time        time,
  edu_duration_hours  numeric(4,1),        -- 교육 시간 (시간)
  edu_location        text,

  -- 강사 정보
  instructor_name     text,
  instructor_position text,
  instructor_affil    text,                -- 소속기관

  -- 내용
  edu_content         text,               -- 교육 내용 요약
  edu_items           jsonb not null default '[]', -- 교육 항목 배열

  -- 참석자
  attendees           jsonb not null default '[]',
  attendee_count      integer default 0,

  -- 상태
  status              text not null default 'draft'
                        check (status in ('draft','completed','archived')),
  author_id           uuid not null references public.user_profiles(id),

  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ─── 교육일지 항목 (위험요인별 교육내용) ─────────────────────

-- edu_items JSON 스키마:
-- [
--   {
--     "seq": 1,
--     "source_risk_item_id": "uuid | null",   ← 위험성평가 항목 ID
--     "work_content":    "작업 내용",
--     "hazard_factor":   "유해·위험요인",
--     "hazard_type":     "fall | fire | ...",
--     "risk_level":      "high | medium | low",
--     "edu_point":       "교육 핵심 포인트",
--     "legal_basis":     "산업안전보건법 제○○조",
--     "countermeasure":  "감소대책 요약"
--   }
-- ]

-- ─── 참석자 JSON 스키마 ─────────────────────────────────────

-- attendees JSON 스키마:
-- [
--   {
--     "seq": 1,
--     "name": "홍길동",
--     "position": "용접공",
--     "department": "철골팀",
--     "sign": null   ← 서명 URL (추후)
--   }
-- ]

-- ─── 인덱스 ──────────────────────────────────────────────────

create index idx_education_journals_company    on public.education_journals(company_id);
create index idx_education_journals_risk       on public.education_journals(source_risk_id);
create index idx_education_journals_date       on public.education_journals(edu_date desc);
create index idx_education_journals_status     on public.education_journals(status);

-- ─── updated_at 트리거 ───────────────────────────────────────

create trigger trg_education_journals_updated_at
  before update on public.education_journals
  for each row execute function public.handle_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────

alter table public.education_journals enable row level security;

create policy "같은 회사 교육일지 조회"
  on public.education_journals for select
  using (company_id = public.my_company_id());

create policy "manager 이상 교육일지 작성"
  on public.education_journals for insert
  with check (
    company_id = public.my_company_id()
    and public.my_role() in ('super_admin','company_admin','manager')
  );

create policy "작성자·admin이 수정"
  on public.education_journals for update
  using (
    company_id = public.my_company_id()
    and (
      author_id = auth.uid()
      or public.my_role() in ('super_admin','company_admin')
    )
  );

create policy "admin만 삭제"
  on public.education_journals for delete
  using (
    company_id = public.my_company_id()
    and public.my_role() in ('super_admin','company_admin')
  );
-- ============================================================
-- 003: 작업계획서 테이블 추가
-- ============================================================

create table public.work_plans (
  id                  uuid primary key default uuid_generate_v4(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  project_id          uuid references public.projects(id) on delete set null,
  source_risk_id      uuid references public.risk_assessments(id) on delete set null,
  link_type           text not null default 'manual'
                        check (link_type in ('auto_from_risk', 'manual')),

  -- 기본정보
  title               text not null,
  plan_type           text not null default 'other'
                        check (plan_type in (
                          'height','excavation','crane','confined',
                          'demolition','electrical','welding',
                          'chemical','heavy_equip','other'
                        )),
  work_location       text not null default '',
  work_start_date     date not null,
  work_end_date       date not null,
  work_start_time     time,
  work_end_time       time,
  work_scope          text,           -- 작업 범위·개요
  legal_basis         text,           -- 관계 법령

  -- 작업 책임자
  supervisor_name     text,
  supervisor_position text,
  supervisor_phone    text,

  -- 종합 안전대책
  safety_summary      text,

  -- JSON 배열
  risk_items          jsonb not null default '[]',
  workers             jsonb not null default '[]',

  -- 상태
  status              text not null default 'draft'
                        check (status in ('draft','approved','archived')),
  author_id           uuid not null references public.user_profiles(id),
  approved_by         uuid references public.user_profiles(id),
  approved_at         timestamptz,

  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- risk_items JSON 스키마:
-- [{
--   seq, source_risk_item_id, work_content, hazard_factor,
--   hazard_type, risk_level, risk_score,
--   engineering_measure, admin_measure, ppe_measure,
--   measure_owner, measure_due_date,
--   work_method, equipment_needed, worker_count,
--   check_items
-- }]

-- workers JSON 스키마:
-- [{ seq, name, position, role, license }]

create index idx_work_plans_company    on public.work_plans(company_id);
create index idx_work_plans_risk       on public.work_plans(source_risk_id);
create index idx_work_plans_date       on public.work_plans(work_start_date desc);
create index idx_work_plans_type       on public.work_plans(plan_type);

create trigger trg_work_plans_updated_at
  before update on public.work_plans
  for each row execute function public.handle_updated_at();

alter table public.work_plans enable row level security;

create policy "같은 회사 작업계획서 조회"
  on public.work_plans for select
  using (company_id = public.my_company_id());

create policy "manager 이상 작업계획서 작성"
  on public.work_plans for insert
  with check (
    company_id = public.my_company_id()
    and public.my_role() in ('super_admin','company_admin','manager')
  );

create policy "작성자·admin이 수정"
  on public.work_plans for update
  using (
    company_id = public.my_company_id()
    and (author_id = auth.uid()
         or public.my_role() in ('super_admin','company_admin'))
  );

create policy "admin만 삭제"
  on public.work_plans for delete
  using (
    company_id = public.my_company_id()
    and public.my_role() in ('super_admin','company_admin')
  );
-- ============================================================
-- 004: 지정서·선임서 테이블
-- ============================================================

create table public.designations (
  id                uuid primary key default uuid_generate_v4(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  project_id        uuid references public.projects(id) on delete set null,

  doc_type          text not null default 'designation'
                      check (doc_type in ('designation','appointment')),
  role_id           text not null,
  role_label        text not null,
  doc_number        text,                    -- 문서 번호

  -- 피지정자
  person_name       text not null,
  person_id_last4   text,                    -- 주민번호 뒷자리 (선택)
  person_address    text,
  person_dept       text,
  person_position   text not null default '',

  -- 지정 내용
  legal_basis       text not null default '',
  duties            jsonb not null default '[]',  -- string[]
  effective_date    date not null,
  expiry_date       date,
  work_scope        text,

  -- 지정권자
  issuer_name       text not null default '',
  issuer_position   text not null default '',
  issuer_company    text not null default '',

  status            text not null default 'active'
                      check (status in ('active','expired','revoked')),
  author_id         uuid not null references public.user_profiles(id),

  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index idx_designations_company   on public.designations(company_id);
create index idx_designations_status    on public.designations(status);
create index idx_designations_doc_type  on public.designations(doc_type);
create index idx_designations_role      on public.designations(role_id);

create trigger trg_designations_updated_at
  before update on public.designations
  for each row execute function public.handle_updated_at();

alter table public.designations enable row level security;

create policy "같은 회사 지정서 조회"
  on public.designations for select
  using (company_id = public.my_company_id());

create policy "manager 이상 지정서 작성"
  on public.designations for insert
  with check (
    company_id = public.my_company_id()
    and public.my_role() in ('super_admin','company_admin','manager')
  );

create policy "작성자·admin이 수정"
  on public.designations for update
  using (
    company_id = public.my_company_id()
    and (author_id = auth.uid()
         or public.my_role() in ('super_admin','company_admin'))
  );

create policy "admin만 삭제"
  on public.designations for delete
  using (
    company_id = public.my_company_id()
    and public.my_role() in ('super_admin','company_admin')
  );
-- ============================================================
-- 005: 안전보건활동계획표 + 알림 설정 테이블
-- ============================================================

-- ─── 회사 알림 설정 ─────────────────────────────────────────
-- companies 테이블에 notify 설정 컬럼 추가
alter table public.companies
  add column if not exists notify_kakao_enabled   boolean default false,
  add column if not exists notify_kakao_sender_key text,
  add column if not exists notify_kakao_template   text,
  add column if not exists notify_email_enabled    boolean default true;

-- ─── 활동계획표 헤더 ────────────────────────────────────────
create table public.activity_plans (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete set null,
  year        integer not null,
  month       integer not null check (month between 1 and 12),
  created_at  timestamptz default now(),
  unique (company_id, project_id, year, month)
);

-- ─── 활동 항목 ──────────────────────────────────────────────
create table public.activity_items (
  id                  uuid primary key default uuid_generate_v4(),
  plan_id             uuid not null references public.activity_plans(id) on delete cascade,
  activity_type       text not null default 'other'
                        check (activity_type in (
                          'risk_assessment','education','work_plan',
                          'inspection','joint_inspection','committee',
                          'msds','designation','health_check','drill','other'
                        )),
  title               text not null,
  description         text,
  scheduled_date      date not null,
  scheduled_time      time,
  is_completed        boolean not null default false,
  completed_at        timestamptz,
  linked_doc_id       uuid,
  linked_doc_type     text,

  -- 알림 설정
  notify_days_before  integer[] not null default '{1,3}',
  notify_channel      text not null default 'email'
                        check (notify_channel in ('email','kakao','both','none')),
  notify_email        text,       -- null이면 작성자 이메일 사용
  notify_phone        text,       -- 카카오 수신 번호
  last_notified_at    timestamptz,

  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index idx_activity_plans_company    on public.activity_plans(company_id);
create index idx_activity_plans_ym         on public.activity_plans(year, month);
create index idx_activity_items_plan       on public.activity_items(plan_id);
create index idx_activity_items_date       on public.activity_items(scheduled_date);
create index idx_activity_items_completed  on public.activity_items(is_completed);
create index idx_activity_items_type       on public.activity_items(activity_type);

create trigger trg_activity_items_updated_at
  before update on public.activity_items
  for each row execute function public.handle_updated_at();

alter table public.activity_plans  enable row level security;
alter table public.activity_items  enable row level security;

-- activity_plans RLS
create policy "같은 회사 계획표 조회"
  on public.activity_plans for select
  using (company_id = public.my_company_id());

create policy "manager 이상 계획표 생성"
  on public.activity_plans for insert
  with check (
    company_id = public.my_company_id()
    and public.my_role() in ('super_admin','company_admin','manager')
  );

create policy "manager 이상 계획표 수정"
  on public.activity_plans for update
  using (
    company_id = public.my_company_id()
    and public.my_role() in ('super_admin','company_admin','manager')
  );

-- activity_items RLS
create policy "같은 회사 항목 조회"
  on public.activity_items for select
  using (
    plan_id in (
      select id from public.activity_plans
      where company_id = public.my_company_id()
    )
  );

create policy "manager 이상 항목 CRUD"
  on public.activity_items for all
  using (
    plan_id in (
      select id from public.activity_plans
      where company_id = public.my_company_id()
    )
    and public.my_role() in ('super_admin','company_admin','manager')
  );

-- ─── 알림 발송 로그 ─────────────────────────────────────────
create table public.notification_logs (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  item_id      uuid references public.activity_items(id) on delete set null,
  channel      text not null,   -- 'email' | 'kakao'
  recipient    text not null,   -- 이메일 또는 전화번호
  status       text not null,   -- 'sent' | 'failed'
  error_msg    text,
  sent_at      timestamptz default now()
);

create index idx_notif_logs_company on public.notification_logs(company_id);
create index idx_notif_logs_item    on public.notification_logs(item_id);

alter table public.notification_logs enable row level security;
create policy "같은 회사 로그 조회"
  on public.notification_logs for select
  using (company_id = public.my_company_id());
-- ============================================================
-- 006: MSDS(물질안전보건자료) 테이블
-- ============================================================

create table public.msds_records (
  id                      uuid primary key default uuid_generate_v4(),
  company_id              uuid not null references public.companies(id) on delete cascade,

  -- 섹션 1: 제품 기본정보
  product_name            text not null,
  product_code            text,
  cas_number              text,
  un_number               text,
  manufacturer            text,

  -- 섹션 2: GHS 유해성
  ghs_hazards             text[]  not null default '{}',
  signal_word             text    check (signal_word in ('danger','warning')),
  hazard_statements       text[]  not null default '{}',
  precautionary_statements text[] not null default '{}',

  -- 섹션 3~4: 구성/응급
  main_components         text,
  first_aid_eye           text,
  first_aid_skin          text,
  first_aid_inhale        text,
  first_aid_ingest        text,

  -- 섹션 5~6: 화재/누출
  fire_fighting           text,
  spill_handling          text,

  -- 섹션 7~8: 취급/노출
  handling_storage        text,
  exposure_limit          text,
  ppe_required            text,

  -- 섹션 16
  revision_date           date,
  is_public               boolean not null default false,
  file_url                text,
  file_name               text,

  status                  text not null default 'active'
                            check (status in ('active','superseded','archived')),
  author_id               uuid not null references public.user_profiles(id),

  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

create index idx_msds_company    on public.msds_records(company_id);
create index idx_msds_cas        on public.msds_records(cas_number);
create index idx_msds_name       on public.msds_records(product_name);
create index idx_msds_public     on public.msds_records(is_public);
create index idx_msds_status     on public.msds_records(status);

create trigger trg_msds_updated_at
  before update on public.msds_records
  for each row execute function public.handle_updated_at();

alter table public.msds_records enable row level security;

-- 같은 회사 + 공용(is_public=true) MSDS는 모든 인증 사용자가 조회 가능
create policy "같은 회사 또는 공용 MSDS 조회"
  on public.msds_records for select
  using (
    company_id = public.my_company_id()
    or is_public = true
  );

create policy "manager 이상 MSDS 등록"
  on public.msds_records for insert
  with check (
    company_id = public.my_company_id()
    and public.my_role() in ('super_admin','company_admin','manager')
  );

create policy "작성자·admin이 수정"
  on public.msds_records for update
  using (
    company_id = public.my_company_id()
    and (
      author_id = auth.uid()
      or public.my_role() in ('super_admin','company_admin')
    )
  );

create policy "admin만 삭제"
  on public.msds_records for delete
  using (
    company_id = public.my_company_id()
    and public.my_role() in ('super_admin','company_admin')
  );

-- Supabase Storage: MSDS 파일 버킷
-- 아래 SQL은 Supabase 대시보드 Storage 탭에서 버킷 생성 후 실행하거나
-- supabase CLI로 실행하세요.
-- insert into storage.buckets (id, name, public)
-- values ('msds-files', 'msds-files', false);

-- create policy "같은 회사 파일 업로드"
--   on storage.objects for insert
--   with check (bucket_id = 'msds-files' and auth.role() = 'authenticated');
-- ============================================================
-- 007: 건설업 기초안전보건교육 이수증 관리 테이블
-- ============================================================

create table public.construction_edu_uploads (
  id            uuid primary key default uuid_generate_v4(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  upload_date   date not null default current_date,
  image_url     text,
  image_name    text,
  note          text,
  author_id     uuid not null references public.user_profiles(id),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table public.construction_edu_records (
  id            uuid primary key default uuid_generate_v4(),
  upload_id     uuid not null references public.construction_edu_uploads(id) on delete cascade,
  company_id    uuid not null references public.companies(id) on delete cascade,
  -- OCR 인식 필드
  person_name       text not null default '',
  birth_date        text default '',   -- 생년월일 (텍스트로 보관 — 형식 다양)
  register_date     text default '',   -- 등록일자
  completion_date   text default '',   -- 이수일자
  -- 추가 메타
  course_name       text default '건설업 기초안전보건교육',
  issuer            text default '',
  raw_ocr_text      text,              -- OCR 원문 (디버그용)
  is_verified       boolean default false,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index idx_constr_edu_uploads_company on public.construction_edu_uploads(company_id);
create index idx_constr_edu_records_upload  on public.construction_edu_records(upload_id);
create index idx_constr_edu_records_company on public.construction_edu_records(company_id);

create trigger trg_constr_edu_uploads_updated_at
  before update on public.construction_edu_uploads
  for each row execute function public.handle_updated_at();

create trigger trg_constr_edu_records_updated_at
  before update on public.construction_edu_records
  for each row execute function public.handle_updated_at();

alter table public.construction_edu_uploads enable row level security;
alter table public.construction_edu_records enable row level security;

create policy "같은 회사 업로드 조회"
  on public.construction_edu_uploads for select
  using (company_id = public.my_company_id());
create policy "manager 이상 업로드"
  on public.construction_edu_uploads for insert
  with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "작성자·admin 수정"
  on public.construction_edu_uploads for update
  using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "admin 삭제"
  on public.construction_edu_uploads for delete
  using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));

create policy "같은 회사 이수 기록 조회"
  on public.construction_edu_records for select
  using (company_id = public.my_company_id());
create policy "manager 이상 이수 기록 CRUD"
  on public.construction_edu_records for all
  using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
-- 008: 순회점검 + 합동점검 + 협의체 + 문서 버전 이력

-- 순회점검일지
create table public.inspections (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  source_risk_id uuid references public.risk_assessments(id) on delete set null,
  link_type text not null default 'manual' check (link_type in ('auto_from_risk','manual')),
  doc_number text,
  inspection_type text not null default 'routine' check (inspection_type in ('routine','special','safety_day')),
  inspection_date date not null,
  inspection_start time, inspection_end time,
  inspection_area text not null default '', weather text,
  inspector_name text not null default '', inspector_position text not null default '', inspector_dept text,
  check_items jsonb not null default '[]',
  overall_opinion text, follow_up_date date,
  status text not null default 'draft' check (status in ('draft','completed','archived')),
  author_id uuid not null references public.user_profiles(id),
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index idx_insp_company on public.inspections(company_id);
create index idx_insp_date on public.inspections(inspection_date desc);
create trigger trg_insp_upd before update on public.inspections for each row execute function public.handle_updated_at();
alter table public.inspections enable row level security;
create policy "insp select" on public.inspections for select using (company_id = public.my_company_id());
create policy "insp insert" on public.inspections for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "insp update" on public.inspections for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "insp delete" on public.inspections for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));

-- 합동안전보건점검
create table public.joint_inspections (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  source_risk_id uuid references public.risk_assessments(id) on delete set null,
  link_type text not null default 'manual' check (link_type in ('auto_from_risk','manual')),
  doc_number text,
  inspection_date date not null, inspection_area text not null default '',
  participants jsonb not null default '[]',
  risk_summary jsonb,
  check_items jsonb not null default '[]',
  improvement_items jsonb not null default '[]',
  overall_opinion text, follow_up_date date,
  status text not null default 'draft' check (status in ('draft','completed','archived')),
  author_id uuid not null references public.user_profiles(id),
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index idx_joint_company on public.joint_inspections(company_id);
create index idx_joint_date on public.joint_inspections(inspection_date desc);
create trigger trg_joint_upd before update on public.joint_inspections for each row execute function public.handle_updated_at();
alter table public.joint_inspections enable row level security;
create policy "joint select" on public.joint_inspections for select using (company_id = public.my_company_id());
create policy "joint insert" on public.joint_inspections for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "joint update" on public.joint_inspections for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "joint delete" on public.joint_inspections for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));

-- 안전보건협의체 회의록
create table public.committee_minutes (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  source_risk_id uuid references public.risk_assessments(id) on delete set null,
  doc_number text,
  meeting_date date not null,
  meeting_start time, meeting_end time,
  meeting_place text not null default '',
  meeting_type text not null default 'regular' check (meeting_type in ('regular','extraordinary')),
  members jsonb not null default '[]',
  risk_performance jsonb,
  agenda_items jsonb not null default '[]',
  resolution text, next_meeting_date date,
  status text not null default 'draft' check (status in ('draft','completed','archived')),
  author_id uuid not null references public.user_profiles(id),
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index idx_committee_company on public.committee_minutes(company_id);
create index idx_committee_date on public.committee_minutes(meeting_date desc);
create trigger trg_committee_upd before update on public.committee_minutes for each row execute function public.handle_updated_at();
alter table public.committee_minutes enable row level security;
create policy "comm select" on public.committee_minutes for select using (company_id = public.my_company_id());
create policy "comm insert" on public.committee_minutes for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "comm update" on public.committee_minutes for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "comm delete" on public.committee_minutes for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));

-- 문서 버전 이력
create table public.document_versions (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  doc_type text not null,
  doc_id uuid not null,
  doc_number text,
  version integer not null default 1,
  change_summary text not null default '',
  snapshot jsonb not null,
  author_id uuid not null references public.user_profiles(id),
  created_at timestamptz default now()
);
create index idx_docver_doc     on public.document_versions(doc_id);
create index idx_docver_company on public.document_versions(company_id);
create index idx_docver_type    on public.document_versions(doc_type, doc_id);
alter table public.document_versions enable row level security;
create policy "ver select" on public.document_versions for select using (company_id = public.my_company_id());
create policy "ver insert" on public.document_versions for insert with check (company_id = public.my_company_id());
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
-- ============================================================
-- 011: 안전보건관리체제 문서 + 연간 이사회 보고
-- ============================================================

create table public.safety_documents (
  id               uuid primary key default uuid_generate_v4(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  project_id       uuid references public.projects(id) on delete set null,
  role_id          text not null,
  doc_type         text not null default '지정서',
  doc_number       text,
  person_name      text not null default '',
  person_affiliation text not null default '',
  person_position  text not null default '',
  person_dept      text not null default '',
  person_contact   text,
  legal_basis      text not null default '',
  duties           jsonb not null default '[]',
  work_scope       text,
  effective_date   date not null,
  expiry_date      date,
  issuer_name      text not null default '',
  issuer_position  text not null default '',
  issuer_company   text not null default '',
  status           text not null default 'active' check (status in ('active','expired','revoked')),
  notes            text,
  author_id        uuid not null references public.user_profiles(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index idx_sdoc_company on public.safety_documents(company_id);
create index idx_sdoc_role    on public.safety_documents(role_id);
create index idx_sdoc_status  on public.safety_documents(status);
create trigger trg_sdoc_upd before update on public.safety_documents
  for each row execute function public.handle_updated_at();
alter table public.safety_documents enable row level security;
create policy "sdoc select" on public.safety_documents for select using (company_id = public.my_company_id());
create policy "sdoc insert" on public.safety_documents for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "sdoc update" on public.safety_documents for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "sdoc delete" on public.safety_documents for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));

-- ─── 연간 이사회 보고 ─────────────────────────────────────────
create table public.board_reports (
  id              uuid primary key default uuid_generate_v4(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  doc_number      text,
  report_year     integer not null,
  report_date     date not null,
  meeting_type    text not null default 'board' check (meeting_type in ('board','audit','general')),
  agenda_items    jsonb not null default '[]',
  -- [{ seq, title, content, resolution, attachments }]
  safety_plan_summary     text,  -- 안전보건 계획 요약
  investment_budget       integer,  -- 안전보건 투자 예산 (원)
  accident_stats          jsonb,    -- 재해 통계
  approval_status         text not null default 'draft' check (approval_status in ('draft','approved','rejected')),
  approver_name           text,
  approved_at             timestamptz,
  status          text not null default 'draft' check (status in ('draft','completed','archived')),
  author_id       uuid not null references public.user_profiles(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index idx_board_company on public.board_reports(company_id);
create index idx_board_year    on public.board_reports(report_year desc);
create trigger trg_board_upd before update on public.board_reports
  for each row execute function public.handle_updated_at();
alter table public.board_reports enable row level security;
create policy "board select" on public.board_reports for select using (company_id = public.my_company_id());
create policy "board insert" on public.board_reports for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "board update" on public.board_reports for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "board delete" on public.board_reports for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));
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
-- ============================================================
-- 013: 작업 시작 전 합동안전점검 (산안법 시행령 제66조 + 시행규칙 제94조)
-- ============================================================

-- 점검표 마스터
create table public.pre_work_inspections (
  id                uuid primary key default uuid_generate_v4(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  project_id        uuid references public.projects(id) on delete set null,
  doc_number        text,

  -- 기본 정보
  machine_type      text not null,   -- 기계·기구 종류 (시행령 제66조 각호)
  machine_type_code text not null,   -- tower_crane | excavator | pile_driver | aerial_work | lift | concrete_pump | cargo_hoist | demolition | other
  machine_name      text not null,   -- 기계명 (예: 타워크레인 TC-600)
  machine_model     text,            -- 모델/형식
  machine_serial    text,            -- 제조번호·등록번호
  machine_capacity  text,            -- 정격하중·최대작업높이 등
  safety_cert_no    text,            -- 안전검사 합격번호
  safety_cert_expiry date,           -- 안전검사 유효기간

  -- 점검 일시·장소
  inspection_date   date not null,
  inspection_time   time,
  work_location     text not null,   -- 작업 위치·구역
  work_description  text,            -- 작업 내용

  -- 참여자
  participants      jsonb not null default '[]',
  -- [{ seq, name, position, affiliation, role('owner'|'lessee'|'contractor'|'worker'), sign }]
  -- owner: 소유자, lessee: 임차인/대여자, contractor: 도급인, worker: 작업자

  -- 점검 항목 (기계별 커스터마이징)
  check_items       jsonb not null default '[]',
  -- [{ seq, category, item, result('pass'|'fail'|'na'), defect_detail, action_required, is_resolved }]

  -- 작업계획서 확인
  work_plan_exists         boolean default false,   -- 작업계획서 작성 여부
  worker_qualification_ok  boolean default false,   -- 자격·면허 확인 여부
  work_plan_confirmed_by   text,                   -- 확인자

  -- 작업 중지 여부
  work_stopped      boolean default false,
  stop_reason       text,

  overall_opinion   text,
  follow_up_date    date,
  status            text not null default 'draft'
    check (status in ('draft','completed','archived')),
  author_id         uuid not null references public.user_profiles(id),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index idx_pwi_company on public.pre_work_inspections(company_id);
create index idx_pwi_date    on public.pre_work_inspections(inspection_date desc);
create index idx_pwi_type    on public.pre_work_inspections(machine_type_code);

create trigger trg_pwi_upd before update on public.pre_work_inspections
  for each row execute function public.handle_updated_at();

alter table public.pre_work_inspections enable row level security;
create policy "pwi select" on public.pre_work_inspections for select using (company_id = public.my_company_id());
create policy "pwi insert" on public.pre_work_inspections for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "pwi update" on public.pre_work_inspections for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "pwi delete" on public.pre_work_inspections for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));
-- ============================================================
-- 014: 유해위험기계 — 안전인증·자율안전확인 인증서, 안전검사 관리
-- ============================================================

-- ─── 인증서 (안전인증 + 자율안전확인 통합) ──────────────────
create table public.machinery_certificates (
  id               uuid primary key default uuid_generate_v4(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  cert_type        text not null check (cert_type in ('safety_cert','voluntary_cert')),
  -- safety_cert: 안전인증(KCs), voluntary_cert: 자율안전확인신고(KCs)
  machine_category text not null default '',   -- 기계·기구 분류
  machine_name     text not null default '',   -- 기계명
  model_no         text,                       -- 모델·형식번호
  manufacturer     text,                       -- 제조사
  cert_no          text not null default '',   -- 인증번호
  cert_date        date,                       -- 인증일
  expiry_date      date,                       -- 유효기간 (해당 시)
  file_url         text,                       -- 업로드된 인증서 파일 URL
  file_name        text,                       -- 원본 파일명
  file_size        integer,                    -- 파일 크기 (bytes)
  notes            text,
  author_id        uuid not null references public.user_profiles(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index idx_mcert_company   on public.machinery_certificates(company_id);
create index idx_mcert_type      on public.machinery_certificates(cert_type);
create trigger trg_mcert_upd before update on public.machinery_certificates
  for each row execute function public.handle_updated_at();
alter table public.machinery_certificates enable row level security;
create policy "mcert select" on public.machinery_certificates for select using (company_id = public.my_company_id());
create policy "mcert insert" on public.machinery_certificates for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "mcert update" on public.machinery_certificates for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "mcert delete" on public.machinery_certificates for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));

-- ─── 안전검사 대상 기계 등록 및 검사이력 ─────────────────────
create table public.safety_inspections (
  id                  uuid primary key default uuid_generate_v4(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  machine_type        text not null,         -- 법정 기계 종류 코드
  machine_name        text not null default '', -- 기계명 (사업장 내 식별명)
  model_no            text,
  serial_no           text,
  manufacturer        text,
  install_date        date,                  -- 설치(최초등록)일
  location            text,                  -- 설치 위치
  is_applicable       boolean not null default true,  -- 해당 사업장 보유 여부
  inapplicable_reason text,                  -- 해당 없음 사유

  -- 검사 이력 (array of jsonb)
  inspection_records  jsonb not null default '[]',
  -- [{ seq, inspection_date, result('pass'|'fail'|'conditional'), cert_no, agency, next_due_date, notes }]

  -- 계산된 값 (latest)
  last_inspection_date date,
  next_due_date        date,
  inspection_cycle     text,                 -- '6개월' | '1년' | '2년' | '4년'
  inspection_status    text not null default 'pending'
    check (inspection_status in ('pending','valid','expiring_soon','overdue','inapplicable')),

  -- 활동계획표 연계
  plan_item_id         uuid references public.activity_plans(id) on delete set null,
  notes                text,
  author_id            uuid not null references public.user_profiles(id),
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);
create index idx_si_company on public.safety_inspections(company_id);
create index idx_si_type    on public.safety_inspections(machine_type);
create index idx_si_status  on public.safety_inspections(inspection_status);
create trigger trg_si_upd before update on public.safety_inspections
  for each row execute function public.handle_updated_at();
alter table public.safety_inspections enable row level security;
create policy "si select" on public.safety_inspections for select using (company_id = public.my_company_id());
create policy "si insert" on public.safety_inspections for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "si update" on public.safety_inspections for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "si delete" on public.safety_inspections for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));
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
-- ============================================================
-- 016: 위험성평가 하위 테이블 — 수시평가(AI 사진분석) + 아차사고
-- ============================================================

-- ─── 수시평가 (사진 분석 기반) ───────────────────────────────
create table public.occasional_risk_assessments (
  id               uuid primary key default uuid_generate_v4(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  project_id       uuid references public.projects(id) on delete set null,
  doc_number       text,
  title            text not null default '',
  occasion_type    text not null default 'other'
    check (occasion_type in (
      'construction_change',  -- 건설물 설치·이전·변경·해체
      'equipment_new',        -- 기계·기구·설비·원재료 신규 도입·변경
      'maintenance',          -- 건설물·기계·기구·설비 정비·보수
      'method_change',        -- 작업방법·절차 신규 도입·변경
      'accident',             -- 중대산업사고·산업재해 발생
      'other'                 -- 그 밖에 사업주가 필요하다고 판단
    )),
  occasion_detail  text,       -- 수시평가 발생 사유 상세
  eval_date        date not null,
  work_location    text default '',

  -- 사진 업로드 (AI 분석)
  photos           jsonb not null default '[]',
  -- [{ url, file_name, ai_analyzed, analyzed_at }]

  -- AI 분석 + 사용자 수정 가능한 평가 항목
  risk_items       jsonb not null default '[]',
  -- [{
  --   seq, work_content,
  --   hazard_factor, hazard_type,
  --   photo_url,          ← 해당 사진 참조
  --   ai_generated,       ← AI가 생성한 원본
  --   -- 위험성 결정 (지침 제11조)
  --   probability, severity, risk_score, risk_level,
  --   -- 위험성 감소대책 (지침 제12조)
  --   measure_engineering, measure_admin, measure_ppe,
  --   measure_owner, measure_due_date, measure_done,
  --   user_edited         ← 사용자 수정 여부
  -- }]

  -- 참여자
  participants     jsonb not null default '[]',
  evaluator_name   text default '',
  approver_name    text default '',

  -- 공유·고지 (지침 제13조)
  shared_at        timestamptz,
  shared_method    text default '',   -- 게시판, TBM, 교육 등

  status           text not null default 'draft'
    check (status in ('draft','in_review','approved','archived')),
  author_id        uuid not null references public.user_profiles(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index idx_ora_company on public.occasional_risk_assessments(company_id);
create index idx_ora_date    on public.occasional_risk_assessments(eval_date desc);
create trigger trg_ora_upd before update on public.occasional_risk_assessments
  for each row execute function public.handle_updated_at();
alter table public.occasional_risk_assessments enable row level security;
create policy "ora select" on public.occasional_risk_assessments for select using (company_id = public.my_company_id());
create policy "ora insert" on public.occasional_risk_assessments for insert with check (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin','manager'));
create policy "ora update" on public.occasional_risk_assessments for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "ora delete" on public.occasional_risk_assessments for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));

-- ─── 아차사고 (Near-Miss) ────────────────────────────────────
create table public.near_miss_reports (
  id               uuid primary key default uuid_generate_v4(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  doc_number       text,
  incident_date    date not null,
  incident_time    time,
  location         text not null default '',
  reporter_name    text default '',
  worker_count     integer default 1,
  description      text not null default '',   -- 발생 경위
  potential_injury text default '',             -- 예상 재해 형태
  photos           jsonb not null default '[]',
  hazard_factors   jsonb not null default '[]', -- 파악된 유해위험요인
  actions          jsonb not null default '[]', -- 즉시조치 사항
  -- 위험성평가 연계 여부
  linked_to_risk   boolean default false,
  linked_risk_id   uuid,
  status           text not null default 'open'
    check (status in ('open','in_review','closed')),
  author_id        uuid not null references public.user_profiles(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index idx_nm_company on public.near_miss_reports(company_id);
create trigger trg_nm_upd before update on public.near_miss_reports
  for each row execute function public.handle_updated_at();
alter table public.near_miss_reports enable row level security;
create policy "nm select" on public.near_miss_reports for select using (company_id = public.my_company_id());
create policy "nm insert" on public.near_miss_reports for insert with check (company_id = public.my_company_id());
create policy "nm update" on public.near_miss_reports for update using (company_id = public.my_company_id() and (author_id = auth.uid() or public.my_role() in ('super_admin','company_admin')));
create policy "nm delete" on public.near_miss_reports for delete using (company_id = public.my_company_id() and public.my_role() in ('super_admin','company_admin'));
-- 017: 위험성평가 4가지 방법 컬럼 추가
alter table public.risk_assessments
  add column if not exists eval_method    text default 'matrix'
    check (eval_method in ('matrix','checklist','three_level','ops')),
  add column if not exists matrix_size    integer default 5
    check (matrix_size in (3,4,5)),
  add column if not exists checklist_items  jsonb default '[]',
  add column if not exists three_level_items jsonb default '[]',
  add column if not exists ops_items        jsonb default '[]';

comment on column public.risk_assessments.eval_method is
  '평가방법: matrix(빈도강도법)/checklist(체크리스트법)/three_level(3단계판단법)/ops(핵심요인기술법)';
comment on column public.risk_assessments.matrix_size is
  '빈도강도법 매트릭스 크기: 3/4/5';
-- ============================================================
-- 018: 보건조치 5개 프로그램 테이블
-- ============================================================

-- ─── 공통 HELPER ─────────────────────────────────────────────
-- ─── 1. 건강증진프로그램 ──────────────────────────────────────
CREATE TABLE public.wellness_programs (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_number    text,
  title         text NOT NULL DEFAULT '',
  year          integer NOT NULL DEFAULT date_part('year', now())::integer,
  plan_items    jsonb NOT NULL DEFAULT '[]',
  -- [{seq, category, program_name, target, start_date, end_date, budget, responsible, status, results}]
  participants_total integer DEFAULT 0,
  budget_total  integer DEFAULT 0,
  notes         text,
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed','archived')),
  author_id     uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ─── 2. 근골격계 유해요인조사 ────────────────────────────────
CREATE TABLE public.musculoskeletal_assessments (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_number      text,
  survey_type     text NOT NULL DEFAULT 'regular' CHECK (survey_type IN ('initial','regular','immediate')),
  -- initial: 최초(신설 1년 이내), regular: 정기(3년마다), immediate: 수시
  survey_date     date NOT NULL,
  dept_name       text NOT NULL DEFAULT '',
  work_name       text NOT NULL DEFAULT '',
  -- 부담작업 해당 여부 체크 (11가지)
  burden_work_check jsonb NOT NULL DEFAULT '[]',
  -- [{seq, description, is_applicable, work_hours_per_day, notes}]
  -- 유해요인 기본조사
  basic_survey    jsonb NOT NULL DEFAULT '{}',
  -- {work_situation:{equipment,process,volume,speed}, work_condition:{time,posture,method}, symptoms_present:bool}
  -- 증상 조사
  symptom_survey  jsonb NOT NULL DEFAULT '[]',
  -- [{worker_name, dept, age, sex, career_years, body_parts:[{part,pain_level,frequency,duration}], special_note}]
  -- 작업환경 개선계획
  improvement_plan jsonb NOT NULL DEFAULT '[]',
  -- [{priority, target_work, hazard, measure, responsible, due_date, done, result}]
  next_survey_date date,
  program_required boolean DEFAULT false,  -- 예방관리프로그램 시행 필요 여부
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','completed','archived')),
  author_id       uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ─── 3. 밀폐공간작업프로그램 ─────────────────────────────────
CREATE TABLE public.confined_space_programs (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_number      text,
  title           text NOT NULL DEFAULT '',
  -- 사업장 내 밀폐공간 목록 (제619조 제1호)
  space_inventory jsonb NOT NULL DEFAULT '[]',
  -- [{seq, location, space_type, hazard_gases, access_type, last_inspection, is_prohibited}]
  -- 작업별 안전확인 절차 (제619조 제3호)
  work_procedures jsonb NOT NULL DEFAULT '[]',
  -- [{work_id, space_location, work_content, o2_check, gas_check, ventilation, supervisor, watchers, ppe}]
  -- 교육훈련 계획 (제619조 제4호)
  training_plan   jsonb NOT NULL DEFAULT '[]',
  -- [{training_date, type, target, content, instructor, attendees_count, done}]
  -- 긴급구조계획
  emergency_plan  text DEFAULT '',
  equipment_list  jsonb NOT NULL DEFAULT '[]',
  -- [{name, qty, location, inspection_date, condition}] - 측정기·환기장치·구조장비
  effective_date  date,
  revision_date   date,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  author_id       uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ─── 밀폐공간 작업허가서 (별도 운영기록) ───────────────────────
CREATE TABLE public.confined_space_permits (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  program_id      uuid REFERENCES public.confined_space_programs(id) ON DELETE SET NULL,
  permit_number   text,
  work_date       date NOT NULL,
  work_time_start time,
  work_time_end   time,
  space_location  text NOT NULL DEFAULT '',
  work_content    text NOT NULL DEFAULT '',
  supervisor_name text DEFAULT '',
  workers         jsonb NOT NULL DEFAULT '[]',
  -- [{name, position, ppe_checked}]
  pre_checks      jsonb NOT NULL DEFAULT '[]',
  -- [{item, result, value, pass}] - 산소/가스 농도, 환기상태 등
  o2_level        numeric(5,1),    -- 산소 농도 %
  co_level        numeric(6,1),    -- CO 농도 ppm
  h2s_level       numeric(6,1),    -- H2S 농도 ppm
  is_approved     boolean DEFAULT false,
  approver_name   text DEFAULT '',
  notes           text,
  author_id       uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ─── 4. 청력보존프로그램 ─────────────────────────────────────
CREATE TABLE public.hearing_conservation_programs (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_number      text,
  title           text NOT NULL DEFAULT '',
  effective_date  date,
  -- 소음 노출 현황 (노출 평가)
  noise_surveys   jsonb NOT NULL DEFAULT '[]',
  -- [{dept, work_name, measurement_date, twae_db, max_db, is_over_85, is_over_90, action_required}]
  -- 공학적 대책 (안전보건규칙 제513조)
  engineering_measures jsonb NOT NULL DEFAULT '[]',
  -- [{location, current_db, measure_type, measure_content, expected_db, responsible, due_date, done}]
  -- 청력보호구 지급 현황
  ppe_records     jsonb NOT NULL DEFAULT '[]',
  -- [{dept, worker_count, ppe_type, ppe_spec, issued_date, snr_db, notes}]
  -- 정기 청력검사 결과 (특수건강진단)
  hearing_tests   jsonb NOT NULL DEFAULT '[]',
  -- [{test_date, test_agency, worker_count, d1_count, d2_count, c1_count, c2_count, action_taken}]
  -- 교육 기록
  education_records jsonb NOT NULL DEFAULT '[]',
  -- [{date, type, target_dept, content, instructor, attendee_count, done}]
  annual_review_date date,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  author_id       uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ─── 5. 호흡기보호프로그램 ───────────────────────────────────
CREATE TABLE public.respiratory_protection_programs (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_number      text,
  title           text NOT NULL DEFAULT '',
  effective_date  date,
  -- 유해물질·분진 노출 현황
  exposure_survey jsonb NOT NULL DEFAULT '[]',
  -- [{dept, work_name, hazard_name, cas_no, measurement_date, concentration, twa, stel, is_over_limit, action}]
  -- 호흡용 보호구 선정 및 지급
  respirator_records jsonb NOT NULL DEFAULT '[]',
  -- [{work_type, hazard, respirator_type, filter_type, protection_factor, issued_to_dept, qty, issued_date, kcs_no}]
  -- 밀착도 검사 (Fit Test)
  fit_test_records jsonb NOT NULL DEFAULT '[]',
  -- [{worker_name, dept, date, respirator_type, test_method, result, next_test_date}]
  -- 점검 및 유지관리 계획
  maintenance_plan jsonb NOT NULL DEFAULT '[]',
  -- [{check_type, frequency, responsible, last_date, next_date, notes}]
  -- 교육 기록
  education_records jsonb NOT NULL DEFAULT '[]',
  annual_review_date date,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  author_id       uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ─── 트리거 & RLS ─────────────────────────────────────────────
DO $$ 
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'wellness_programs','musculoskeletal_assessments',
    'confined_space_programs','confined_space_permits',
    'hearing_conservation_programs','respiratory_protection_programs'
  ] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()', t, t);
    EXECUTE format('ALTER TABLE public.%s ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "%s sel" ON public.%s FOR SELECT USING (company_id = public.my_company_id())', t, t);
    EXECUTE format('CREATE POLICY "%s ins" ON public.%s FOR INSERT WITH CHECK (company_id = public.my_company_id() AND public.my_role() IN (''super_admin'',''company_admin'',''manager''))', t, t);
    EXECUTE format('CREATE POLICY "%s upd" ON public.%s FOR UPDATE USING (company_id = public.my_company_id() AND (author_id = auth.uid() OR public.my_role() IN (''super_admin'',''company_admin'')))', t, t);
    EXECUTE format('CREATE POLICY "%s del" ON public.%s FOR DELETE USING (company_id = public.my_company_id() AND public.my_role() IN (''super_admin'',''company_admin''))', t, t);
  END LOOP;
END $$;

-- 인덱스
CREATE INDEX idx_wp_company  ON public.wellness_programs(company_id);
CREATE INDEX idx_msa_company ON public.musculoskeletal_assessments(company_id);
CREATE INDEX idx_csp_company ON public.confined_space_programs(company_id);
CREATE INDEX idx_permit_company ON public.confined_space_permits(company_id);
CREATE INDEX idx_hcp_company ON public.hearing_conservation_programs(company_id);
CREATE INDEX idx_rpp_company ON public.respiratory_protection_programs(company_id);
-- ============================================================
-- 019: MSDS 법적 분류 + 경고표지 컬럼 추가
-- ============================================================

ALTER TABLE public.msds_records
  -- 섹션 15: 법적 규제현황 (원문 텍스트)
  ADD COLUMN IF NOT EXISTS legal_regulation_raw    text,
  -- AI 분석 결과 (JSON)
  ADD COLUMN IF NOT EXISTS legal_classification    jsonb DEFAULT '{}'::jsonb,
  -- {
  --   is_managed:          bool,  -- 관리대상유해물질 (안전보건규칙 별표12)
  --   is_permitted:        bool,  -- 허가대상유해물질 (산안법 시행령 제88조)
  --   is_special:          bool,  -- 특별관리물질
  --   is_work_env_target:  bool,  -- 작업환경측정 대상물질
  --   is_special_health:   bool,  -- 특수건강진단 대상물질
  --   edu_required_35:     bool,  -- 별표5 제35호 특별교육 필요
  --   legal_refs:          string[], -- 관련 법령 목록
  --   analyzed_at:         string,
  --   raw_analysis:        string  -- AI 분석 원문
  -- }
  -- 경고표지 생성 결과
  ADD COLUMN IF NOT EXISTS hazard_label            jsonb DEFAULT '{}'::jsonb;
  -- {
  --   product_name, manufacturer, supplier, emergency_tel,
  --   signal_word, pictograms:[],
  --   hazard_statements:[], precautionary_statements:[],
  --   generated_at, html_content
  -- }

COMMENT ON COLUMN public.msds_records.legal_classification IS
  'MSDS 15. 법적 규제현황 AI 분석 결과 — 관리대상/허가대상/특별관리/작업환경측정/특수건강진단 분류';
COMMENT ON COLUMN public.msds_records.hazard_label IS
  'GHS 경고표지 자동 생성 결과 (HTML)';

-- ============================================================
-- 특별관리물질 취급일지 및 고지 테이블 (안전보건규칙 제439조·제440조)
-- ============================================================

-- 특별관리물질 취급일지 (제439조) — MSDS별 취급 기록
CREATE TABLE public.special_substance_logs (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  msds_id          uuid REFERENCES public.msds_records(id) ON DELETE SET NULL,
  -- 제439조 제1~6호 필수 기재 사항
  work_date        date NOT NULL DEFAULT CURRENT_DATE,
  worker_name      text NOT NULL DEFAULT '',           -- 1호: 근로자의 이름
  substance_name   text NOT NULL DEFAULT '',           -- 2호: 특별관리물질의 명칭
  usage_amount     text NOT NULL DEFAULT '',           -- 3호: 취급량 (단위 포함, 예: 500mL)
  work_content     text NOT NULL DEFAULT '',           -- 4호: 작업내용
  ppe_worn         text NOT NULL DEFAULT '',           -- 5호: 작업 시 착용한 보호구
  incident_content text DEFAULT '',                    -- 6호: 누출·오염·흡입 등 사고 발생 시 피해 내용 및 조치
  incident_occurred boolean DEFAULT false,             -- 사고 발생 여부
  -- 보완 정보
  dept_name        text DEFAULT '',
  work_location    text DEFAULT '',
  work_duration    text DEFAULT '',
  cmr_types        text[] DEFAULT '{}',               -- C/M/R 해당 여부
  author_id        uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- 특별관리물질 고지 게시물 (제440조) — 게시판 고지 기록
CREATE TABLE public.special_substance_notices (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  msds_id          uuid REFERENCES public.msds_records(id) ON DELETE SET NULL,
  substance_name   text NOT NULL DEFAULT '',
  cmr_types        text[] DEFAULT '{}',               -- C/M/R 유형
  notice_content   text DEFAULT '',                   -- 고지 내용
  posted_at        date DEFAULT CURRENT_DATE,         -- 게시일
  posted_location  text DEFAULT '',                   -- 게시 장소 (게시판 위치)
  notified_workers jsonb DEFAULT '[]',                -- [{name, dept, confirmed_at}]
  is_active        boolean DEFAULT true,
  html_content     text DEFAULT '',                   -- 인쇄용 HTML
  author_id        uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- RLS & 트리거
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['special_substance_logs','special_substance_notices'] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()', t, t);
    EXECUTE format('ALTER TABLE public.%s ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "%s_sel" ON public.%s FOR SELECT USING (company_id = public.my_company_id())', t, t);
    EXECUTE format('CREATE POLICY "%s_ins" ON public.%s FOR INSERT WITH CHECK (company_id = public.my_company_id() AND public.my_role() IN (''super_admin'',''company_admin'',''manager''))', t, t);
    EXECUTE format('CREATE POLICY "%s_upd" ON public.%s FOR UPDATE USING (company_id = public.my_company_id() AND (author_id = auth.uid() OR public.my_role() IN (''super_admin'',''company_admin'')))', t, t);
    EXECUTE format('CREATE POLICY "%s_del" ON public.%s FOR DELETE USING (company_id = public.my_company_id() AND public.my_role() IN (''super_admin'',''company_admin''))', t, t);
  END LOOP;
END $$;

CREATE INDEX idx_ssl_company ON public.special_substance_logs(company_id);
CREATE INDEX idx_ssl_msds    ON public.special_substance_logs(msds_id);
CREATE INDEX idx_ssl_date    ON public.special_substance_logs(work_date DESC);
CREATE INDEX idx_ssn_company ON public.special_substance_notices(company_id);
CREATE INDEX idx_ssn_msds    ON public.special_substance_notices(msds_id);
-- 020: 교육일지에 근무형태(worker_type) 컬럼 추가
ALTER TABLE public.education_journals
  ADD COLUMN IF NOT EXISTS worker_type text
    CHECK (worker_type IN (
      'regular_office','regular_field','daily',
      'short_term','supervisor','atypical'
    ));

COMMENT ON COLUMN public.education_journals.worker_type IS
  '근무형태: regular_office(상용사무직)/regular_field(상용현장직)/daily(일용직)/short_term(단기간)/supervisor(관리감독자)/atypical(특수형태)';
