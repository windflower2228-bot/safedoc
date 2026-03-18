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
