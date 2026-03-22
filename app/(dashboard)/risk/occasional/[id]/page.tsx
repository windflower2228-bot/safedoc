'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, RefreshCw, Loader2, Sparkles, Edit3, AlertTriangle, CheckCircle2, Printer, Save, ChevronDown, ChevronUp } from 'lucide-react'
import { clsx } from 'clsx'
import DocumentPhotoSection from '@/components/common/DocumentPhotoSection'

const RISK_CFG = {
  high:   { label:'高위험', cls:'bg-red-100 text-red-700',    dot:'#dc2626' },
  medium: { label:'中위험', cls:'bg-amber-100 text-amber-700', dot:'#d97706' },
  low:    { label:'低위험', cls:'bg-green-100 text-green-700', dot:'#16a34a' },
}
const OCCASION_LABELS: Record<string,string> = {
  construction_change:'건설물 설치·이전·변경·해체', equipment_new:'기계·기구·설비 신규 도입·변경',
  maintenance:'정비·보수', method_change:'작업방법·절차 변경', accident:'산업재해 발생', other:'기타',
}

export default function OccasionalRiskDetailPage({ params }: { params: { id: string } }) {
  const [doc,      setDoc]      = useState<any>(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [items,    setItems]    = useState<any[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    fetch(`/api/risk/occasional/${params.id}`).then(r=>r.json()).then(j=>{
      setDoc(j.data); setItems(j.data?.risk_items??[]); setLoading(false)
    })
  }, [params.id])

  function updateItem(idx: number, field: string, value: any) {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value, user_edited: true }
      if (field === 'probability' || field === 'severity') {
        const p = field==='probability' ? value : item.probability
        const s = field==='severity'    ? value : item.severity
        updated.risk_score = p * s
        updated.risk_level = p*s >= 15 ? 'high' : p*s >= 8 ? 'medium' : 'low'
      }
      return updated
    }))
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/risk/occasional/${params.id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ risk_items: items, status:'in_review' }),
    })
    setSaving(false)
    if (res.ok) { toast.success('저장되었습니다.'); setDoc((p: any) => ({...p, status:'in_review'})) }
    else toast.error('저장 실패')
  }

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
  if (!doc)    return <div className="text-center text-gray-400 py-16">문서를 찾을 수 없습니다.</div>

  const photos: any[] = doc.photos ?? []
  const highCnt   = items.filter((r:any) => r.risk_level === 'high').length
  const mediumCnt = items.filter((r:any) => r.risk_level === 'medium').length

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/risk/occasional" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-red-600"/>수시 위험성평가
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono text-gray-400">{doc.doc_number}</span>
              <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">{OCCASION_LABELS[doc.occasion_type]??doc.occasion_type}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="btn-secondary gap-1.5"><Printer className="w-4 h-4"/>출력</button>
          <button onClick={save} disabled={saving} className="btn-primary gap-1.5" style={{background:'#dc2626'}}>
            {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}저장
          </button>
        </div>
      </div>

      {/* 기본정보 + 통계 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="col-span-2 card p-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {[['제목', doc.title], ['평가일', doc.eval_date], ['위치', doc.work_location||'—'], ['평가자', doc.evaluator_name||'—']].map(([k,v]) => (
              <div key={k}><span className="text-gray-400 mr-1">{k}:</span><span className="font-medium">{v}</span></div>
            ))}
          </div>
        </div>
        {[{v:items.length, l:'전체', c:'#374151'}, {v:highCnt, l:'高위험', c:'#dc2626'}, {v:mediumCnt, l:'中위험', c:'#d97706'}, {v:photos.length, l:'첨부 사진', c:'#7c3aed'}].map(s => (
          <div key={s.l} className="card p-3 text-center"><div className="text-2xl font-bold" style={{color:s.c}}>{s.v}</div><div className="text-[10px] text-gray-400 mt-0.5">{s.l}</div></div>
        ))}
      </div>

      {/* 사진 */}
      {photos.length > 0 && (
        <div className="card p-4 mb-4">
          <h3 className="text-xs font-semibold text-gray-600 mb-3">현장 사진 ({photos.length}장)</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((p: any, i: number) => (
              <img key={i} src={p.url} alt="" className="w-32 h-24 object-cover rounded-xl flex-shrink-0"/>
            ))}
          </div>
        </div>
      )}

      {/* 위험요인 목록 - 수정 가능 */}
      <div className="card overflow-hidden mb-4">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">위험요인 목록 — 클릭해서 수정 가능</h2>
          <span className="text-[10px] text-gray-400 flex items-center gap-1"><Edit3 className="w-3 h-3"/>항목 클릭 → 내용 수정</span>
        </div>
        <div className="divide-y divide-gray-100">
          {items.map((item: any, idx: number) => {
            const rc = RISK_CFG[item.risk_level as keyof typeof RISK_CFG] ?? RISK_CFG.low
            return (
              <div key={idx} className={clsx('border-l-4', item.risk_level==='high'?'border-red-400':item.risk_level==='medium'?'border-amber-400':'border-green-400')}>
                <button type="button" onClick={() => setExpanded(expanded===idx?null:idx)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 text-left">
                  <span className="text-xs font-mono text-gray-400 w-5 flex-shrink-0">{item.seq}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 truncate">{item.hazard_factor}</span>
                      <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-semibold', rc.cls)}>{rc.label} ({item.risk_score}점)</span>
                      {item.ai_generated && !item.user_edited && <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5"/>AI 생성</span>}
                      {item.user_edited && <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Edit3 className="w-2.5 h-2.5"/>수정됨</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">{item.work_content}</div>
                  </div>
                  {expanded===idx?<ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0"/>:<ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0"/>}
                </button>
                {expanded===idx && (
                  <div className="px-5 pb-5 pt-1 bg-gray-50/40 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2"><label className="label-base">작업 내용</label><input value={item.work_content} onChange={e=>updateItem(idx,'work_content',e.target.value)} className="input-base text-sm"/></div>
                      <div><label className="label-base">위험 유형</label><input value={item.hazard_type} onChange={e=>updateItem(idx,'hazard_type',e.target.value)} className="input-base text-sm"/></div>
                      <div className="col-span-3"><label className="label-base">유해·위험요인</label><input value={item.hazard_factor} onChange={e=>updateItem(idx,'hazard_factor',e.target.value)} className="input-base text-sm"/></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 items-end">
                      <div><label className="label-base">발생 가능성 (1~5)</label><input type="number" min={1} max={5} value={item.probability} onChange={e=>updateItem(idx,'probability',Number(e.target.value))} className="input-base text-center font-bold"/></div>
                      <div><label className="label-base">중대성 (1~5)</label><input type="number" min={1} max={5} value={item.severity} onChange={e=>updateItem(idx,'severity',Number(e.target.value))} className="input-base text-center font-bold"/></div>
                      <div className="text-center pb-1"><div className="text-2xl font-bold" style={{color:rc.dot}}>{item.risk_score}점</div><span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', rc.cls)}>{rc.label}</span></div>
                    </div>
                    <div className="space-y-2">
                      {[['measure_engineering','공학적 대책'],['measure_admin','관리적 대책'],['measure_ppe','보호구 대책']].map(([f,l]) => (
                        <div key={f}><label className="label-base">{l}</label><input value={item[f]} onChange={e=>updateItem(idx,f,e.target.value)} className="input-base text-sm"/></div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-3 items-end">
                      <div><label className="label-base">담당자</label><input value={item.measure_owner} onChange={e=>updateItem(idx,'measure_owner',e.target.value)} className="input-base text-sm"/></div>
                      <div><label className="label-base">이행기한</label><input type="date" value={item.measure_due_date} onChange={e=>updateItem(idx,'measure_due_date',e.target.value)} className="input-base text-sm"/></div>
                      <label className="flex items-center gap-2 pb-1 cursor-pointer">
                        <input type="checkbox" checked={item.measure_done} onChange={e=>updateItem(idx,'measure_done',e.target.checked)} className="w-4 h-4 accent-green-600"/>
                        <span className="text-sm">조치 완료</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <DocumentPhotoSection
        category="risk_occasional"
        docId={doc.id}
        title="수시 위험성평가 첨부 사진"
      />
    </div>
  )
}
