'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, Users, ChevronDown, ChevronUp, Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { clsx } from 'clsx'

// ─── 근골격계부담작업 11가지 (고용노동부고시 제2020-12호) ──────
const BURDEN_WORK_LIST = [
  { seq:1,  description: '하루에 4시간 이상 집중적으로 자료입력 등을 위해 키보드 또는 마우스를 조작하는 작업' },
  { seq:2,  description: '하루에 총 2시간 이상 목, 어깨, 팔꿈치, 손목 또는 손을 사용하여 같은 동작을 반복하는 작업' },
  { seq:3,  description: '하루에 총 2시간 이상 머리 위에 손이 있거나, 팔꿈치가 어깨위에 있거나, 팔꿈치를 몸통으로부터 들거나, 팔꿈치를 몸통 뒤쪽에 위치하도록 하는 상태에서 이루어지는 작업' },
  { seq:4,  description: '지지되지 않은 상태이거나 임의로 자세를 바꿀 수 없는 조건에서 하루에 총 2시간 이상 목이나 허리를 구부리거나 트는 상태에서 이루어지는 작업' },
  { seq:5,  description: '하루에 총 2시간 이상 쪼그리고 앉거나 무릎을 굽힌 자세에서 이루어지는 작업' },
  { seq:6,  description: '하루에 총 2시간 이상 지지되지 않은 상태에서 1㎏ 이상의 물건을 한 손의 손가락으로 집어 옮기거나, 2㎏ 이상에 상당하는 힘을 가하여 한 손의 손가락으로 물건을 쥐는 작업' },
  { seq:7,  description: '하루에 총 2시간 이상 지지되지 않은 상태에서 4.5㎏ 이상의 물건을 한 손으로 들거나 동일한 힘으로 쥐는 작업' },
  { seq:8,  description: '하루에 10회 이상 25㎏ 이상의 물체를 드는 작업' },
  { seq:9,  description: '하루에 25회 이상 10㎏ 이상의 물체를 무릎 아래에서 들거나, 어깨 위에서 들거나, 팔을 뻗은 상태에서 드는 작업' },
  { seq:10, description: '하루에 총 2시간 이상, 분당 2회 이상 4.5㎏ 이상의 물체를 드는 작업' },
  { seq:11, description: '하루에 총 2시간 이상 시간당 10회 이상 손 또는 무릎을 사용하여 반복적으로 충격을 가하는 작업' },
]

const BODY_PARTS = ['목','어깨(우)','어깨(좌)','팔꿈치(우)','팔꿈치(좌)','손·손목(우)','손·손목(좌)','허리','무릎(우)','무릎(좌)','발·발목','기타']

function defaultSymptomWorker(seq: number) {
  return {
    seq, worker_name:'', dept:'', age:'', sex:'남', career_years:'',
    body_parts: BODY_PARTS.map(part => ({ part, pain_level:0, frequency:'없음', duration:'없음' })),
    special_note:'',
  }
}

function defaultImprovePlan(seq: number) {
  return { seq, target_work:'', hazard:'', priority:'高', measure:'', responsible:'', due_date:'', done:false, result:'' }
}

export default function NewMusculoskeletalPage() {
  const router   = useRouter()
  const [saving, setSaving]   = useState(false)
  const [step,   setStep]     = useState(0)
  const [form, setForm] = useState({
    survey_type: 'regular', survey_date: new Date().toISOString().slice(0,10),
    dept_name: '', work_name: '',
  })
  const [burdenChecks, setBurdenChecks] = useState(
    BURDEN_WORK_LIST.map(b => ({ ...b, is_applicable: false as boolean | null, work_hours_per_day:'', notes:'' }))
  )
  const [symptomWorkers, setSymptomWorkers] = useState([defaultSymptomWorker(1)])
  const [improvePlan, setImprovePlan] = useState<any[]>([])
  const [basicSurvey, setBasicSurvey] = useState({ work_situation:'', work_condition:'', symptoms_present:false })

  const STEPS = ['기본정보','부담작업 판단','기본조사','증상조사','개선계획']
  const applicableCnt = burdenChecks.filter(b=>b.is_applicable===true).length

  async function save() {
    if (!form.dept_name || !form.work_name) { toast.error('부서명과 작업명을 입력하세요.'); return }
    setSaving(true)
    const res = await fetch('/api/health-programs/musculoskeletal', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        ...form,
        burden_work_check: burdenChecks,
        basic_survey:      basicSurvey,
        symptom_survey:    symptomWorkers,
        improvement_plan:  improvePlan,
        program_required:  false,
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('근골격계 유해요인조사가 저장되었습니다.')
    router.push(`/health-programs/musculoskeletal/${json.data.id}`)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/health-programs/musculoskeletal" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Users className="w-5 h-5 text-blue-600"/>근골격계 유해요인조사</h1>
            <p className="text-xs text-gray-400 mt-0.5">안전보건규칙 제657조 | 고용노동부고시 제2020-12호</p>
          </div>
        </div>
        <div className="flex gap-2">
          {step > 0 && <button onClick={()=>setStep(s=>s-1)} className="btn-secondary">이전</button>}
          {step < STEPS.length-1
            ? <button onClick={()=>setStep(s=>s+1)} className="btn-primary" style={{background:'#2563eb'}}>다음 단계</button>
            : <button onClick={save} disabled={saving} className="btn-primary" style={{background:'#2563eb'}}>
                {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}저장
              </button>}
        </div>
      </div>

      {/* 단계 표시 */}
      <div className="flex items-center gap-0 mb-6">
        {STEPS.map((s,i) => (
          <div key={i} className="flex items-center flex-1">
            <button onClick={()=>setStep(i)} className={clsx('flex items-center gap-2 text-xs font-medium py-2 px-3 rounded-lg transition-all w-full justify-center',
              i===step?'bg-blue-600 text-white':i<step?'bg-blue-50 text-blue-600':'text-gray-400 hover:text-gray-600')}>
              <span className={clsx('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border',
                i===step?'bg-white text-blue-600 border-white':i<step?'bg-blue-600 text-white border-blue-600':'border-gray-300 text-gray-400')}>
                {i < step ? '✓' : i+1}
              </span>
              {s}
            </button>
            {i < STEPS.length-1 && <div className={clsx('h-0.5 flex-shrink-0',i<step?'bg-blue-600':'bg-gray-200')} style={{width:'2px'}}/>}
          </div>
        ))}
      </div>

      {/* 단계 0: 기본정보 */}
      {step===0 && (
        <div className="card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-base">조사 유형 *</label>
              <div className="grid grid-cols-3 gap-2">
                {[['initial','최초조사','신설 1년 이내'],['regular','정기조사','3년마다'],['immediate','수시조사','사유 발생 시']].map(([v,l,d]) => (
                  <button key={v} type="button" onClick={()=>setForm(f=>({...f,survey_type:v}))}
                    className={clsx('p-3 rounded-xl border-2 text-center transition-all',
                      form.survey_type===v?'border-blue-500 bg-blue-50':'border-gray-200 hover:border-gray-300')}>
                    <div className={clsx('font-semibold text-xs',form.survey_type===v?'text-blue-700':'text-gray-600')}>{l}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{d}</div>
                  </button>
                ))}
              </div>
            </div>
            <div><label className="label-base">조사 일자 *</label><input type="date" value={form.survey_date} onChange={e=>setForm(f=>({...f,survey_date:e.target.value}))} className="input-base"/></div>
            <div><label className="label-base">부서명 *</label><input value={form.dept_name} onChange={e=>setForm(f=>({...f,dept_name:e.target.value}))} placeholder="예: 생산1팀" className="input-base"/></div>
            <div><label className="label-base">작업명 *</label><input value={form.work_name} onChange={e=>setForm(f=>({...f,work_name:e.target.value}))} placeholder="예: 조립 작업" className="input-base"/></div>
          </div>
        </div>
      )}

      {/* 단계 1: 부담작업 판단 */}
      {step===1 && (
        <div className="space-y-3">
          <div className="card p-4 bg-blue-50/30 border-blue-100 text-xs text-blue-700">
            근골격계부담작업 11가지 해당 여부 판단 (고용노동부고시 제2020-12호)
            {applicableCnt > 0 && <strong className="ml-2 text-red-700"> — 현재 {applicableCnt}가지 해당됨 → 유해요인조사 의무 발생</strong>}
          </div>
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="font-semibold text-gray-800 text-sm">근골격계부담작업 해당 여부</span>
              <div className="flex gap-2">
                <button onClick={()=>setBurdenChecks(prev=>prev.map(b=>({...b,is_applicable:true})))} className="text-xs text-red-600 hover:underline">전체 해당</button>
                <button onClick={()=>setBurdenChecks(prev=>prev.map(b=>({...b,is_applicable:false})))} className="text-xs text-gray-400 hover:underline">전체 해당없음</button>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {burdenChecks.map((b, idx) => (
                <div key={b.seq} className={clsx('px-5 py-3', b.is_applicable && 'bg-red-50/30')}>
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-mono text-gray-400 flex-shrink-0 mt-1 w-5">{b.seq}</span>
                    <div className="flex-1">
                      <div className={clsx('text-xs leading-relaxed', b.is_applicable?'text-gray-900 font-medium':'text-gray-600')}>{b.description}</div>
                      {b.is_applicable && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div><label className="text-[10px] text-gray-500">일 작업시간</label>
                            <input value={b.work_hours_per_day} onChange={e=>setBurdenChecks(prev=>prev.map((c,i)=>i===idx?{...c,work_hours_per_day:e.target.value}:c))}
                              placeholder="예: 5시간" className="input-base text-xs py-1"/></div>
                          <div><label className="text-[10px] text-gray-500">비고</label>
                            <input value={b.notes} onChange={e=>setBurdenChecks(prev=>prev.map((c,i)=>i===idx?{...c,notes:e.target.value}:c))}
                              className="input-base text-xs py-1"/></div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button type="button" onClick={()=>setBurdenChecks(prev=>prev.map((c,i)=>i===idx?{...c,is_applicable:true}:c))}
                        className={clsx('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all border',b.is_applicable===true?'bg-red-600 text-white border-red-600':'border-gray-200 text-gray-400 hover:border-red-300')}>
                        <CheckCircle2 className="w-3 h-3"/>해당
                      </button>
                      <button type="button" onClick={()=>setBurdenChecks(prev=>prev.map((c,i)=>i===idx?{...c,is_applicable:false}:c))}
                        className={clsx('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all border',b.is_applicable===false?'bg-gray-600 text-white border-gray-600':'border-gray-200 text-gray-400 hover:border-gray-400')}>
                        <XCircle className="w-3 h-3"/>없음
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 단계 2: 기본조사 */}
      {step===2 && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">유해요인 기본조사</h2>
          <div><label className="label-base">작업장 상황 (설비·작업공정·작업량·작업속도)</label>
            <textarea value={basicSurvey.work_situation} onChange={e=>setBasicSurvey(s=>({...s,work_situation:e.target.value}))}
              rows={4} className="input-base resize-none text-sm" placeholder="작업장 내 기계·설비 현황, 작업 공정 흐름, 작업량·속도 등을 기재하세요."/></div>
          <div><label className="label-base">작업 조건 (작업시간·자세·방법)</label>
            <textarea value={basicSurvey.work_condition} onChange={e=>setBasicSurvey(s=>({...s,work_condition:e.target.value}))}
              rows={4} className="input-base resize-none text-sm" placeholder="작업시간, 작업자세, 작업방법 등을 기재하세요."/></div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={basicSurvey.symptoms_present} onChange={e=>setBasicSurvey(s=>({...s,symptoms_present:e.target.checked}))}
              className="w-4 h-4 accent-red-600"/>
            <span className="text-sm text-gray-700">근골격계질환 징후·증상 호소 근로자가 있음</span>
          </label>
        </div>
      )}

      {/* 단계 3: 증상조사 */}
      {step===3 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-700">근골격계질환 증상조사표</div>
            <button onClick={()=>setSymptomWorkers(prev=>[...prev,defaultSymptomWorker(prev.length+1)])}
              className="btn-secondary text-xs gap-1"><Plus className="w-3 h-3"/>근로자 추가</button>
          </div>
          {symptomWorkers.map((w,wi) => (
            <div key={wi} className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-700">근로자 {w.seq}</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[['worker_name','성명','홍길동',1],['dept','부서','생산1팀',1],['age','나이','35',0.5],['career_years','경력(년)','3',0.5]].map(([f,l,p,size]) => (
                      <input key={f} value={(w as any)[f]} onChange={e=>setSymptomWorkers(prev=>prev.map((sw,si)=>si===wi?{...sw,[f]:e.target.value}:sw))}
                        placeholder={p as string} className={`input-base text-xs py-1 ${size===0.5?'w-20':''}`}/>
                    ))}
                    <select value={w.sex} onChange={e=>setSymptomWorkers(prev=>prev.map((sw,si)=>si===wi?{...sw,sex:e.target.value}:sw))} className="input-base text-xs py-1 w-16">
                      <option>남</option><option>여</option>
                    </select>
                  </div>
                </div>
                <button onClick={()=>setSymptomWorkers(prev=>prev.filter((_,si)=>si!==wi).map((sw,si)=>({...sw,seq:si+1})))}
                  className="p-1 text-gray-300 hover:text-red-500 rounded"><Trash2 className="w-4 h-4"/></button>
              </div>
              <div className="p-4 overflow-x-auto">
                <table className="text-[10px] w-full" style={{minWidth:'700px'}}>
                  <thead><tr className="border-b border-gray-200">
                    <th className="text-left py-1.5 text-gray-500 font-semibold w-28">신체부위</th>
                    <th className="text-center py-1.5 text-gray-500 font-semibold w-20">통증 정도<div className="font-normal">(0:없음~5:심함)</div></th>
                    <th className="text-center py-1.5 text-gray-500 font-semibold">발생 빈도</th>
                    <th className="text-center py-1.5 text-gray-500 font-semibold">지속 시간</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {w.body_parts.map((bp,bi) => (
                      <tr key={bi} className={bp.pain_level > 0 ? 'bg-red-50/20' : ''}>
                        <td className="py-1.5 font-medium text-gray-700">{bp.part}</td>
                        <td className="py-1.5 text-center">
                          <div className="flex gap-1 justify-center">
                            {[0,1,2,3,4,5].map(v => (
                              <button key={v} type="button"
                                onClick={()=>setSymptomWorkers(prev=>prev.map((sw,si)=>si===wi?{...sw,body_parts:sw.body_parts.map((b,bi2)=>bi2===bi?{...b,pain_level:v}:b)}:sw))}
                                className={clsx('w-6 h-6 rounded-full text-[10px] font-bold transition-all',
                                  bp.pain_level===v?v===0?'bg-green-500 text-white':v<=2?'bg-amber-400 text-white':'bg-red-500 text-white':'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                                {v}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-1.5 text-center">
                          {bp.pain_level > 0 && <select value={bp.frequency}
                            onChange={e=>setSymptomWorkers(prev=>prev.map((sw,si)=>si===wi?{...sw,body_parts:sw.body_parts.map((b,bi2)=>bi2===bi?{...b,frequency:e.target.value}:b)}:sw))}
                            className="input-base text-[10px] py-0.5">
                            {['없음','가끔(1년에 몇 번)','자주(1달에 몇 번)','항상(1주일에 몇 번 이상)'].map(o=><option key={o}>{o}</option>)}
                          </select>}
                        </td>
                        <td className="py-1.5 text-center">
                          {bp.pain_level > 0 && <select value={bp.duration}
                            onChange={e=>setSymptomWorkers(prev=>prev.map((sw,si)=>si===wi?{...sw,body_parts:sw.body_parts.map((b,bi2)=>bi2===bi?{...b,duration:e.target.value}:b)}:sw))}
                            className="input-base text-[10px] py-0.5">
                            {['없음','1일 미만','1일 이상~1주일 미만','1주일 이상~1달 미만','1달 이상'].map(o=><option key={o}>{o}</option>)}
                          </select>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 단계 4: 개선계획 */}
      {step===4 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-700">작업환경 개선계획</div>
              <div className="text-xs text-gray-400 mt-0.5">안전보건규칙 제659조 | 조사 결과 위험 시 작업환경 개선 조치</div>
            </div>
            <button onClick={()=>setImprovePlan(prev=>[...prev,defaultImprovePlan(prev.length+1)])}
              className="btn-secondary text-xs gap-1"><Plus className="w-3 h-3"/>개선항목 추가</button>
          </div>
          {improvePlan.length === 0 && (
            <div className="card p-8 text-center border-dashed text-sm text-gray-400">
              <p className="mb-3">개선이 필요한 항목이 없는 경우 비워둘 수 있습니다.</p>
              <button onClick={()=>setImprovePlan([defaultImprovePlan(1)])} className="btn-secondary text-xs">
                <Plus className="w-3 h-3"/>개선항목 추가
              </button>
            </div>
          )}
          <div className="space-y-3">
            {improvePlan.map((plan, pi) => (
              <div key={pi} className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">개선항목 {plan.seq}</span>
                  <div className="flex items-center gap-2">
                    <select value={plan.priority} onChange={e=>setImprovePlan(prev=>prev.map((p,i)=>i===pi?{...p,priority:e.target.value}:p))}
                      className="input-base text-xs py-1 w-16">
                      {['高','中','低'].map(v=><option key={v}>{v}</option>)}
                    </select>
                    <button onClick={()=>setImprovePlan(prev=>prev.filter((_,i)=>i!==pi).map((p,i)=>({...p,seq:i+1})))}
                      className="p-1 text-gray-300 hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5"/></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label-base">대상 작업</label><input value={plan.target_work} onChange={e=>setImprovePlan(prev=>prev.map((p,i)=>i===pi?{...p,target_work:e.target.value}:p))} className="input-base text-sm"/></div>
                  <div><label className="label-base">유해요인</label><input value={plan.hazard} onChange={e=>setImprovePlan(prev=>prev.map((p,i)=>i===pi?{...p,hazard:e.target.value}:p))} className="input-base text-sm"/></div>
                  <div className="col-span-2"><label className="label-base">개선 조치 내용</label><textarea value={plan.measure} onChange={e=>setImprovePlan(prev=>prev.map((p,i)=>i===pi?{...p,measure:e.target.value}:p))} rows={2} className="input-base text-sm resize-none"/></div>
                  <div><label className="label-base">담당자</label><input value={plan.responsible} onChange={e=>setImprovePlan(prev=>prev.map((p,i)=>i===pi?{...p,responsible:e.target.value}:p))} className="input-base text-sm"/></div>
                  <div><label className="label-base">이행기한</label><input type="date" value={plan.due_date} onChange={e=>setImprovePlan(prev=>prev.map((p,i)=>i===pi?{...p,due_date:e.target.value}:p))} className="input-base text-sm"/></div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={plan.done} onChange={e=>setImprovePlan(prev=>prev.map((p,i)=>i===pi?{...p,done:e.target.checked}:p))} className="w-4 h-4 accent-green-600"/>
                  <span className="text-sm text-gray-700">개선 완료</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
