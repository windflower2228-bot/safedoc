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
