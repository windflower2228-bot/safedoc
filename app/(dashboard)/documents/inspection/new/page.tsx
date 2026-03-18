'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Save, Loader2, Link2, Plus, Trash2, ChevronDown, ChevronUp, ClipboardCheck } from 'lucide-react'
import { clsx } from 'clsx'
import {
  CATEGORY_LABEL, RESULT_LABEL, RESULT_COLOR,
  DEFAULT_CHECK_ITEMS,
  type InspectionCheckItem, type InspectionCategory, type InspectionResult,
} from '@/types/inspection'

const CATEGORIES = Object.entries(CATEGORY_LABEL) as [InspectionCategory, string][]
const RESULTS    = Object.entries(RESULT_LABEL)    as [InspectionResult, string][]

interface FormData {
  inspection_type: string
  inspection_date: string
  inspection_start: string
  inspection_end: string
  inspection_area: string
  weather: string
  inspector_name: string
  inspector_position: string
  inspector_dept: string
  overall_opinion: string
  follow_up_date: string
}

let _seq = 0
const newId = () => _seq++

export default function InspectionNewPage() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const riskId      = searchParams.get('risk_id')

  const [saving,      setSaving]      = useState(false)
  const [generating,  setGenerating]  = useState(false)
  const [riskInfo,    setRiskInfo]    = useState<{id:string;title:string}|null>(null)
  const [checkItems,  setCheckItems]  = useState<(InspectionCheckItem & {_lid:number})[]>([])
  const [expandedCat, setExpandedCat] = useState<string|null>(null)

  const form = useForm<FormData>({
    defaultValues: {
      inspection_type: 'routine',
      inspection_date: new Date().toISOString().slice(0,10),
      inspection_start: '', inspection_end: '',
      inspection_area: '', weather: '',
      inspector_name: '', inspector_position: '안전관리자', inspector_dept: '',
      overall_opinion: '', follow_up_date: '',
    },
  })

  // 위험성평가 연계 자동 생성
  useEffect(() => {
    if (!riskId) return
    setGenerating(true)
    fetch('/api/documents/inspection/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ risk_id: riskId }),
    }).then(r => r.json()).then(j => {
      setGenerating(false)
      if (!j.data) return
      const d = j.data
      form.reset({
        inspection_type:    d.inspection_type,
        inspection_date:    d.inspection_date,
        inspection_area:    d.inspection_area,
        inspector_name:     d.inspector_name,
        inspector_position: d.inspector_position,
        overall_opinion:    d.overall_opinion,
        inspection_start: '', inspection_end: '', weather: '', inspector_dept: '', follow_up_date: '',
      })
      setCheckItems(d.check_items.map((i:InspectionCheckItem) => ({ ...i, _lid: newId() })))
      setRiskInfo({ id: riskId, title: j.data.link_summary.source_risk_title })
      toast.success(`위험성평가 연계 완료 — 점검 항목 ${d.check_items.length}건 자동 생성`)
    })
  }, [riskId])

  // 항목 수정
  function updateItem(lid: number, field: keyof InspectionCheckItem, value: any) {
    setCheckItems(prev => prev.map(i => i._lid === lid ? { ...i, [field]: value } : i))
  }
  function removeItem(lid: number) {
    setCheckItems(prev => prev.filter(i => i._lid !== lid).map((i,idx) => ({ ...i, seq: idx+1 })))
  }
  function addItem(cat: InspectionCategory) {
    setCheckItems(prev => [...prev, {
      _lid: newId(), seq: prev.length+1, category: cat,
      check_content: '', result: 'pass', defect_detail: '',
      action_required: '', action_deadline: '', action_owner: '',
      is_resolved: false, source_risk_item_id: null,
    }])
  }
  function addDefaultItems(cat: InspectionCategory) {
    const templates = DEFAULT_CHECK_ITEMS[cat] ?? []
    const newItems = templates.map(t => ({
      _lid: newId(), seq: 0, category: cat,
      check_content: t, result: 'pass' as InspectionResult,
      defect_detail: '', action_required: '', action_deadline: '',
      action_owner: '', is_resolved: false, source_risk_item_id: null,
    }))
    setCheckItems(prev => {
      const merged = [...prev, ...newItems]
      return merged.map((i,idx) => ({ ...i, seq: idx+1 }))
    })
  }

  async function onSubmit(data: FormData) {
    if (checkItems.length === 0) { toast.error('점검 항목을 최소 1개 추가해주세요.'); return }
    setSaving(true)
    const payload = {
      ...data,
      source_risk_id: riskId ?? null,
      check_items: checkItems.map(({ _lid, ...rest }) => rest),
    }
    const res  = await fetch('/api/documents/inspection', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('순회점검일지가 작성되었습니다.')
    router.push(`/documents/inspection/${json.data.id}`)
  }

  // 카테고리별 그룹
  const grouped = CATEGORIES.map(([cat, label]) => ({
    cat, label,
    items: checkItems.filter(i => i.category === cat),
  })).filter(g => g.items.length > 0)

  const failCount = checkItems.filter(i => i.result === 'fail').length

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-amber-600"/>
            순회점검일지 작성
          </h1>
          {riskInfo && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-blue-600">
              <Link2 className="w-3.5 h-3.5"/>
              위험성평가 연계: {riskInfo.title}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.back()} className="btn-secondary">취소</button>
          <button onClick={form.handleSubmit(onSubmit)} disabled={saving}
            className="btn-primary" style={{background:'#d97706'}}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
            저장
          </button>
        </div>
      </div>

      {generating && (
        <div className="card p-4 mb-4 bg-blue-50 border-blue-200 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin"/>
          <span className="text-sm text-blue-700">위험성평가 데이터를 분석하여 점검 항목을 자동 생성 중...</span>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* 기본정보 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">점검 기본정보</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-base">점검 유형 *</label>
              <select {...form.register('inspection_type')} className="input-base">
                <option value="routine">정기 순회점검</option>
                <option value="special">특별 순회점검</option>
                <option value="safety_day">안전점검의 날</option>
              </select>
            </div>
            <div>
              <label className="label-base">점검 일자 *</label>
              <input {...form.register('inspection_date')} type="date" className="input-base"/>
            </div>
            <div>
              <label className="label-base">날씨</label>
              <input {...form.register('weather')} placeholder="맑음" className="input-base"/>
            </div>
            <div>
              <label className="label-base">시작 시간</label>
              <input {...form.register('inspection_start')} type="time" className="input-base"/>
            </div>
            <div>
              <label className="label-base">종료 시간</label>
              <input {...form.register('inspection_end')} type="time" className="input-base"/>
            </div>
            <div>
              <label className="label-base">점검 구역 *</label>
              <input {...form.register('inspection_area', { required: true })} placeholder="4공구 철골 작업구역" className="input-base"/>
            </div>
            <div>
              <label className="label-base">점검자 성명 *</label>
              <input {...form.register('inspector_name', { required: true })} placeholder="홍길동" className="input-base"/>
            </div>
            <div>
              <label className="label-base">직위 *</label>
              <input {...form.register('inspector_position')} placeholder="안전관리자" className="input-base"/>
            </div>
            <div>
              <label className="label-base">부서</label>
              <input {...form.register('inspector_dept')} placeholder="안전관리팀" className="input-base"/>
            </div>
          </div>
        </div>

        {/* 점검 항목 */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-gray-800">점검 항목</h2>
              <span className="text-xs text-gray-400">{checkItems.length}개</span>
              {failCount > 0 && (
                <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">불량 {failCount}건</span>
              )}
            </div>
            {/* 카테고리 추가 메뉴 */}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.slice(0,5).map(([cat,label]) => (
                <button key={cat} type="button"
                  onClick={() => addDefaultItems(cat)}
                  className="text-xs px-2.5 py-1 bg-gray-50 text-gray-600 rounded-lg border border-gray-200 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-all">
                  + {label}
                </button>
              ))}
            </div>
          </div>

          {checkItems.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              위에서 카테고리를 선택하거나, 위험성평가를 연계하면 항목이 자동 생성됩니다.
            </div>
          ) : (
            <div>
              {grouped.map(g => (
                <div key={g.cat} className="border-b border-gray-100 last:border-b-0">
                  <button type="button"
                    onClick={() => setExpandedCat(expandedCat === g.cat ? null : g.cat)}
                    className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-600">{g.label}</span>
                      <span className="text-[10px] text-gray-400">{g.items.length}개</span>
                      {g.items.filter(i=>i.result==='fail').length > 0 && (
                        <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">
                          불량 {g.items.filter(i=>i.result==='fail').length}건
                        </span>
                      )}
                    </div>
                    {expandedCat === g.cat ? <ChevronUp className="w-3.5 h-3.5 text-gray-400"/> : <ChevronDown className="w-3.5 h-3.5 text-gray-400"/>}
                  </button>

                  {(expandedCat === g.cat || expandedCat === null) && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs" style={{tableLayout:'fixed',minWidth:'900px'}}>
                        <colgroup>
                          <col style={{width:28}}/><col style={{width:220}}/><col style={{width:80}}/><col style={{width:160}}/><col style={{width:120}}/><col style={{width:100}}/><col style={{width:90}}/><col style={{width:28}}/>
                        </colgroup>
                        <thead>
                          <tr className="bg-amber-50 border-b border-amber-100">
                            {['#','점검 내용','결과','불량 내용','조치 요구사항','조치 기한','조치 책임자',''].map(h => (
                              <th key={h} className="px-2 py-2 text-left text-[10px] font-semibold text-amber-800">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {g.items.map(item => {
                            const rc = RESULT_COLOR[item.result]
                            return (
                              <tr key={item._lid} className={clsx('border-b border-gray-100 last:border-b-0', item.result==='fail' && 'bg-red-50/30')}>
                                <td className="px-2 py-2 text-center text-gray-400">{item.seq}</td>
                                <td className="px-2 py-1.5">
                                  <input value={item.check_content} onChange={e => updateItem(item._lid,'check_content',e.target.value)}
                                    className="w-full bg-transparent text-xs outline-none focus:bg-amber-50 focus:rounded focus:px-1"/>
                                </td>
                                <td className="px-2 py-1.5">
                                  <select value={item.result} onChange={e => updateItem(item._lid,'result',e.target.value as InspectionResult)}
                                    className={clsx('text-[10px] font-medium rounded-full px-2 py-0.5 border-none outline-none cursor-pointer', rc.bg, rc.text)}>
                                    {RESULTS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                                  </select>
                                </td>
                                <td className="px-2 py-1.5">
                                  <input value={item.defect_detail} onChange={e => updateItem(item._lid,'defect_detail',e.target.value)}
                                    disabled={item.result !== 'fail'}
                                    className="w-full bg-transparent text-xs outline-none focus:bg-red-50 focus:rounded focus:px-1 disabled:opacity-30"/>
                                </td>
                                <td className="px-2 py-1.5">
                                  <input value={item.action_required} onChange={e => updateItem(item._lid,'action_required',e.target.value)}
                                    className="w-full bg-transparent text-xs outline-none focus:bg-amber-50 focus:rounded focus:px-1"/>
                                </td>
                                <td className="px-2 py-1.5">
                                  <input type="date" value={item.action_deadline} onChange={e => updateItem(item._lid,'action_deadline',e.target.value)}
                                    className="w-full bg-transparent text-xs outline-none"/>
                                </td>
                                <td className="px-2 py-1.5">
                                  <input value={item.action_owner} onChange={e => updateItem(item._lid,'action_owner',e.target.value)}
                                    className="w-full bg-transparent text-xs outline-none focus:bg-amber-50 focus:rounded focus:px-1"/>
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                  <button type="button" onClick={() => removeItem(item._lid)}
                                    className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded">
                                    <Trash2 className="w-3 h-3"/>
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="px-5 py-2 border-t border-gray-50">
                    <button type="button" onClick={() => addItem(g.cat)}
                      className="text-xs text-amber-600 hover:underline flex items-center gap-1">
                      <Plus className="w-3 h-3"/> {g.label} 항목 추가
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 총평 */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-3">점검 총평 및 후속 조치</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-base">점검 총평</label>
              <textarea {...form.register('overall_opinion')} rows={4}
                className="input-base resize-none text-sm"
                placeholder="전반적인 점검 결과 및 특이사항을 입력하세요."/>
            </div>
            <div>
              <label className="label-base">재점검 예정일</label>
              <input {...form.register('follow_up_date')} type="date" className="input-base"/>
              <p className="text-xs text-gray-400 mt-1.5">불량 항목이 있는 경우 조치 완료 후 재점검 일자를 기재하세요.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
