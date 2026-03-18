'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, Plus, Trash2, Heart } from 'lucide-react'

const CATEGORIES = ['금연','금주','운동·체력증진','영양·식습관 관리','스트레스 관리','뇌심혈관 예방','근골격계 예방','기타']

export default function NewWellnessPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [year, setYear]     = useState(new Date().getFullYear())
  const [title, setTitle]   = useState(`${new Date().getFullYear()}년 건강증진프로그램`)
  const [plans, setPlans]   = useState<any[]>([
    { seq:1, category:'금연',       program_name:'금연 캠페인 및 금연클리닉 연계', target:'전 근로자',  start_date:'', end_date:'', budget:0, responsible:'', status:'planned' },
    { seq:2, category:'운동·체력증진', program_name:'사내 운동시설 운영 및 체조 시간 운영', target:'전 근로자', start_date:'', end_date:'', budget:0, responsible:'', status:'planned' },
    { seq:3, category:'스트레스 관리', program_name:'직무 스트레스 예방교육 및 상담', target:'전 근로자',  start_date:'', end_date:'', budget:0, responsible:'', status:'planned' },
  ])
  function addPlan() {
    setPlans(prev => [...prev, { seq:prev.length+1, category:'기타', program_name:'', target:'', start_date:'', end_date:'', budget:0, responsible:'', status:'planned' }])
  }
  function updatePlan(idx: number, field: string, val: any) {
    setPlans(prev => prev.map((p,i) => i===idx ? {...p,[field]:val} : p))
  }
  function removePlan(idx: number) {
    setPlans(prev => prev.filter((_,i)=>i!==idx).map((p,i)=>({...p,seq:i+1})))
  }
  const totalBudget = plans.reduce((s,p)=>s+(Number(p.budget)||0), 0)
  async function save() {
    if (!title.trim()) { toast.error('제목을 입력하세요.'); return }
    setSaving(true)
    const res = await fetch('/api/health-programs/wellness', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ title, year, plan_items:plans, budget_total:totalBudget }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('건강증진프로그램이 저장되었습니다.')
    router.push('/health-programs/wellness')
  }
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/health-programs/wellness" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div><h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Heart className="w-5 h-5 text-rose-500"/>건강증진프로그램 수립</h1>
          <p className="text-xs text-gray-400 mt-0.5">산업안전보건법 제129조 | 연간 건강증진 계획</p></div>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary" style={{background:'#e11d48'}}>
          {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}저장
        </button>
      </div>
      <div className="space-y-4">
        <div className="card p-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2"><label className="label-base">프로그램 제목 *</label><input value={title} onChange={e=>setTitle(e.target.value)} className="input-base"/></div>
            <div><label className="label-base">대상 연도</label><input type="number" value={year} onChange={e=>setYear(Number(e.target.value))} className="input-base text-center font-bold"/></div>
          </div>
        </div>
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-800">연간 건강증진 계획표</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">총 예산: <strong className="text-rose-700">{totalBudget.toLocaleString()}원</strong></p>
            </div>
            <button type="button" onClick={addPlan} className="btn-secondary text-xs gap-1"><Plus className="w-3 h-3"/>프로그램 추가</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{minWidth:'900px'}}>
              <thead><tr className="bg-gray-50 border-b border-gray-200">
                {['#','분류','프로그램명','대상','시작일','종료일','예산(원)','담당자','진행상태',''].map(h => <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {plans.map((plan, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-center text-gray-400">{plan.seq}</td>
                    <td className="px-2 py-1.5">
                      <select value={plan.category} onChange={e=>updatePlan(idx,'category',e.target.value)} className="input-base text-xs py-1 w-28">
                        {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5"><input value={plan.program_name} onChange={e=>updatePlan(idx,'program_name',e.target.value)} className="input-base text-xs py-1 w-48"/></td>
                    <td className="px-2 py-1.5"><input value={plan.target} onChange={e=>updatePlan(idx,'target',e.target.value)} className="input-base text-xs py-1 w-24"/></td>
                    <td className="px-2 py-1.5"><input type="date" value={plan.start_date} onChange={e=>updatePlan(idx,'start_date',e.target.value)} className="input-base text-xs py-1"/></td>
                    <td className="px-2 py-1.5"><input type="date" value={plan.end_date} onChange={e=>updatePlan(idx,'end_date',e.target.value)} className="input-base text-xs py-1"/></td>
                    <td className="px-2 py-1.5"><input type="number" value={plan.budget} onChange={e=>updatePlan(idx,'budget',Number(e.target.value))} className="input-base text-xs py-1 w-24 text-right"/></td>
                    <td className="px-2 py-1.5"><input value={plan.responsible} onChange={e=>updatePlan(idx,'responsible',e.target.value)} className="input-base text-xs py-1 w-20"/></td>
                    <td className="px-2 py-1.5">
                      <select value={plan.status} onChange={e=>updatePlan(idx,'status',e.target.value)} className="input-base text-xs py-1 w-20">
                        {['planned','in_progress','completed','cancelled'].map(s=><option key={s} value={s}>{s==='planned'?'계획':s==='in_progress'?'진행 중':s==='completed'?'완료':'취소'}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5"><button onClick={()=>removePlan(idx)} className="p-1 text-gray-300 hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5"/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
