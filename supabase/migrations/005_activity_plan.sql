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
