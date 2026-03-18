'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft, Save, Loader2, FileText,
  Eye, EyeOff, ChevronDown, Plus, Trash2, Printer,
} from 'lucide-react'
import { clsx } from 'clsx'
import { SAFETY_ROLES, type SafetyRoleId, type SafetyRole } from '@/types/safety-management'

// ─── Props ────────────────────────────────────────────────────
interface Props { roleId: SafetyRoleId }

interface FormValues {
  person_name:        string
  person_affiliation: string
  person_position:    string   // 직급 (드롭다운)
  person_dept:        string
  person_contact:     string
  legal_basis:        string
  duties:             string[]
  work_scope:         string
  effective_date:     string
  expiry_date:        string
  issuer_name:        string
  issuer_position:    string
  issuer_company:     string
  notes:              string
}

export default function DesignationForm({ roleId }: Props) {
  const router = useRouter()
  const role   = SAFETY_ROLES[roleId] as SafetyRole

  const [saving,      setSaving]   = useState(false)
  const [preview,     setPreview]  = useState(false)
  const [posOpen,     setPosOpen]  = useState(false)
  const [duties,      setDuties]   = useState<string[]>(role.duties)
  const [company,     setCompany]  = useState<{ name:string; address:string; ceo_name:string } | null>(null)

  const { register, handleSubmit, watch, setValue, getValues } = useForm<FormValues>({
    defaultValues: {
      person_name:        '',
      person_affiliation: '',
      person_position:    '',
      person_dept:        '',
      person_contact:     '',
      legal_basis:        role.legalBasis,
      duties:             role.duties,
      work_scope:         '',
      effective_date:     new Date().toISOString().slice(0, 10),
      expiry_date:        '',
      issuer_name:        '',
      issuer_position:    '대표이사',
      issuer_company:     '',
      notes:              '',
    },
  })

  const watchAll = watch()

  // 회사 정보 자동 로드
  useEffect(() => {
    fetch('/api/company').then(r => r.json()).then(j => {
      if (j.data) {
        setCompany(j.data)
        setValue('issuer_company', j.data.name ?? '')
        setValue('issuer_name',    j.data.ceo_name ?? '')
      }
    }).catch(() => {})
  }, [setValue])

  // 직급 선택 시 자동 적용
  function selectPosition(pos: string) {
    setValue('person_position', pos)
    setPosOpen(false)
  }

  // 직무 추가/삭제
  function addDuty() {
    setDuties(prev => [...prev, ''])
  }
  function updateDuty(i: number, val: string) {
    setDuties(prev => prev.map((d, idx) => idx === i ? val : d))
  }
  function removeDuty(i: number) {
    setDuties(prev => prev.filter((_, idx) => idx !== i))
  }

  // 저장
  async function onSubmit(data: FormValues) {
    if (!data.person_name.trim()) { toast.error('대상자 성명을 입력하세요.'); return }
    if (!data.person_position.trim()) { toast.error('직급을 선택하거나 입력하세요.'); return }
    setSaving(true)
    const payload = {
      role_id:            roleId,
      doc_type:           role.docType,
      person_name:        data.person_name,
      person_affiliation: data.person_affiliation,
      person_position:    data.person_position,
      person_dept:        data.person_dept,
      person_contact:     data.person_contact || null,
      legal_basis:        data.legal_basis,
      duties:             duties.filter(d => d.trim()),
      work_scope:         data.work_scope || null,
      effective_date:     data.effective_date,
      expiry_date:        data.expiry_date || null,
      issuer_name:        data.issuer_name,
      issuer_position:    data.issuer_position,
      issuer_company:     data.issuer_company,
      notes:              data.notes || null,
      status:             'active',
    }
    const res  = await fetch('/api/safety-documents', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success(`${role.docType}가 작성되었습니다. (${json.data.doc_number})`)
    router.push(`/safety-management/${roleId.replace('_','-')}`)
  }

  // ─── 미리보기 렌더 ─────────────────────────────────────────
  const PreviewDoc = () => (
    <div className="bg-white border border-gray-300 rounded-xl p-8 text-sm font-serif" style={{ minHeight: 600 }}>
      {/* 헤더 */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold tracking-widest mb-1">
          {role.docType}
        </h1>
        <p className="text-sm text-gray-500">문서번호: 자동 채번</p>
      </div>

      {/* 피지정자 정보 */}
      <table className="w-full border-collapse mb-6">
        <tbody>
          <tr>
            <td className="border border-gray-400 bg-gray-50 px-4 py-2.5 font-semibold w-28 text-center">성명</td>
            <td className="border border-gray-400 px-4 py-2.5">{watchAll.person_name || '_________'}</td>
            <td className="border border-gray-400 bg-gray-50 px-4 py-2.5 font-semibold w-28 text-center">소속</td>
            <td className="border border-gray-400 px-4 py-2.5">{watchAll.person_affiliation || '_________'}</td>
          </tr>
          <tr>
            <td className="border border-gray-400 bg-gray-50 px-4 py-2.5 font-semibold text-center">직급</td>
            <td className="border border-gray-400 px-4 py-2.5">{watchAll.person_position || '_________'}</td>
            <td className="border border-gray-400 bg-gray-50 px-4 py-2.5 font-semibold text-center">부서</td>
            <td className="border border-gray-400 px-4 py-2.5">{watchAll.person_dept || '_________'}</td>
          </tr>
        </tbody>
      </table>

      {/* 법적 근거 */}
      <div className="mb-5">
        <p className="font-semibold mb-1.5">【법적 근거】</p>
        <p className="pl-4 text-gray-700">{watchAll.legal_basis || role.legalBasis}</p>
      </div>

      {/* 직무 */}
      <div className="mb-5">
        <p className="font-semibold mb-2">【주요 직무】</p>
        <ol className="list-decimal pl-6 space-y-1">
          {duties.filter(d => d.trim()).map((d, i) => (
            <li key={i} className="text-gray-700 leading-relaxed">{d}</li>
          ))}
        </ol>
      </div>

      {/* 담당 작업 범위 (관리감독자) */}
      {roleId === 'supervisor' && watchAll.work_scope && (
        <div className="mb-5">
          <p className="font-semibold mb-1.5">【담당 작업 범위】</p>
          <p className="pl-4 text-gray-700">{watchAll.work_scope}</p>
        </div>
      )}

      {/* 지정 기간 */}
      <div className="mb-8">
        <p className="font-semibold mb-1.5">【지정 기간】</p>
        <p className="pl-4 text-gray-700">
          {watchAll.effective_date || '____년 __월 __일'}
          {watchAll.expiry_date ? ` ~ ${watchAll.expiry_date}` : ' ~ 재임 기간 중'}
        </p>
      </div>

      {/* 본문 */}
      <div className="text-center mb-10 leading-loose text-base">
        <p>
          위 자를 {watchAll.effective_date || '____년 __월 __일'}부로<br/>
          <strong className="text-lg">{role.label}</strong>으(로)
          {role.docType === '위촉서' ? ' 위촉' : role.docType === '선임서' ? ' 선임' : ' 지정'}합니다.
        </p>
      </div>

      {/* 날짜 및 서명 */}
      <div className="text-center">
        <p className="mb-6">{watchAll.effective_date || '____년 __월 __일'}</p>
        <p className="mb-1">{watchAll.issuer_company || (company?.name ?? '회사명')}</p>
        <p className="mb-1">{watchAll.issuer_position || '대표이사'} &nbsp; {watchAll.issuer_name || '______'} &nbsp; <span className="border border-gray-400 px-4 py-1 text-xs text-gray-400">(인)</span></p>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href={`/safety-management/${roleId.replace(/_/g, '-')}`}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5" style={{ color: role.color }} />
              {role.label} {role.docType} 작성
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">{role.legalBasis}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPreview(v => !v)}
            className="btn-secondary text-sm gap-1.5">
            {preview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {preview ? '편집' : '미리보기'}
          </button>
          <button onClick={handleSubmit(onSubmit)} disabled={saving}
            className="btn-primary text-sm gap-1.5" style={{ background: role.color }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
        </div>
      </div>

      {preview ? (
        /* ── 미리보기 ────────────────────────────────────────── */
        <div>
          <PreviewDoc />
          <div className="flex gap-2 mt-4">
            <button onClick={() => setPreview(false)} className="btn-secondary flex-1">편집으로 돌아가기</button>
            <button onClick={handleSubmit(onSubmit)} disabled={saving}
              className="btn-primary flex-1" style={{ background: role.color }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              저장
            </button>
          </div>
        </div>
      ) : (
        /* ── 편집 폼 ─────────────────────────────────────────── */
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* 법적 근거 배너 */}
          <div className="px-4 py-3 rounded-xl text-xs leading-relaxed"
            style={{ background: role.bg, color: role.color }}>
            <span className="font-semibold">{role.legalBasis}</span>
            <span className="mx-2">|</span>
            {role.description}
          </div>

          {/* ① 대상자 정보 */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4">{role.docType} 대상자 정보</h2>
            <div className="grid grid-cols-2 gap-4">
              {/* 성명 */}
              <div>
                <label className="label-base">성명 *</label>
                <input {...register('person_name', { required: true })}
                  placeholder="홍길동"
                  className="input-base" />
              </div>
              {/* 소속 */}
              <div>
                <label className="label-base">소속 *</label>
                <input {...register('person_affiliation', { required: true })}
                  placeholder="(주)한국건설"
                  className="input-base" />
              </div>
              {/* 직급 — 드롭다운 + 직접 입력 */}
              <div>
                <label className="label-base">직급 *</label>
                <div className="relative">
                  <input
                    {...register('person_position')}
                    placeholder="직접 입력 또는 아래에서 선택"
                    className="input-base pr-10"
                    autoComplete="off"
                    onFocus={() => setPosOpen(true)}
                    onBlur={() => setTimeout(() => setPosOpen(false), 150)}
                  />
                  <button type="button"
                    onClick={() => setPosOpen(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {posOpen && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      <div className="p-1.5">
                        <p className="text-[10px] text-gray-400 px-2 py-1 font-medium">
                          {role.label}에 적합한 직급 예시
                        </p>
                        {role.positions.map(pos => (
                          <button key={pos} type="button"
                            onMouseDown={() => selectPosition(pos)}
                            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                            {pos}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">선택 시 자동 입력, 직접 타이핑도 가능합니다.</p>
              </div>
              {/* 부서 */}
              <div>
                <label className="label-base">부서</label>
                <input {...register('person_dept')}
                  placeholder="안전관리팀"
                  className="input-base" />
              </div>
              {/* 연락처 */}
              <div className="col-span-2">
                <label className="label-base">연락처 (선택)</label>
                <input {...register('person_contact')}
                  placeholder="010-0000-0000"
                  className="input-base" />
              </div>
            </div>
          </div>

          {/* ② 법적 근거 & 주요 직무 */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4">법적 근거 및 주요 직무</h2>
            <div className="mb-4">
              <label className="label-base">법적 근거</label>
              <input {...register('legal_basis')}
                className="input-base font-medium"
                style={{ color: role.color }} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label-base mb-0">주요 직무 목록</label>
                <button type="button" onClick={addDuty}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <Plus className="w-3.5 h-3.5" /> 직무 추가
                </button>
              </div>
              <div className="space-y-2">
                {duties.map((duty, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-xs text-gray-400 w-5 flex-shrink-0 pt-2 font-mono">{i + 1}.</span>
                    <textarea
                      value={duty}
                      onChange={e => updateDuty(i, e.target.value)}
                      rows={2}
                      className="input-base resize-none text-sm flex-1 leading-relaxed"
                    />
                    <button type="button" onClick={() => removeDuty(i)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0 mt-0.5">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 관리감독자 전용: 담당 작업 범위 */}
            {roleId === 'supervisor' && (
              <div className="mt-4">
                <label className="label-base">담당 작업 범위 *</label>
                <textarea {...register('work_scope')}
                  rows={3}
                  placeholder="예: 4공구 철골공사 및 고소작업 전반"
                  className="input-base resize-none text-sm"
                />
              </div>
            )}
          </div>

          {/* ③ 지정 기간 */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4">지정 기간</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-base">지정 효력 발생일 *</label>
                <input {...register('effective_date', { required: true })}
                  type="date" className="input-base" />
              </div>
              <div>
                <label className="label-base">만료일 (없으면 재임 기간 중)</label>
                <input {...register('expiry_date')} type="date" className="input-base" />
              </div>
            </div>
          </div>

          {/* ④ 지정권자 */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4">지정권자 (발행인)</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label-base">성명 *</label>
                <input {...register('issuer_name', { required: true })}
                  placeholder="홍대표"
                  className="input-base" />
              </div>
              <div>
                <label className="label-base">직위 *</label>
                <input {...register('issuer_position', { required: true })}
                  placeholder="대표이사"
                  className="input-base" />
              </div>
              <div>
                <label className="label-base">소속 *</label>
                <input {...register('issuer_company', { required: true })}
                  className="input-base" />
              </div>
            </div>
          </div>

          {/* ⑤ 비고 */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-3">비고 (선택)</h2>
            <textarea {...register('notes')} rows={2}
              className="input-base resize-none text-sm"
              placeholder="추가 내용을 입력하세요." />
          </div>
        </form>
      )}
    </div>
  )
}
