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
