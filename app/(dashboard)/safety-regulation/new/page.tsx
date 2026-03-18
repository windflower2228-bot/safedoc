'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, Plus, Trash2, ScrollText, ChevronDown, ChevronUp } from 'lucide-react'

// 산안법 시행규칙 별표 3 기반 필수 항목
const DEFAULT_SECTIONS = [
  {
    chapter: '제1장', title: '총칙',
    content: `제1조(목적) 이 규정은 산업안전보건법 제25조에 따라 우리 사업장의 안전보건에 관한 사항을 정함으로써 근로자의 안전과 건강을 보호하고 쾌적한 작업환경을 조성함을 목적으로 한다.
제2조(적용범위) 이 규정은 우리 사업장에 근무하는 모든 근로자와 관계 수급인의 근로자에게 적용한다.
제3조(안전보건 목표 및 경영방침) 사업주는 안전보건 목표를 설정하고 이를 달성하기 위한 안전보건 경영방침을 수립·공표한다.`,
  },
  {
    chapter: '제2장', title: '안전보건 관리조직과 그 직무',
    content: `제4조(안전보건관리책임자) 사업주는 안전보건관리책임자를 선임하여 산업안전보건법 제15조에서 정하는 직무를 수행하게 한다.
제5조(관리감독자) 생산과 관련되는 업무를 직접 지휘·감독하는 관리감독자는 산업안전보건법 제16조에서 정하는 직무를 수행한다.
제6조(안전관리자) 사업주는 안전관리자를 선임하여 산업안전보건법 제17조에서 정하는 직무를 수행하게 한다.
제7조(보건관리자) 사업주는 보건관리자를 선임하여 산업안전보건법 제18조에서 정하는 직무를 수행하게 한다.`,
  },
  {
    chapter: '제3장', title: '안전보건교육',
    content: `제8조(교육의 종류 및 내용) 사업주는 산업안전보건법 제29조에 따라 다음 각 호의 안전보건교육을 실시하여야 한다.
1. 정기 안전보건교육
2. 채용 시 교육
3. 작업내용 변경 시 교육
4. 특별 안전보건교육
제9조(교육의 실시 및 기록) 교육 실시 후 교육일지를 작성하여 3년간 보존한다.`,
  },
  {
    chapter: '제4장', title: '작업장 안전관리',
    content: `제10조(위험기계·기구의 방호조치) 위험한 기계·기구에는 산업안전보건법 제80조에 따른 방호조치를 하여야 한다.
제11조(개인보호구 지급 및 관리) 사업주는 유해·위험 작업에 종사하는 근로자에게 보호구를 지급하고 착용을 지도한다.
제12조(위험성평가) 사업주는 산업안전보건법 제36조에 따라 정기 및 수시 위험성평가를 실시한다.
제13조(순회점검) 안전관리자 또는 관리감독자는 월 1회 이상 작업장을 순회 점검한다.`,
  },
  {
    chapter: '제5장', title: '작업환경 관리',
    content: `제14조(작업환경측정) 사업주는 산업안전보건법 제125조에 따라 반기 1회 이상 작업환경측정을 실시하고 결과에 따른 개선조치를 실시한다.
제15조(건강진단) 사업주는 근로자에 대하여 산업안전보건법 제129조부터 제131조에 따른 건강진단을 실시한다.
제16조(유해물질 관리) 유해화학물질을 취급하는 경우 물질안전보건자료(MSDS)를 비치하고 근로자에게 교육한다.`,
  },
  {
    chapter: '제6장', title: '사고 조사 및 보고',
    content: `제17조(산업재해 보고) 산업재해가 발생하면 즉시 관할 지방고용노동관서에 보고하고 산업안전보건법 제57조에 따라 처리한다.
제18조(원인 조사 및 재발 방지) 산업재해 발생 시 원인을 조사·분석하고 재발 방지대책을 수립·시행한다.
제19조(통계 기록·유지) 안전관리자는 산업재해 발생 통계를 기록·유지하고 이를 안전보건관리책임자에게 보고한다.`,
  },
  {
    chapter: '제7장', title: '안전보건관련 문서의 관리',
    content: `제20조(문서의 작성 및 보존) 이 규정에서 정하는 안전보건 관련 문서는 산업안전보건법 시행규칙에서 정하는 기간 동안 보존한다.
제21조(비상연락망) 재해 발생 시 즉시 연락할 수 있는 비상연락망을 작성하여 각 작업장에 게시한다.`,
  },
  {
    chapter: '제8장', title: '보칙',
    content: `제22조(위반 시 조치) 이 규정을 위반한 자에 대하여는 취업규칙 및 사규에 따라 징계 등 필요한 조치를 취한다.
제23조(규정의 개정) 이 규정을 개정하려는 경우에는 산업안전보건위원회(또는 노사협의체)의 심의·의결을 거쳐야 한다.
제24조(시행일) 이 규정은 ____년 __월 __일부터 시행한다.`,
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
