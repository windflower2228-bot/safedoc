'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  ChevronLeft, ChevronRight, Plus, X, Check, Loader2,
  Bell, Trash2, CalendarDays, TrendingUp, AlertTriangle,
  Clock, RotateCcw, Edit2,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_COLORS,
  calcDday, getDdayStyle, calcCompletionRate,
  type ActivityPlanItem, type ActivityType, type NotifyChannel,
} from '@/types/plan'

/* ── 상수 ──────────────────────────────────────────────────────── */
const WEEKDAYS  = ['일','월','화','수','목','금','토']
const TYPE_LIST = Object.entries(ACTIVITY_TYPE_LABELS) as [ActivityType, string][]
const MONTHS    = [1,2,3,4,5,6,7,8,9,10,11,12]
const pad = (n: number) => String(n).padStart(2,'0')
const toDS = (y:number,m:number,d:number) => `${y}-${pad(m)}-${pad(d)}`

type ViewMode  = 'cal' | 'annual'
type SortMode  = 'date' | 'type' | 'undone'
type AnnFilter = 'all' | 'undone' | 'done'

interface ModalForm {
  title:              string
  activity_type:      ActivityType
  scheduled_date:     string
  scheduled_time:     string
  description:        string
  notify_channel:     NotifyChannel
  notify_days_before: string
}

/* ── 달력 빌더 ─────────────────────────────────────────────────── */
function buildCal(year:number, month:number) {
  const first = new Date(year,month-1,1).getDay()
  const last  = new Date(year,month,0).getDate()
  const weeks:(number|null)[][] = []
  let week:(number|null)[] = Array(first).fill(null)
  for (let d=1;d<=last;d++) {
    week.push(d)
    if (week.length===7) { weeks.push(week); week=[] }
  }
  if (week.length) { while (week.length<7) week.push(null); weeks.push(week) }
  return weeks
}

/* ── 메인 컴포넌트 ─────────────────────────────────────────────── */
export default function PlanPage() {
  const today = new Date()
  const [cur,       setCur]      = useState({ y: today.getFullYear(), m: today.getMonth()+1 })
  const [view,      setView]     = useState<ViewMode>('cal')
  const [sort,      setSort]     = useState<SortMode>('date')
  const [annFilter, setAnnFilt]  = useState<AnnFilter>('all')

  // 데이터
  const [monthItems,  setMonthItems]  = useState<ActivityPlanItem[]>([])
  const [annualItems, setAnnualItems] = useState<ActivityPlanItem[]>([])
  const [planId,      setPlanId]      = useState<string|null>(null)
  const [loading,     setLoading]     = useState(false)

  // 연계 하이라이트
  const [hlDate, setHlDate] = useState<string|null>(null)
  const [hlId,   setHlId]   = useState<string|null>(null)

  // 모달
  const [modal, setModal] = useState<{open:boolean;id:string|null;date:string}>({open:false,id:null,date:''})
  const [saving,setSaving] = useState(false)

  const { register, handleSubmit, reset, watch, setValue } = useForm<ModalForm>({
    defaultValues: { title:'', activity_type:'other', scheduled_date:'',
      scheduled_time:'', description:'', notify_channel:'email', notify_days_before:'1,3' },
  })
  const mType = watch('activity_type') as ActivityType

  /* ── 데이터 로드 ─────────────────────────────────────────────── */
  const loadMonth = useCallback(async () => {
    setLoading(true)
    const res  = await fetch(`/api/plan?year=${cur.y}&month=${cur.m}`)
    const json = await res.json()
    setLoading(false)
    setPlanId(json.data?.id ?? null)
    setMonthItems(json.items ?? [])
  }, [cur])

  const loadAnnual = useCallback(async () => {
    setLoading(true)
    const res  = await fetch(`/api/plan/annual?year=${cur.y}`)
    const json = await res.json()
    setLoading(false)
    setAnnualItems(json.data ?? [])
  }, [cur.y])

  useEffect(() => { loadMonth() }, [loadMonth])
  useEffect(() => { if (view==='annual') loadAnnual() }, [view, loadAnnual])

  /* ── 뷰 전환 ─────────────────────────────────────────────────── */
  function switchView(v:ViewMode) {
    setView(v); setHlDate(null); setHlId(null)
  }

  /* ── 인라인 편집 (표) ────────────────────────────────────────── */
  async function updField(id:string, field:string, value:string) {
    const res = await fetch(`/api/plan/${id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ [field]: value }),
    })
    if (res.ok) {
      const upd = (i:ActivityPlanItem) => i.id===id ? {...i,[field]:value} : i
      setMonthItems(p => p.map(upd))
      setAnnualItems(p => p.map(upd))
      if (field==='scheduled_date') setHlDate(value)
    }
  }

  /* ── 완료 토글 ───────────────────────────────────────────────── */
  async function toggleDone(item:ActivityPlanItem, e:React.MouseEvent) {
    e.stopPropagation()
    const action = item.is_completed ? 'uncomplete' : 'complete'
    const res = await fetch(`/api/plan/${item.id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      toast.success(action==='complete' ? '완료 처리' : '미완료로 되돌림')
      const upd = (i:ActivityPlanItem) => i.id===item.id
        ? { ...i, is_completed:action==='complete', completed_at: action==='complete' ? new Date().toISOString() : null }
        : i
      setMonthItems(p=>p.map(upd)); setAnnualItems(p=>p.map(upd))
    }
  }

  /* ── 삭제 ───────────────────────────────────────────────────── */
  async function deleteItem(id:string, e?:React.MouseEvent) {
    e?.stopPropagation()
    if (!confirm('삭제하시겠습니까?')) return
    const res = await fetch(`/api/plan/${id}`, { method:'DELETE' })
    if (res.ok) {
      toast.success('삭제되었습니다.')
      setMonthItems(p=>p.filter(i=>i.id!==id))
      setAnnualItems(p=>p.filter(i=>i.id!==id))
      if (hlId===id) setHlId(null)
      setModal(m=>({...m,open:false}))
    }
  }

  /* ── 저장 ───────────────────────────────────────────────────── */
  async function onSave(data:ModalForm) {
    setSaving(true)
    const payload = { ...data,
      notify_days_before: data.notify_days_before.split(',').map(s=>parseInt(s.trim())).filter(n=>!isNaN(n)&&n>0),
    }
    // 날짜에서 year/month 추출
    const [sy,sm] = data.scheduled_date.split('-').map(Number)

    if (modal.id) {
      const res = await fetch(`/api/plan/${modal.id}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload),
      })
      if (res.ok) { toast.success('수정되었습니다.'); await loadMonth(); await loadAnnual() }
    } else {
      let pid = planId
      // 대상 월의 계획표가 없으면 생성
      if (!pid || sy!==cur.y || sm!==cur.m) {
        const pr = await fetch('/api/plan', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ year:sy, month:sm, items:[] }),
        })
        const pj = await pr.json()
        if (pr.ok) { pid=pj.data.id; if (sy===cur.y&&sm===cur.m) setPlanId(pid) }
      }
      const res = await fetch('/api/plan/item', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ plan_id:pid, ...payload }),
      })
      if (res.ok) { toast.success('추가되었습니다.'); setHlDate(data.scheduled_date); await loadMonth(); await loadAnnual() }
    }
    setSaving(false)
    setModal(m=>({...m,open:false}))
  }

  /* ── 모달 열기 ───────────────────────────────────────────────── */
  function openModal(id:string|null, date:string) {
    const allItems = [...monthItems, ...annualItems]
    const item = id ? allItems.find(i=>i.id===id) : null
    reset({
      title:              item?.title ?? '',
      activity_type:      (item?.activity_type ?? 'other') as ActivityType,
      scheduled_date:     item?.scheduled_date ?? date,
      scheduled_time:     item?.scheduled_time ?? '',
      description:        item?.description ?? '',
      notify_channel:     (item?.notify_channel ?? 'email') as NotifyChannel,
      notify_days_before: (item?.notify_days_before ?? [1,3]).join(','),
    })
    setModal({ open:true, id, date: item?.scheduled_date ?? date })
  }

  /* ── 연간 표에서 셀 클릭 → 월간 뷰로 이동 ─────────────────── */
  function onAnnCellClick(m:number) {
    setCur(prev=>({ y:prev.y, m }))
    switchView('cal')
  }

  /* ── 정렬된 월간 항목 ────────────────────────────────────────── */
  function sortedMonth():ActivityPlanItem[] {
    let list = [...monthItems]
    if (sort==='type')   list.sort((a,b)=>a.activity_type.localeCompare(b.activity_type)||a.scheduled_date.localeCompare(b.scheduled_date))
    else if (sort==='undone') list=list.filter(i=>!i.is_completed).sort((a,b)=>a.scheduled_date.localeCompare(b.scheduled_date))
    else list.sort((a,b)=>a.scheduled_date.localeCompare(b.scheduled_date))
    return list
  }

  /* ── 연간 필터 ───────────────────────────────────────────────── */
  function filteredAnnual():ActivityPlanItem[] {
    if (annFilter==='undone') return annualItems.filter(i=>!i.is_completed)
    if (annFilter==='done')   return annualItems.filter(i=>i.is_completed)
    return annualItems
  }

  /* ── 통계 계산 ───────────────────────────────────────────────── */
  const scope       = view==='annual' ? annualItems : monthItems
  const rate        = calcCompletionRate(scope)
  const urgentCount = scope.filter(i=>!i.is_completed&&calcDday(i.scheduled_date)>=0&&calcDday(i.scheduled_date)<=3).length
  const overCount   = scope.filter(i=>!i.is_completed&&calcDday(i.scheduled_date)<0).length

  const weeks = buildCal(cur.y, cur.m)

  return (
    <div>
      {/* ── 헤더 ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (view==='annual') { setCur(p=>({...p,y:p.y-1})) }
              else { const m=cur.m===1?{y:cur.y-1,m:12}:{y:cur.y,m:cur.m-1}; setCur(m) }
              setHlDate(null); setHlId(null)
            }}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-base font-bold min-w-[100px] text-center">
            {view==='annual' ? `${cur.y}년` : `${cur.y}년 ${cur.m}월`}
          </span>
          <button
            onClick={() => {
              if (view==='annual') { setCur(p=>({...p,y:p.y+1})) }
              else { const m=cur.m===12?{y:cur.y+1,m:1}:{y:cur.y,m:cur.m+1}; setCur(m) }
              setHlDate(null); setHlId(null)
            }}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setCur({y:today.getFullYear(),m:today.getMonth()+1}); setHlDate(null); setHlId(null) }}
            className="text-xs text-blue-600 hover:underline px-1">오늘</button>
          {loading && <Loader2 className="w-3.5 h-3.5 text-gray-300 animate-spin" />}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
            {([['cal','달력+월간표'],['annual','연간 계획']] as [ViewMode,string][]).map(([v,l]) => (
              <button key={v} onClick={() => switchView(v)}
                className={clsx('px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  view===v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
                {l}
              </button>
            ))}
          </div>
          <button
            onClick={() => openModal(null, view==='annual' ? `${cur.y}-01-01` : toDS(cur.y,cur.m,Math.min(today.getDate(),new Date(cur.y,cur.m,0).getDate())))}
            className="btn-primary text-sm" style={{background:'#2563eb'}}>
            <Plus className="w-4 h-4" /> 일정 추가
          </button>
        </div>
      </div>

      {/* ── 통계 ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: view==='annual' ? `${cur.y}년 전체` : `${cur.m}월 일정`, value:scope.length, icon:CalendarDays, cls:'text-blue-600', bg:'bg-blue-50' },
          { label:'이행률',   value:`${rate}%`,      icon:TrendingUp,    cls:'text-green-600', bg:'bg-green-50' },
          { label:'기한 임박', value:urgentCount,     icon:Clock,         cls:'text-amber-600', bg:'bg-amber-50' },
          { label:'기한 초과', value:overCount,       icon:AlertTriangle, cls:'text-red-600',   bg:'bg-red-50'   },
        ].map(s => { const Icon=s.icon; return (
          <div key={s.label} className="card p-3 flex items-center gap-2.5">
            <div className={`${s.bg} p-2 rounded-xl flex-shrink-0`}><Icon className={`w-4 h-4 ${s.cls}`} /></div>
            <div><div className="text-[10px] text-gray-400">{s.label}</div><div className={`text-lg font-bold ${s.cls}`}>{s.value}</div></div>
          </div>
        )})}
      </div>

      {/* 이행률 바 */}
      {scope.length > 0 && (
        <div className="card px-4 py-3 mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-500">{view==='annual' ? `${cur.y}년 연간 이행률` : `${cur.m}월 이행률`}</span>
            <span className="font-bold text-blue-600">{rate}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{width:`${rate}%`}} />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>완료 {scope.filter(i=>i.is_completed).length}건</span>
            <span>미완료 {scope.filter(i=>!i.is_completed).length}건</span>
          </div>
        </div>
      )}

      {/* ── 달력 + 월간표 뷰 ──────────────────────────────────── */}
      {view === 'cal' && (
        <>
          {/* 달력 */}
          <div className="card overflow-hidden mb-3">
            <div className="grid grid-cols-7 border-b border-gray-100">
              {WEEKDAYS.map((d,i) => (
                <div key={d} className={clsx('py-2 text-center text-[10px] font-semibold',
                  i===0?'text-red-500':i===6?'text-blue-500':'text-gray-400')}>{d}</div>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 border-b border-gray-100 last:border-b-0">
                {week.map((day, di) => {
                  if (!day) return <div key={di} className="min-h-[78px] bg-gray-50/40 border-r border-gray-100 last:border-r-0" />
                  const ds2      = toDS(cur.y,cur.m,day)
                  const isToday  = day===today.getDate()&&cur.m===today.getMonth()+1&&cur.y===today.getFullYear()
                  const isSel    = ds2===hlDate
                  const dayItems = monthItems.filter(i=>i.scheduled_date===ds2)
                    .sort((a,b)=>(a.scheduled_time||'').localeCompare(b.scheduled_time||''))
                  return (
                    <div key={di}
                      onClick={() => { setHlDate(p=>p===ds2?null:ds2); setHlId(null) }}
                      className={clsx('min-h-[78px] p-1.5 border-r border-gray-100 last:border-r-0 cursor-pointer transition-colors group relative',
                        di===0?'bg-red-50/20':di===6?'bg-blue-50/20':'bg-white',
                        isSel?'ring-2 ring-inset ring-blue-500 bg-blue-50/40':'hover:bg-blue-50/20')}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={clsx('w-5 h-5 flex items-center justify-center text-[10px] font-medium rounded-full',
                          isToday?'bg-blue-600 text-white':di===0?'text-red-500':di===6?'text-blue-500':'text-gray-600')}>
                          {day}
                        </span>
                        <span onClick={e=>{e.stopPropagation();openModal(null,ds2)}}
                          className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-blue-400 hover:bg-blue-100 rounded cursor-pointer text-sm">+</span>
                      </div>
                      <div className="space-y-0.5">
                        {dayItems.slice(0,3).map(item => {
                          const tc=ACTIVITY_TYPE_COLORS[item.activity_type as ActivityType]
                          const dds=getDdayStyle(calcDday(item.scheduled_date),item.is_completed)
                          return (
                            <div key={item.id}
                              onClick={e=>{e.stopPropagation();setHlId(p=>p===item.id?null:item.id);setHlDate(null)}}
                              className={clsx('flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] cursor-pointer',
                                tc.bg, tc.text, item.is_completed&&'opacity-40', hlId===item.id&&'ring-1 ring-current')}>
                              <button onClick={e=>toggleDone(item,e)}
                                className={clsx('w-2.5 h-2.5 rounded-full border flex items-center justify-center flex-shrink-0',
                                  item.is_completed?'bg-green-500 border-green-500':'border-current opacity-60')}>
                                {item.is_completed && <Check className="w-1.5 h-1.5 text-white" />}
                              </button>
                              <span className={clsx('flex-1 truncate',item.is_completed&&'line-through')}>{item.title}</span>
                            </div>
                          )
                        })}
                        {dayItems.length>3 && <div className="text-[9px] text-gray-400 pl-1">+{dayItems.length-3}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* 월간 표 */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <span className="text-xs text-gray-500">{sortedMonth().length}건</span>
              <div className="flex gap-1.5">
                {([['date','날짜순'],['type','유형순'],['undone','미완료만']] as [SortMode,string][]).map(([s,l]) => (
                  <button key={s} onClick={()=>setSort(s)}
                    className={clsx('text-[10px] px-2.5 py-1 rounded-md border transition-all',
                      sort===s?'bg-blue-50 text-blue-700 border-blue-200':'bg-white text-gray-500 border-gray-200')}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {sortedMonth().length===0 ? (
              <div className="py-10 text-center text-sm text-gray-400">일정이 없습니다. 달력에서 날짜를 클릭하거나 + 일정 추가를 눌러주세요.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{tableLayout:'fixed'}}>
                  <colgroup><col style={{width:32}}/><col style={{width:96}}/><col/><col style={{width:108}}/><col style={{width:66}}/><col style={{width:48}}/></colgroup>
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-2 py-2 text-[10px] font-semibold text-gray-400"/>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400">유형</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400">일정명</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400">예정일</th>
                      <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-400">D-day</th>
                      <th className="px-1 py-2"/>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sortedMonth().map(item => {
                      const tc  = ACTIVITY_TYPE_COLORS[item.activity_type as ActivityType]
                      const dds = getDdayStyle(calcDday(item.scheduled_date),item.is_completed)
                      const isHl= item.scheduled_date===hlDate||item.id===hlId
                      return (
                        <tr key={item.id}
                          className={clsx('group hover:bg-gray-50 transition-colors',isHl&&'bg-blue-50/40')}
                          onClick={()=>{setHlId(p=>p===item.id?null:item.id);setHlDate(null)}}>
                          <td className="px-2 py-2 text-center">
                            <button onClick={e=>toggleDone(item,e)}
                              className={clsx('w-4 h-4 rounded-full border-2 flex items-center justify-center mx-auto',
                                item.is_completed?'bg-green-500 border-green-500':'border-gray-300 hover:border-green-400')}>
                              {item.is_completed && <Check className="w-2 h-2 text-white" />}
                            </button>
                          </td>
                          <td className="px-2 py-1.5" onClick={e=>e.stopPropagation()}>
                            <select value={item.activity_type}
                              onChange={e=>updField(item.id,'activity_type',e.target.value)}
                              className={clsx('text-[9px] font-medium rounded-full px-2 py-0.5 border-none outline-none cursor-pointer',tc.bg,tc.text)}>
                              {TYPE_LIST.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-1.5" onClick={e=>e.stopPropagation()}>
                            <input defaultValue={item.title}
                              onBlur={e=>{if(e.target.value!==item.title) updField(item.id,'title',e.target.value)}}
                              onKeyDown={e=>{if(e.key==='Enter')(e.target as HTMLInputElement).blur()}}
                              className={clsx('w-full bg-transparent text-sm font-medium text-gray-900 outline-none focus:bg-blue-50 focus:rounded focus:px-2 transition-all',
                                item.is_completed&&'line-through text-gray-400')}/>
                          </td>
                          <td className="px-2 py-1.5" onClick={e=>e.stopPropagation()}>
                            <input type="date" defaultValue={item.scheduled_date}
                              onChange={e=>updField(item.id,'scheduled_date',e.target.value)}
                              className="bg-transparent text-xs text-gray-500 outline-none cursor-pointer w-full"/>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className={clsx('inline-flex items-center px-1.5 py-0.5 text-[9px] font-medium rounded-full',dds.cls)}>
                              {dds.text}
                            </span>
                          </td>
                          <td className="px-1 py-2">
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                              <button onClick={e=>{e.stopPropagation();openModal(item.id,item.scheduled_date)}} className="p-1 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded"><Edit2 className="w-3 h-3"/></button>
                              <button onClick={e=>{e.stopPropagation();deleteItem(item.id)}} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3"/></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <button onClick={()=>openModal(null,toDS(cur.y,cur.m,1))}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-50 border-t border-gray-100 transition-colors">
              <Plus className="w-3.5 h-3.5"/> 새 일정 추가
            </button>
          </div>
        </>
      )}

      {/* ── 연간 계획 뷰 ─────────────────────────────────────── */}
      {view === 'annual' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-semibold text-gray-800">{cur.y}년 연간 안전보건활동계획표</span>
            <div className="flex gap-1.5">
              {([['all','전체'],['undone','미완료'],['done','완료']] as [AnnFilter,string][]).map(([f,l]) => (
                <button key={f} onClick={()=>setAnnFilt(f)}
                  className={clsx('text-[10px] px-2.5 py-1 rounded-md border transition-all',
                    annFilter===f?'bg-blue-50 text-blue-700 border-blue-200':'bg-white text-gray-500 border-gray-200')}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs" style={{tableLayout:'fixed',minWidth:'900px'}}>
              <colgroup>
                <col style={{width:'110px'}}/>
                {MONTHS.map(m=><col key={m} style={{width:`${(100-12)/12}%`}}/>)}
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 bg-gray-50 border-r border-gray-200 sticky left-0">활동 유형</th>
                  {MONTHS.map(m => {
                    const isCur = m===cur.m&&cur.y===today.getFullYear()
                    return (
                      <th key={m}
                        className={clsx('py-2.5 text-center text-[10px] font-semibold border-r border-gray-100 last:border-r-0',
                          isCur?'text-blue-600 bg-blue-50/60':'text-gray-500 bg-gray-50')}>
                        {m}월
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {TYPE_LIST.map(([type, typeLabel]) => {
                  const filtered = filteredAnnual().filter(i=>i.activity_type===type)
                  // 이 유형에 해당 연도 데이터가 전혀 없으면 숨김 (all 필터 시에도 행은 표시)
                  return (
                    <tr key={type} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                      {/* 행 헤더 */}
                      <td className="px-3 py-2 border-r border-gray-200 bg-gray-50 sticky left-0">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:ACTIVITY_TYPE_COLORS[type]?.text||'#888'}}/>
                          <span className="font-medium text-gray-700 text-[11px]">{typeLabel}</span>
                        </div>
                        <div className="text-[9px] text-gray-400 mt-0.5 pl-4">
                          {filteredAnnual().filter(i=>i.activity_type===type).length}건
                        </div>
                      </td>
                      {/* 월별 셀 */}
                      {MONTHS.map(m => {
                        const tc       = ACTIVITY_TYPE_COLORS[type]
                        const cellItems= filtered.filter(i=>i.scheduled_date.startsWith(`${cur.y}-${pad(m)}-`))
                        const isCur    = m===cur.m&&cur.y===today.getFullYear()
                        const isHlCell = hlDate?.startsWith(`${cur.y}-${pad(m)}-`)
                        return (
                          <td key={m}
                            onClick={() => onAnnCellClick(m)}
                            className={clsx('py-1.5 px-1.5 border-r border-gray-100 last:border-r-0 cursor-pointer align-top min-h-[52px] group',
                              isCur&&'bg-blue-50/30',
                              isHlCell&&'bg-blue-100/50 ring-1 ring-inset ring-blue-400')}>
                            {cellItems.length===0 ? (
                              <div className="text-[9px] text-gray-200 text-center py-1">—</div>
                            ) : (
                              <div className="space-y-0.5">
                                {cellItems.slice(0,2).map(item => {
                                  const dds = getDdayStyle(calcDday(item.scheduled_date),item.is_completed)
                                  return (
                                    <div key={item.id}
                                      onClick={e=>{e.stopPropagation();openModal(item.id,item.scheduled_date)}}
                                      className={clsx('flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] leading-tight cursor-pointer hover:opacity-75',
                                        tc.bg, tc.text, item.is_completed&&'opacity-40')}>
                                      <button onClick={e=>toggleDone(item,e)}
                                        className={clsx('w-2 h-2 rounded-full border flex items-center justify-center flex-shrink-0',
                                          item.is_completed?'bg-green-500 border-green-500':'border-current opacity-50')}>
                                        {item.is_completed&&<Check className="w-1 h-1 text-white"/>}
                                      </button>
                                      <span className={clsx('flex-1 truncate',item.is_completed&&'line-through')}>
                                        {item.scheduled_date.slice(8)}일
                                      </span>
                                    </div>
                                  )
                                })}
                                {cellItems.length>2&&<div className="text-[8px] text-gray-400 pl-1">+{cellItems.length-2}</div>}
                              </div>
                            )}
                            {/* 추가 버튼 */}
                            <div onClick={e=>{e.stopPropagation();openModal(null,`${cur.y}-${pad(m)}-01`)}}
                              className="text-[8px] text-blue-400 text-center opacity-0 group-hover:opacity-100 cursor-pointer mt-0.5 hover:text-blue-600">
                              + 추가
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 연간 표 범례 */}
          <div className="flex flex-wrap gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50">
            {TYPE_LIST.map(([type,label]) => {
              const tc = ACTIVITY_TYPE_COLORS[type]
              return (
                <div key={type} className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <div className="w-2 h-2 rounded-full" style={{background:tc.text}}/>
                  {label}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 모달 ─────────────────────────────────────────────── */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{background:'rgba(0,0,0,0.4)'}}
          onClick={()=>setModal(m=>({...m,open:false}))}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">{modal.id?'일정 편집':'일정 추가'}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{modal.date.replace(/-/g,'. ')}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {modal.id && (() => {
                  const all=[...monthItems,...annualItems]
                  const item=all.find(i=>i.id===modal.id)
                  return item ? (
                    <button onClick={e=>{toggleDone(item,e);setModal(m=>({...m,open:false}))}}
                      className={clsx('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium',
                        item.is_completed?'bg-gray-100 text-gray-500':'bg-green-50 text-green-600')}>
                      {item.is_completed?<><RotateCcw className="w-3 h-3"/>미완료로</>:<><Check className="w-3 h-3"/>완료</>}
                    </button>
                  ) : null
                })()}
                <button onClick={()=>setModal(m=>({...m,open:false}))}
                  className="p-1.5 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4"/></button>
              </div>
            </div>
            <form onSubmit={handleSubmit(onSave)} className="p-5 space-y-3.5">
              <div>
                <label className="label-base">활동 유형</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {TYPE_LIST.map(([v,l]) => {
                    const tc=ACTIVITY_TYPE_COLORS[v]
                    return (
                      <button key={v} type="button" onClick={()=>setValue('activity_type',v)}
                        className={clsx('px-2 py-1 rounded-full text-[10px] font-medium border transition-all',
                          mType===v?`${tc.bg} ${tc.text} border-current`:'bg-gray-50 text-gray-400 border-transparent')}>
                        {l}
                      </button>
                    )
                  })}
                </div>
                <input type="hidden" {...register('activity_type')}/>
              </div>
              <div><label className="label-base">일정명 *</label><input {...register('title',{required:true})} placeholder="일정명을 입력하세요" className="input-base" autoFocus/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label-base">예정일</label><input {...register('scheduled_date')} type="date" className="input-base"/></div>
                <div><label className="label-base">시간</label><input {...register('scheduled_time')} type="time" className="input-base"/></div>
              </div>
              <div><label className="label-base">메모</label><textarea {...register('description')} rows={2} className="input-base resize-none text-sm"/></div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                <p className="text-[10px] font-medium text-gray-500 flex items-center gap-1"><Bell className="w-3 h-3"/>알림 설정</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="label-base text-[10px]">방식</label>
                    <select {...register('notify_channel')} className="input-base text-xs py-1.5">
                      <option value="email">이메일</option><option value="kakao">카카오</option>
                      <option value="both">이메일+카카오</option><option value="none">없음</option>
                    </select>
                  </div>
                  <div><label className="label-base text-[10px]">사전 알림 (일 전)</label>
                    <input {...register('notify_days_before')} placeholder="1,3,7" className="input-base text-xs py-1.5"/>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                {modal.id&&(<button type="button" onClick={()=>deleteItem(modal.id!)} className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100">삭제</button>)}
                <button type="button" onClick={()=>setModal(m=>({...m,open:false}))} className="btn-secondary flex-1 justify-center text-sm">취소</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center text-sm" style={{background:'#2563eb'}}>
                  {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Check className="w-4 h-4"/>}
                  {modal.id?'수정':'추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
