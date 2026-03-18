'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Loader2, Stamp, Plus, Trash2, Save, Check,
  ChevronDown, ChevronUp, Sparkles, Info,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  DESIGNATION_ROLES,
  DOC_TYPE_LABELS,
  type DesignationDocType,
  type DesignationRole,
} from '@/types/designation'

interface FormData {
  doc_type:        DesignationDocType
  role_id:         string
  role_label:      string
  project_id:      string
  person_name:     string
  person_id_last4: string
  person_address:  string
  person_dept:     string
  person_position: string
  legal_basis:     string
  duties:          { value: string }[]
  effective_date:  string
  expiry_date:     string
  work_scope:      string
  issuer_name:     string
  issuer_position: string
  issuer_company:  string
}

const DOC_TYPES: { value: DesignationDocType; label: string; desc: string }[] = [
  { value: 'designation', label: '지정서', desc: '직위·역할을 지정하는 문서 (관리책임자, 관리감독자 등)' },
  { value: 'appointment', label: '선임서', desc: '법정 선임 의무자를 선임하는 문서 (안전관리자, 보건관리자 등)' },
]

export default function NewDesignationPage() {
  const router = useRouter()
  const [saving, setSaving]         = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [roleOpen, setRoleOpen]     = useState(false)
  const [projects, setProjects]     = useState<{ id: string; site_name: string }[]>([])

  const form = useForm<FormData>({
    defaultValues: {
      doc_type: 'designation',
      role_id: '', role_label: '',
      project_id: '', person_name: '',
      person_id_last4: '', person_address: '',
      person_dept: '', person_position: '',
      legal_basis: '',
      duties: [{ value: '' }],
      effective_date: new Date().toISOString().slice(0, 10),
      expiry_date: '',
      work_scope: '',
      issuer_name: '', issuer_position: '', issuer_company: '',
    },
  })

  const { fields: dutyFields, append: appendDuty, remove: removeDuty } =
    useFieldArray({ control: form.control, name: 'duties' })

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(j => setProjects(j.data ?? []))
    // 회사 정보 자동 채우기
    fetch('/api/company/me').then(r => r.json()).then(j => {
      if (j.data) {
        form.setValue('issuer_company', j.data.name ?? '')
      }
    }).catch(() => {})
  }, [form])

  // 직위 선택 시 자동 채우기
  function selectRole(role: DesignationRole) {
    form.setValue('role_id',    role.id)
    form.setValue('role_label', role.id === 'custom' ? '' : role.label)
    form.setValue('doc_type',   role.doc_type)
    form.setValue('legal_basis', role.legal_basis)
    // 직무 목록 자동 채우기
    if (role.duties.length > 0) {
      const dutyValues = role.duties.map(d => ({ value: d }))
      form.setValue('duties', dutyValues)
    }
    setRoleOpen(false)
    toast.success(`"${role.label}" 직무 정보가 자동으로 입력되었습니다.`)
  }

  async function onSave() {
    const v = form.getValues()
    if (!v.person_name)   { toast.error('피지정자 성명을 입력해주세요.'); return }
    if (!v.role_label)    { toast.error('직위명을 입력해주세요.'); return }
    if (!v.issuer_name)   { toast.error('지정권자 성명을 입력해주세요.'); return }

    const duties = v.duties.map(d => d.value).filter(Boolean)
    if (duties.length === 0) { toast.error('직무를 1개 이상 입력해주세요.'); return }

    setSaving(true)
    const res = await fetch('/api/documents/designation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...v, duties }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('지정서·선임서가 저장되었습니다.')
    router.push(`/documents/designation/${json.data.id}`)
  }

  async function onPreview() {
    const v = form.getValues()
    if (!v.person_name || !v.role_label) {
      toast.error('성명과 직위명을 먼저 입력해주세요.')
      return
    }
    setPreviewing(true)
    // 임시 저장 후 PDF 미리보기
    const duties = v.duties.map(d => d.value).filter(Boolean)
    const res = await fetch('/api/documents/designation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...v, duties }),
    })
    const json = await res.json()
    setPreviewing(false)
    if (!res.ok) { toast.error(json.error); return }
    window.open(`/api/export/designation/${json.data.id}`, '_blank')
    router.push(`/documents/designation/${json.data.id}`)
  }

  const docType  = form.watch('doc_type')
  const roleId   = form.watch('role_id')
  const roleName = form.watch('role_label')

  // 현재 doc_type에 맞는 역할만 필터링
  const filteredRoles = DESIGNATION_ROLES.filter(
    r => r.doc_type === docType || r.id === 'custom'
  )

  return (
    <div className="max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Stamp className="w-5 h-5 text-purple-600" />
            지정서 · 선임서 작성
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            직위를 선택하면 법적 근거와 직무가 자동으로 입력됩니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.back()} className="btn-secondary">취소</button>
          <button onClick={onPreview} disabled={previewing || saving}
            className="btn-secondary">
            {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            PDF 미리보기
          </button>
          <button onClick={onSave} disabled={saving}
            className="btn-primary" style={{ background: '#7c3aed' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* ── 문서 유형 선택 ──────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-3">문서 유형</h2>
          <div className="grid grid-cols-2 gap-3">
            {DOC_TYPES.map(dt => (
              <button
                key={dt.value}
                type="button"
                onClick={() => {
                  form.setValue('doc_type', dt.value)
                  form.setValue('role_id', '')
                  form.setValue('role_label', '')
                  form.setValue('legal_basis', '')
                  form.setValue('duties', [{ value: '' }])
                }}
                className={clsx(
                  'flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all',
                  docType === dt.value
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <span className={clsx(
                  'text-sm font-bold mb-1',
                  docType === dt.value ? 'text-purple-700' : 'text-gray-700'
                )}>{dt.label}</span>
                <span className="text-xs text-gray-500 leading-relaxed">{dt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── 직위 선택 ────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">직위 선택</h2>
            <span className="text-xs text-gray-400">선택 시 법령·직무 자동 입력</span>
          </div>

          {/* 현재 선택 표시 */}
          {roleId && roleId !== 'custom' ? (
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl mb-3 border border-purple-200">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Stamp className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-purple-800">{roleName}</div>
                <div className="text-xs text-purple-500">{form.watch('legal_basis').split(' ')[0]} {form.watch('legal_basis').split(' ')[1]}</div>
              </div>
              <button onClick={() => setRoleOpen(v => !v)}
                className="text-xs text-purple-600 hover:underline">변경</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setRoleOpen(v => !v)}
              className="w-full flex items-center justify-between p-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-purple-300 hover:text-purple-500 hover:bg-purple-50/50 transition-all mb-3"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                직위를 선택하면 법령·직무가 자동 입력됩니다
              </span>
              {roleOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}

          {/* 역할 드롭다운 */}
          {roleOpen && (
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
              {filteredRoles.map((role, idx) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => selectRole(role)}
                  className={clsx(
                    'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
                    idx > 0 && 'border-t border-gray-100',
                    roleId === role.id
                      ? 'bg-purple-50'
                      : 'hover:bg-gray-50'
                  )}
                >
                  <div className={clsx(
                    'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                    role.category === 'management' ? 'bg-blue-500' :
                    role.category === 'safety'     ? 'bg-orange-500' :
                    role.category === 'health'     ? 'bg-green-500' :
                    role.category === 'supervisor' ? 'bg-amber-500' : 'bg-gray-400'
                  )} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {role.label}
                      <span className="ml-2 text-xs text-gray-400 font-normal">
                        {DOC_TYPE_LABELS[role.doc_type]}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{role.legal_basis}</div>
                  </div>
                  {roleId === role.id && <Check className="w-4 h-4 text-purple-500 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* 직위명 직접 입력 (custom 선택 시 또는 선택 없을 때) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">직위명 *</label>
              <input {...form.register('role_label')}
                placeholder="예: 안전보건관리책임자"
                className="input-base" />
            </div>
            <div>
              <label className="label-base">현장 (선택)</label>
              <select {...form.register('project_id')} className="input-base">
                <option value="">현장 선택 안함</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.site_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── 피지정자 정보 ──────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">피지정자 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-base">성명 *</label>
              <input {...form.register('person_name')} placeholder="홍 길 동"
                className="input-base" />
            </div>
            <div>
              <label className="label-base">현재 직위 *</label>
              <input {...form.register('person_position')} placeholder="현장소장"
                className="input-base" />
            </div>
            <div>
              <label className="label-base">소속 부서</label>
              <input {...form.register('person_dept')} placeholder="안전보건팀"
                className="input-base" />
            </div>
            <div>
              <label className="label-base">주민등록번호 뒷자리 <span className="text-gray-400 font-normal">(선택)</span></label>
              <input {...form.register('person_id_last4')} placeholder="1234567"
                maxLength={7} className="input-base tracking-widest" />
            </div>
            <div className="col-span-2">
              <label className="label-base">주소 <span className="text-gray-400 font-normal">(선택)</span></label>
              <input {...form.register('person_address')} placeholder="서울특별시 강남구 ..."
                className="input-base" />
            </div>
          </div>
        </div>

        {/* ── 지정 내용 ──────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">지정 내용</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-base">지정 효력 발생일 *</label>
              <input {...form.register('effective_date')} type="date" className="input-base" />
            </div>
            <div>
              <label className="label-base">만료일 <span className="text-gray-400 font-normal">(없으면 재임 기간 중)</span></label>
              <input {...form.register('expiry_date')} type="date" className="input-base" />
            </div>
            <div className="col-span-2">
              <label className="label-base">법적 근거 *</label>
              <input {...form.register('legal_basis')} placeholder="산업안전보건법 제○○조"
                className="input-base" />
            </div>
            <div className="col-span-2">
              <label className="label-base">
                담당 작업 범위
                <span className="text-gray-400 font-normal ml-1">(관리감독자 등 — 선택)</span>
              </label>
              <textarea {...form.register('work_scope')} rows={2}
                placeholder="예: 철골 조립 공사 구간 (B동 1~5층)"
                className="input-base resize-none" />
            </div>
          </div>
        </div>

        {/* ── 직무 목록 ──────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">주요 직무</h2>
            {roleId && roleId !== 'custom' && (
              <div className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                <Sparkles className="w-3 h-3" />
                법령 기준 직무 자동 입력됨
              </div>
            )}
          </div>

          <div className="space-y-2">
            {dutyFields.map((field, idx) => (
              <div key={field.id} className="flex items-start gap-2">
                <span className="w-6 h-9 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0">
                  {idx + 1}
                </span>
                <input
                  {...form.register(`duties.${idx}.value`)}
                  placeholder="직무 내용을 입력하세요"
                  className="input-base flex-1 text-sm"
                />
                {dutyFields.length > 1 && (
                  <button onClick={() => removeDuty(idx)}
                    className="p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => appendDuty({ value: '' })}
            className="mt-3 flex items-center gap-1.5 text-xs text-purple-600 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> 직무 추가
          </button>
        </div>

        {/* ── 지정권자 정보 ──────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">지정권자 정보</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-base">소속 (회사명) *</label>
              <input {...form.register('issuer_company')} placeholder="(주)한국건설"
                className="input-base" />
            </div>
            <div>
              <label className="label-base">직위 *</label>
              <input {...form.register('issuer_position')} placeholder="대표이사"
                className="input-base" />
            </div>
            <div>
              <label className="label-base">성명 *</label>
              <input {...form.register('issuer_name')} placeholder="홍 길 동"
                className="input-base" />
            </div>
          </div>

          {/* 안내 */}
          <div className="mt-4 flex items-start gap-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
            저장 후 PDF를 출력하면 날인란이 표시됩니다. 출력 후 지정권자가 직접 날인하세요.
          </div>
        </div>

        {/* ── 하단 버튼 ──────────────────────────────────────── */}
        <div className="flex gap-3 pb-8">
          <button onClick={onPreview} disabled={previewing || saving}
            className="btn-secondary flex-1 justify-center">
            {previewing
              ? <><Loader2 className="w-4 h-4 animate-spin" /> PDF 생성 중...</>
              : 'PDF 미리보기 및 저장'}
          </button>
          <button onClick={onSave} disabled={saving}
            className="btn-primary flex-1 justify-center"
            style={{ background: '#7c3aed' }}>
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> 저장 중...</>
              : <><Save className="w-4 h-4" /> 저장</>}
          </button>
        </div>
      </div>
    </div>
  )
}
