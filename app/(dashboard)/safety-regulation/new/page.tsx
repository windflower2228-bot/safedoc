'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, Plus, Trash2, ScrollText, ChevronDown, ChevronUp } from 'lucide-react'

// 산업안전보건법 시행규칙 [별표 3] 기반 필수 항목
const DEFAULT_SECTIONS = [
  {
    chapter: '제1장', title: '총칙',
    content: `가. 안전보건관리규정 작성의 목적 및 적용 범위에 관한 사항
나. 사업주 및 근로자의 재해 예방 책임 및 의무 등에 관한 사항
다. 하도급 사업장에 대한 안전·보건관리에 관한 사항`,
  },
  {
    chapter: '제2장', title: '안전·보건 관리조직과 그 직무',
    content: `가. 안전·보건 관리조직의 구성방법, 소속, 업무 분장 등에 관한 사항
나. 안전보건관리책임자(안전보건총괄책임자), 안전관리자, 보건관리자, 관리감독자의 직무 및 선임에 관한 사항
다. 산업안전보건위원회의 설치·운영에 관한 사항
라. 명예산업안전감독관의 직무 및 활동에 관한 사항
마. 작업지휘자 배치 등에 관한 사항`,
  },
  {
    chapter: '제3장', title: '안전·보건교육',
    content: `가. 근로자 및 관리감독자의 안전·보건교육에 관한 사항
나. 교육계획의 수립 및 기록 등에 관한 사항`,
  },
  {
    chapter: '제4장', title: '작업장 안전관리',
    content: `가. 안전·보건관리에 관한 계획의 수립 및 시행에 관한 사항
나. 기계·기구 및 설비의 방호조치에 관한 사항
다. 유해·위험기계등에 대한 자율검사프로그램에 의한 검사 또는 안전검사에 관한 사항
라. 근로자의 안전수칙 준수에 관한 사항
마. 위험물질의 보관 및 출입 제한에 관한 사항
바. 중대재해 및 중대산업사고 발생, 급박한 산업재해 발생의 위험이 있는 경우 작업중지에 관한 사항
사. 안전표지·안전수칙의 종류 및 게시에 관한 사항과 그 밖에 안전관리에 관한 사항`,
  },
  {
    chapter: '제5장', title: '작업장 보건관리',
    content: `가. 근로자 건강진단, 작업환경측정의 실시 및 조치절차 등에 관한 사항
나. 유해물질의 취급에 관한 사항
다. 보호구의 지급 등에 관한 사항
라. 질병자의 근로 금지 및 취업 제한 등에 관한 사항
마. 보건표지·보건수칙의 종류 및 게시에 관한 사항과 그 밖에 보건관리에 관한 사항`,
  },
  {
    chapter: '제6장', title: '사고 조사 및 대책 수립',
    content: `가. 산업재해 및 중대산업사고의 발생 시 처리 절차 및 긴급조치에 관한 사항
나. 산업재해 및 중대산업사고의 발생원인에 대한 조사 및 분석, 대책 수립에 관한 사항
다. 산업재해 및 중대산업사고 발생의 기록·관리 등에 관한 사항`,
  },
  {
    chapter: '제7장', title: '위험성평가에 관한 사항',
    content: `가. 위험성평가의 실시 시기 및 방법, 절차에 관한 사항
나. 위험성 감소대책 수립 및 시행에 관한 사항`,
  },
  {
    chapter: '제8장', title: '보칙',
    content: `가. 무재해운동 참여, 안전·보건 관련 제안 및 포상·징계 등 산업재해 예방을 위하여 필요하다고 판단하는 사항
나. 안전·보건 관련 문서의 보존에 관한 사항
다. 그 밖의 사항

[참고] 사업장의 규모·업종 등에 적합하게 작성하며, 필요한 사항을 추가하거나 해당 사업장에 관련되지 않는 사항은 제외할 수 있습니다.`,
  },
]

export default function SafetyRegulationNewPage() {
  const router  = useRouter()
  const [saving,   setSaving]   = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)

  const form = useForm<any>({
    defaultValues: {
      title:          '안전보건관리규정',
      version:         1,
      effective_date:  new Date().toISOString().slice(0, 10),
      revision_reason: '최초 제정',
      approver_name:   '',
      approver_position: '대표이사',
      approved_date:   new Date().toISOString().slice(0, 10),
      sections:        DEFAULT_SECTIONS.map((s, i) => ({ seq: i+1, ...s })),
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'sections' })

  async function onSubmit(data: any) {
    setSaving(true)
    const res = await fetch('/api/safety-regulation', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, sections: data.sections.map((s: any, i: number) => ({ ...s, seq: i+1 })) }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('안전보건관리규정이 작성되었습니다.')
    router.push(`/safety-regulation/${json.data.id}`)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/safety-regulation" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4"/>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-indigo-700"/>
              안전보건관리규정 작성
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              산안법 제25조 | 산안법 시행규칙 별표 3 기반 표준 양식
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.back()} className="btn-secondary">취소</button>
          <button onClick={form.handleSubmit(onSubmit)} disabled={saving}
            className="btn-primary" style={{ background: '#4338ca' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
            저장
          </button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* 기본정보 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">문서 기본정보</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="label-base">규정명 *</label>
              <input {...form.register('title')} className="input-base font-medium"/>
            </div>
            <div>
              <label className="label-base">버전</label>
              <input {...form.register('version', { valueAsNumber: true })} type="number" min="1" className="input-base"/>
            </div>
            <div>
              <label className="label-base">시행일 *</label>
              <input {...form.register('effective_date')} type="date" className="input-base"/>
            </div>
            <div>
              <label className="label-base">승인일</label>
              <input {...form.register('approved_date')} type="date" className="input-base"/>
            </div>
            <div>
              <label className="label-base">개정 사유</label>
              <input {...form.register('revision_reason')} placeholder="최초 제정" className="input-base"/>
            </div>
            <div>
              <label className="label-base">승인자 성명</label>
              <input {...form.register('approver_name')} placeholder="홍길동" className="input-base"/>
            </div>
            <div>
              <label className="label-base">승인자 직위</label>
              <input {...form.register('approver_position')} placeholder="대표이사" className="input-base"/>
            </div>
          </div>
        </div>

        {/* 규정 본문 - 8개 장 */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-800">규정 본문</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">산안법 시행규칙 별표 3 기반 표준 8장 구성 — 각 장을 클릭해 내용을 수정하세요</p>
            </div>
            <button type="button"
              onClick={() => append({ seq: fields.length+1, chapter:`제${fields.length+1}장`, title:'', content:'' })}
              className="btn-secondary text-xs gap-1">
              <Plus className="w-3 h-3"/> 장 추가
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {fields.map((f, idx) => (
              <div key={f.id}>
                {/* 장 헤더 */}
                <button type="button"
                  onClick={() => setExpanded(expanded === idx ? null : idx)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs font-mono text-indigo-600 flex-shrink-0">
                      {form.watch(`sections.${idx}.chapter`)}
                    </span>
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {form.watch(`sections.${idx}.title`) || '(제목 없음)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button type="button" onClick={e => { e.stopPropagation(); remove(idx) }}
                      className="p-1 text-gray-300 hover:text-red-500 rounded">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                    {expanded === idx
                      ? <ChevronUp className="w-4 h-4 text-gray-400"/>
                      : <ChevronDown className="w-4 h-4 text-gray-400"/>}
                  </div>
                </button>
                {/* 장 내용 편집 */}
                {expanded === idx && (
                  <div className="px-5 pb-5 pt-2 bg-indigo-50/20 space-y-3">
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="label-base">장 번호</label>
                        <input {...form.register(`sections.${idx}.chapter`)} className="input-base text-sm"/>
                      </div>
                      <div className="col-span-3">
                        <label className="label-base">장 제목</label>
                        <input {...form.register(`sections.${idx}.title`)} className="input-base text-sm font-medium"/>
                      </div>
                    </div>
                    <div>
                      <label className="label-base">내용 (조항)</label>
                      <textarea {...form.register(`sections.${idx}.content`)}
                        rows={10}
                        className="input-base resize-y text-xs leading-relaxed font-mono"
                        placeholder="조항 내용을 입력하세요."/>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  )
}
