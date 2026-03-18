# SafeDoc v20 — 베타테스트 배포 가이드

> **소요 시간: 약 30~40분** | 비용: 무료 (Vercel Hobby + Supabase Free)

---

## 전체 흐름

```
① Supabase 프로젝트 생성 → ② DB 마이그레이션 → ③ Storage 버킷 생성
→ ④ Anthropic API Key 발급 → ⑤ Vercel 배포 → ⑥ 환경변수 설정
→ ⑦ 첫 회원가입 → ⑧ 베타 시작
```

---

## STEP 1 — Supabase 프로젝트 생성

1. **https://supabase.com** 접속 → GitHub 로그인
2. `New project` 클릭
   - **Name:** `safedoc` (자유)
   - **Database Password:** 복잡한 비밀번호 설정 후 메모
   - **Region:** `Northeast Asia (Seoul)` ← 한국 선택
3. 프로젝트 생성 완료 후 대시보드 접속

4. **API Keys 복사** (Settings → API)
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (⚠ 절대 공개 금지)

---

## STEP 2 — DB 마이그레이션 (SQL 실행)

Supabase 대시보드 → **SQL Editor** → `New query`

아래 SQL 파일들을 **순서대로** 복사·붙여넣기 후 실행 (Run):

```
safedoc/supabase/migrations/001_initial_schema.sql
safedoc/supabase/migrations/002_education_journal.sql
safedoc/supabase/migrations/003_work_plan.sql
safedoc/supabase/migrations/004_designation.sql
safedoc/supabase/migrations/005_activity_plan.sql
safedoc/supabase/migrations/006_msds.sql
safedoc/supabase/migrations/007_construction_edu.sql
safedoc/supabase/migrations/008_inspection.sql
safedoc/supabase/migrations/009_company_logo_worklog.sql
safedoc/supabase/migrations/010_health_management.sql
safedoc/supabase/migrations/011_safety_management.sql
safedoc/supabase/migrations/012_committee_regulation_subcontract.sql
safedoc/supabase/migrations/013_pre_work_inspection.sql
safedoc/supabase/migrations/014_hazardous_machinery.sql
safedoc/supabase/migrations/015_safety_measures.sql
safedoc/supabase/migrations/016_risk_sub_tables.sql
safedoc/supabase/migrations/017_risk_method_columns.sql
safedoc/supabase/migrations/018_health_programs.sql
safedoc/supabase/migrations/019_msds_classification.sql
safedoc/supabase/migrations/020_education_worker_type.sql
```

> 💡 **한 번에 실행하려면**: SQL Editor에 여러 파일 내용을 붙여넣어도 됩니다.

---

## STEP 3 — Storage 버킷 생성

Supabase 대시보드 → **Storage** → `New bucket`

| 버킷 이름 | Public | 설명 |
|---|---|---|
| `msds-files` | ❌ 비공개 | MSDS PDF 파일 |
| `edu-certificates` | ❌ 비공개 | 교육 이수증 |
| `company-assets` | ✅ 공개 | 로고·사진·경고표지 |

각 버킷 생성 후 **Policies** 탭에서 아래 정책 추가:

```sql
-- msds-files, edu-certificates: 인증 사용자만 접근
CREATE POLICY "auth users only"
ON storage.objects FOR ALL
USING (auth.role() = 'authenticated');

-- company-assets: 공개 읽기 + 인증 사용자 쓰기
CREATE POLICY "public read"
ON storage.objects FOR SELECT USING (bucket_id = 'company-assets');
CREATE POLICY "auth write"
ON storage.objects FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'company-assets');
```

---

## STEP 4 — Anthropic API Key 발급

1. **https://console.anthropic.com** 접속 → 로그인
2. `API Keys` → `Create Key`
3. 키 복사 → `ANTHROPIC_API_KEY`에 사용

> ⚠ 무료 크레딧 $5 제공됨. 베타테스트 기간 중 충분합니다.

---

## STEP 5 — Vercel 배포

### 5-1. GitHub에 코드 올리기

```bash
# 압축 해제
unzip SafeDoc_v20.zip
cd safedoc

# Git 초기화
git init
git add .
git commit -m "SafeDoc v20 initial"

# GitHub에서 새 private 레포 생성 후:
git remote add origin https://github.com/YOUR_USERNAME/safedoc.git
git push -u origin main
```

### 5-2. Vercel 배포

1. **https://vercel.com** 접속 → GitHub 로그인
2. `Add New Project` → 방금 만든 `safedoc` 레포 선택
3. **Framework Preset:** Next.js (자동 감지)
4. `Environment Variables` 섹션에서 아래 변수 입력 (**STEP 6 참고**)
5. `Deploy` 클릭

---

## STEP 6 — 환경변수 설정

Vercel 프로젝트 → `Settings` → `Environment Variables`

### 필수 (없으면 앱 실행 불가)

| 변수명 | 값 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | STEP 1에서 복사 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | STEP 1에서 복사 |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | STEP 1에서 복사 |
| `NEXT_PUBLIC_SITE_URL` | `https://safedoc-xxx.vercel.app` | Vercel 배포 후 URL |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | STEP 4에서 발급 |
| `CRON_SECRET` | 아무 랜덤 문자열 32자 | 예: `abc123def456ghi789jkl012mno345pq` |

### 선택 (없으면 이메일·카카오 알림만 비활성화, 나머지 정상 작동)

| 변수명 | 설명 |
|---|---|
| `RESEND_API_KEY` | 이메일 알림 (https://resend.com 무료 3,000건/월) |
| `EMAIL_FROM` | 발신 이메일 (예: `SafeDoc <noreply@yourdomain.com>`) |
| `SOLAPI_API_KEY` | 카카오 알림톡 |
| `SOLAPI_API_SECRET` | 카카오 알림톡 |

---

## STEP 7 — Supabase Auth 설정

Supabase 대시보드 → **Authentication** → **URL Configuration**

```
Site URL:    https://safedoc-xxx.vercel.app
Redirect URLs: https://safedoc-xxx.vercel.app/auth/callback
```

(Vercel 배포 후 실제 URL로 교체)

### 이메일 확인 끄기 (베타 편의)

Authentication → **Email** → `Confirm email` → **OFF**

> 개발/베타 단계에서는 이메일 확인 없이 즉시 로그인 가능하게 설정

---

## STEP 8 — 첫 회원가입 및 회사 설정

1. 배포된 URL 접속 (예: `https://safedoc-xxx.vercel.app`)
2. **회원가입** → 이름·이메일·비밀번호 입력
3. **회사 생성** → 사업장명·사업자등록번호 입력
4. 자동으로 `super_admin` 권한 부여됨
5. 대시보드 접속 완료

### 추가 사용자 초대 (선택)

대시보드 → `사용자 관리` → `초대` → 이메일 입력
→ 초대 링크 발송 (RESEND 설정 시) 또는 직접 초대 코드 전달

---

## STEP 9 — 로컬 개발 환경 (선택)

```bash
cd safedoc
npm install
cp .env.example .env.local
# .env.local에 STEP 6 환경변수 입력

npm run dev
# → http://localhost:3000
```

---

## 주요 기능 베타 체크리스트

### 위험성평가
- [ ] 최초 위험성평가 작성 (빈도강도법 3×3/4×4/5×5)
- [ ] 체크리스트법 작성
- [ ] 3단계 판단법 작성
- [ ] 핵심요인기술법(OPS) 작성
- [ ] 수시평가 — 사진 업로드 → AI 자동 분석
- [ ] 위험성평가 엑셀 출력

### MSDS
- [ ] MSDS 등록 (저장 후 AI 법적 분류 자동 실행)
- [ ] 법적 분류 탭 — AI 분석 결과 확인
- [ ] 특별관리물질 탭 — 판정 + 취급일지 작성
- [ ] GHS 경고표지 변환 → 미리보기 → 인쇄

### 교육
- [ ] 교육일지 작성 — 근무형태 선택 → 시간 자동 입력
- [ ] 일용직 선택 시 특별교육 2h 자동 세팅 확인
- [ ] 위험성평가 연계 교육일지 자동 생성
- [ ] 교육일지 엑셀 출력

### 보건조치
- [ ] 근골격계 유해요인조사 — 11가지 부담작업 판단
- [ ] 밀폐공간작업프로그램 수립
- [ ] 청력보존프로그램 수립

---

## 문제 해결

### "미들웨어 오류" 또는 로그인 루프
→ Supabase Auth URL Configuration에서 Site URL 확인

### "데이터를 불러올 수 없습니다"
→ RLS 정책 문제. Supabase SQL Editor에서 마이그레이션 재실행

### AI 분석 기능이 작동 안 함
→ `ANTHROPIC_API_KEY` 환경변수 확인. Vercel 재배포 필요

### 파일 업로드 안 됨
→ Storage 버킷 정책(Policy) 확인

---

## 베타테스트 피드백

발견된 버그나 개선 사항은 GitHub Issues 또는 직접 알려주세요.

**버전:** SafeDoc v20  
**기술 스택:** Next.js 14 + Supabase + TypeScript + Vercel  
**마이그레이션:** 001 ~ 020 (총 20개 파일)
