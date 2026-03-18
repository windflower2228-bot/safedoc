-- 020: 교육일지에 근무형태(worker_type) 컬럼 추가
ALTER TABLE public.education_journals
  ADD COLUMN IF NOT EXISTS worker_type text
    CHECK (worker_type IN (
      'regular_office','regular_field','daily',
      'short_term','supervisor','atypical'
    ));

COMMENT ON COLUMN public.education_journals.worker_type IS
  '근무형태: regular_office(상용사무직)/regular_field(상용현장직)/daily(일용직)/short_term(단기간)/supervisor(관리감독자)/atypical(특수형태)';
