'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Save, Loader2, Plus, Trash2,
  ChevronDown, ChevronUp, Info,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  MATRIX_CONFIGS, calcMatrixLevel, RISK_LEVEL_CFG,
  type MatrixSize,
} from '@/types/risk-method'

const HAZARD_TYPES = [
  '떨어짐',
  '넘어짐',
  '깔림/뒤집힘',
  '부딪힘',
  '물체에 맞음',
  '무너짐',
  '끼임',
  '절단/베임/찔림',
  '화재/폭발/파열',
  '무리한동작',
  '업무상질병',
  '기타',
]

interface MatrixItem {
  seq:           number
  work_content:  string
  hazard_factor: string
  hazard_type:   string
  probability:   number
  severity:      number
  current_measure:   string
  reduce_measure:    string
  measure_owner:     string
  measure_due:       string
  measure_done:      boolean
}

function defaultItem(seq: number, size: MatrixSize): MatrixItem {
  const mid = Math.ceil(size / 2)
  return { seq, work_content:'', hazard_factor:'', hazard_type:'떨어짐',
    probability: mid, severity: mid,
    current_measure:'', reduce_measure:'', measure_owner:'', measure_due:'', measure_done: false }
}

// ─── 매트릭스 시각화 컴포넌트 ─────────────────────────────────
function RiskMatrix({ size, highlight }: { size: MatrixSize; highlight?: { p: number; s: number } }) {
  const cfg = MATRIX_CONFIGS[size]
  return (
    <div className="overflow-x-auto">
      <table className="text-[10px] border-collapse">
        <thead>
          <tr>
            <th className="w-20 p-1 text-right text-gray-400">가능성↓ / 중대성→</th>
            {cfg.sevLabels.map((_, si) => (
              <th key={si} className="w-14 p-1 text-center font-semibold text-gray-600">{si + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: size }, (_, pi) => {
            const prob = pi + 1
            return (
              <tr key={pi}>
                <td className="p-1 text-right text-gray-600 font-semibold">{prob}</td>
                {cfg.sevLabels.map((_, si) => {
                  const sev   = si + 1
                  const score = prob * sev
                  const level = calcMatrixLevel(prob, sev, size)
                  const rc    = RISK_LEVEL_CFG[level]
                  const isHighlighted = highlight?.p === prob && highlight?.s === sev
                  return (
                    <td key={si}
                      className={clsx('w-14 h-10 text-center font-bold rounded-sm transition-all',
                        isHighlighted && 'ring-2 ring-offset-1 ring-blue-500 scale-110 z-10 relative')}
                      style={{ background: rc.bg, color: rc.color, border: `1.5px solid ${rc.border}` }}>
                      {score}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="flex gap-3 mt-2">
        {Object.entries(RISK_LEVEL_CFG).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-[10px]">
            <div className="w-3 h-3 rounded-sm" style={{ background: v.bg, border: `1.5px solid ${v.border}` }} />
            <span style={{ color: v.color }}>{v.label}</span>
            <span className="text-gray-400">
              ({k === 'high' ? `≥${cfg.thresholds.high}` : k === 'medium' ? `${cfg.thresholds.medium}~${cfg.thresholds.high - 1}` : `<${cfg.thresholds.medium}`})
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MatrixMethodPage() {
  const router    = useRouter()
  const [size,    setSize]    = useState<MatrixSize>(5)
  const [items,   setItems]   = useState<MatrixItem[]>([defaultItem(1, 5)])
  const [expanded,setExpanded]= useState<number>(0)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState({
    title: '', eval_type:'initial', eval_date: new Date().toISOString().slice(0,10),
    work_location:'', evaluator_name:'',
  })

  const cfg = MATRIX_CONFIGS[size]

  function addItem() {
    const next = defaultItem(items.length + 1, size)
    setItems(prev => [...prev, next])
    setExpanded(items.length)
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_,i)=>i!==idx).map((it,i)=>({...it,seq:i+1})))
  }

  function updateItem(idx: number, field: keyof MatrixItem, val: any) {
    setItems(prev => prev.map((it,i) => i===idx ? {...it,[field]:val} : it))
  }

  // 매트릭스 크기 변경 시 값 클램프
  function changeSize(s: MatrixSize) {
    setSize(s)
    setItems(prev => prev.map(it => ({
      ...it,
      probability: Math.min(it.probability, s),
      severity:    Math.min(it.severity,    s),
    })))
  }

  async function save() {
    if (!form.title.trim()) { toast.error('제목을 입력하세요.'); return }
    if (items.some(it => !it.hazard_factor.trim())) { toast.error('모든 항목의 유해위험요인을 입력하세요.'); return }
    setSaving(true)
    // eval_date → eval_start_date, eval_end_date (API 호환)
    const payload = {
      title:           form.title,
      eval_type:       form.eval_type,
      eval_start_date: form.eval_date,
      eval_end_date:   form.eval_date,
      work_types:      form.work_location || '해당작업',
      overview:        form.work_location || '',
      eval_method:     'matrix',
      matrix_size:     size,
      items: items.map(it => ({
        seq:                 it.seq,
        work_content:        it.work_content,
        hazard_factor:       it.hazard_factor,
        hazard_type:         it.hazard_type,
        current_probability: it.probability,
        current_severity:    it.severity,
        engineering_measure: it.reduce_measure || null,
        admin_measure:       null,
        ppe_measure:         null,
        measure_owner:       it.measure_owner || null,
        measure_due_date:    it.measure_due || null,
        residual_probability: 1,
        residual_severity:    1,
        link_to_education:   false,
        link_to_work_plan:   false,
      })),
    }
    const res  = await fetch('/api/risk', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('빈도·강도법 위험성평가가 저장되었습니다.')
    router.push(`/risk/${json.data.id}`)
  }

  const highCnt = items.filter(it => calcMatrixLevel(it.probability, it.severity, size) === 'high').length
  const midCnt  = items.filter(it => calcMatrixLevel(it.probability, it.severity, size) === 'medium').length

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/risk/method" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">빈도·강도법 위험성평가</h1>
            <p className="text-xs text-gray-400 mt-0.5">가능성(빈도) × 중대성(강도) | {size}×{size} 매트릭스</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 매트릭스 크기 선택 */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {([3,4,5] as MatrixSize[]).map(s => (
              <button key={s} onClick={() => changeSize(s)}
                className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  size===s ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                {s}×{s}
              </button>
            ))}
          </div>
          <button onClick={save} disabled={saving} className="btn-primary" style={{background:'#2563eb'}}>
            {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}저장
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* 기본정보 */}
        <div className="col-span-2 card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="label-base">제목 *</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="input-base"/></div>
            <div><label className="label-base">평가 유형</label>
              <select value={form.eval_type} onChange={e=>setForm(f=>({...f,eval_type:e.target.value}))} className="input-base">
                {[['initial','최초평가'],['periodic','정기평가'],['special','수시평가'],['always_on','상시평가']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div><label className="label-base">평가일 *</label><input type="date" value={form.eval_date} onChange={e=>setForm(f=>({...f,eval_date:e.target.value}))} className="input-base"/></div>
            <div><label className="label-base">작업 위치</label><input value={form.work_location} onChange={e=>setForm(f=>({...f,work_location:e.target.value}))} className="input-base"/></div>
            <div><label className="label-base">평가자</label><input value={form.evaluator_name} onChange={e=>setForm(f=>({...f,evaluator_name:e.target.value}))} className="input-base"/></div>
          </div>
        </div>

        {/* 매트릭스 미리보기 */}
        <div className="card p-4">
          <div className="text-xs font-semibold text-gray-700 mb-2">{size}×{size} 위험성 매트릭스</div>
          <RiskMatrix size={size} />
        </div>
      </div>

      {/* 기준표 */}
      <div className="card p-4 mb-4">
        <div className="text-xs font-semibold text-gray-700 mb-2">판단 기준 ({size}×{size})</div>
        <div className="grid grid-cols-2 gap-4 text-[10px]">
          <div>
            <div className="font-medium text-gray-600 mb-1">발생 가능성 (빈도)</div>
            {cfg.probLabels.map((l,i) => <div key={i} className="text-gray-500 py-0.5">{l}</div>)}
          </div>
          <div>
            <div className="font-medium text-gray-600 mb-1">중대성 (강도)</div>
            {cfg.sevLabels.map((l,i) => <div key={i} className="text-gray-500 py-0.5">{l}</div>)}
          </div>
        </div>
      </div>

      {/* 통계 */}
      {items.length > 0 && (
        <div className="flex items-center gap-4 mb-3 text-xs">
          <span className="text-gray-500">전체 {items.length}건</span>
          {highCnt > 0 && <span className="text-red-600 font-semibold">• 高위험 {highCnt}건 (즉시 조치)</span>}
          {midCnt  > 0 && <span className="text-amber-600 font-semibold">• 中위험 {midCnt}건 (단기 조치)</span>}
        </div>
      )}

      {/* 위험요인 목록 */}
      <div className="card overflow-hidden mb-4">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-sm">위험요인 항목</h2>
          <button onClick={addItem} className="btn-secondary text-xs gap-1"><Plus className="w-3 h-3"/>항목 추가</button>
        </div>
        <div className="divide-y divide-gray-100">
          {items.map((item, idx) => {
            const score = item.probability * item.severity
            const level = calcMatrixLevel(item.probability, item.severity, size)
            const rc    = RISK_LEVEL_CFG[level]
            return (
              <div key={idx} className={clsx('border-l-4', level==='high'?'border-red-400':level==='medium'?'border-amber-400':'border-green-400')}>
                <button type="button" onClick={() => setExpanded(expanded===idx?-1:idx)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 text-left">
                  <span className="text-xs font-mono text-gray-400 w-5">{item.seq}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {item.hazard_factor || '(유해위험요인 미입력)'}
                      </span>
                      <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-bold')}
                        style={{background:rc.bg,color:rc.color,border:`1px solid ${rc.border}`}}>
                        {rc.short} {score}점
                      </span>
                      <span className="text-[9px] text-gray-400">({item.probability}×{item.severity})</span>
                    </div>
                    {item.work_content && <div className="text-xs text-gray-500 truncate mt-0.5">{item.work_content}</div>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={e=>{e.stopPropagation();removeItem(idx)}} className="p-1 text-gray-300 hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5"/></button>
                    {expanded===idx?<ChevronUp className="w-4 h-4 text-gray-400"/>:<ChevronDown className="w-4 h-4 text-gray-400"/>}
                  </div>
                </button>

                {expanded===idx && (
                  <div className="px-5 pb-5 pt-1 bg-gray-50/40 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2"><label className="label-base">작업 내용</label><input value={item.work_content} onChange={e=>updateItem(idx,'work_content',e.target.value)} className="input-base text-sm"/></div>
                      <div><label className="label-base">위험 유형</label>
                        <select value={item.hazard_type} onChange={e=>updateItem(idx,'hazard_type',e.target.value)} className="input-base text-sm">
                          {HAZARD_TYPES.map(t=><option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="col-span-3"><label className="label-base">유해·위험요인 *</label><input value={item.hazard_factor} onChange={e=>updateItem(idx,'hazard_factor',e.target.value)} placeholder="구체적인 유해위험요인" className="input-base text-sm"/></div>
                      <div className="col-span-3"><label className="label-base">현재 안전조치</label><input value={item.current_measure} onChange={e=>updateItem(idx,'current_measure',e.target.value)} className="input-base text-sm"/></div>
                    </div>

                    {/* 빈도강도 입력 + 매트릭스 */}
                    <div className="grid grid-cols-2 gap-6 items-start">
                      <div className="space-y-3">
                        <div>
                          <label className="label-base">발생 가능성 (빈도) 1~{size}</label>
                          <div className="flex gap-2 mt-1">
                            {Array.from({length:size},(_,i)=>i+1).map(v=>(
                              <button key={v} type="button"
                                onClick={()=>updateItem(idx,'probability',v)}
                                className={clsx('w-10 h-10 rounded-xl text-sm font-bold transition-all border-2',
                                  item.probability===v ? 'text-white' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400')}
                                style={item.probability===v ? {background:'#2563eb',borderColor:'#2563eb'} : {}}>
                                {v}
                              </button>
                            ))}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1">{cfg.probLabels[item.probability-1]}</div>
                        </div>
                        <div>
                          <label className="label-base">중대성 (강도) 1~{size}</label>
                          <div className="flex gap-2 mt-1">
                            {Array.from({length:size},(_,i)=>i+1).map(v=>(
                              <button key={v} type="button"
                                onClick={()=>updateItem(idx,'severity',v)}
                                className={clsx('w-10 h-10 rounded-xl text-sm font-bold transition-all border-2',
                                  item.severity===v ? 'text-white' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400')}
                                style={item.severity===v ? {background:'#dc2626',borderColor:'#dc2626'} : {}}>
                                {v}
                              </button>
                            ))}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1">{cfg.sevLabels[item.severity-1]}</div>
                        </div>
                        <div className="p-3 rounded-xl text-center" style={{background:rc.bg,border:`1.5px solid ${rc.border}`}}>
                          <div className="text-2xl font-bold" style={{color:rc.color}}>{score}점</div>
                          <div className="text-sm font-semibold mt-0.5" style={{color:rc.color}}>{rc.label}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">{item.probability} × {item.severity} = {score}</div>
                        </div>
                      </div>
                      {/* 미니 매트릭스 */}
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-2">현재 위치</div>
                        <RiskMatrix size={size} highlight={{p:item.probability, s:item.severity}} />
                      </div>
                    </div>

                    {/* 감소대책 */}
                    <div className="space-y-2">
                      <div><label className="label-base">위험성 감소대책</label><input value={item.reduce_measure} onChange={e=>updateItem(idx,'reduce_measure',e.target.value)} placeholder="공학적·관리적·보호구 대책" className="input-base text-sm"/></div>
                      <div className="grid grid-cols-3 gap-3 items-end">
                        <div><label className="label-base">담당자</label><input value={item.measure_owner} onChange={e=>updateItem(idx,'measure_owner',e.target.value)} className="input-base text-sm"/></div>
                        <div><label className="label-base">이행기한</label><input type="date" value={item.measure_due} onChange={e=>updateItem(idx,'measure_due',e.target.value)} className="input-base text-sm"/></div>
                        <label className="flex items-center gap-2 pb-1 cursor-pointer">
                          <input type="checkbox" checked={item.measure_done} onChange={e=>updateItem(idx,'measure_done',e.target.checked)} className="w-4 h-4 accent-green-600"/>
                          <span className="text-sm">조치 완료</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="px-5 py-3 border-t border-gray-100">
          <button onClick={addItem} className="btn-secondary text-xs gap-1 w-full justify-center"><Plus className="w-3.5 h-3.5"/>항목 추가</button>
        </div>
      </div>
    </div>
  )
}
