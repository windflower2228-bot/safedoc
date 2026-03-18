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
