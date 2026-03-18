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
