'use client'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, Lightbulb } from 'lucide-react'
export default function NewNearMissPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const form = useForm({ defaultValues: { incident_date: new Date().toISOString().slice(0,10), incident_time:'', location:'', reporter_name:'', worker_count:1, description:'', potential_injury:'', hazard_factors:'', actions:'' } })
  async function onSubmit(data: any) {
    setSaving(true)
    const res = await fetch('/api/risk/near-miss', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...data, hazard_factors:[data.hazard_factors].filter(Boolean), actions:[data.actions].filter(Boolean) }) })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('아차사고가 보고되었습니다. 수시 위험성평가를 실시하세요.')
    router.push(`/risk/near-miss/${json.data.id}`)
  }
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/risk/near-miss" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div><h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Lightbulb className="w-5 h-5 text-amber-600"/>아차사고 보고</h1>
          <p className="text-xs text-gray-400 mt-0.5">지침 제5조의2제2항 | 발생 즉시 보고 → 수시평가 실시</p></div>
        </div>
        <button onClick={form.handleSubmit(onSubmit)} disabled={saving} className="btn-primary" style={{background:'#d97706'}}>
          {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}보고
        </button>
      </div>
      <form className="space-y-4">
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">기본 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-base">발생 일자 *</label><input {...form.register('incident_date')} type="date" className="input-base"/></div>
            <div><label className="label-base">발생 시간</label><input {...form.register('incident_time')} type="time" className="input-base"/></div>
            <div><label className="label-base">발생 위치 *</label><input {...form.register('location',{required:true})} placeholder="4공구 3층 작업구역" className="input-base"/></div>
            <div><label className="label-base">보고자</label><input {...form.register('reporter_name')} className="input-base"/></div>
          </div>
        </div>
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-gray-800">발생 경위</h2>
          <div><label className="label-base">발생 상황 상세 *</label><textarea {...form.register('description',{required:true})} rows={4} className="input-base resize-none" placeholder="어떤 상황에서, 어떻게, 무엇이 발생했는지 구체적으로 기재하세요."/></div>
          <div><label className="label-base">예상 재해 형태 (부상 안 된 경우 어떤 재해가 발생했을 것인지)</label><input {...form.register('potential_injury')} placeholder="예: 고소 추락으로 인한 골절·사망" className="input-base"/></div>
          <div><label className="label-base">파악된 유해·위험요인</label><textarea {...form.register('hazard_factors')} rows={2} className="input-base resize-none" placeholder="이 아차사고를 일으킨 유해위험요인을 기재하세요."/></div>
          <div><label className="label-base">즉시 조치사항</label><textarea {...form.register('actions')} rows={2} className="input-base resize-none" placeholder="즉시 취한 조치를 기재하세요."/></div>
        </div>
        <div className="card p-4 bg-amber-50/40 border-amber-100 text-xs text-amber-700">
          ※ 아차사고 보고 후 해당 유해·위험요인에 대해 <strong>수시 위험성평가</strong>를 반드시 실시해야 합니다 (지침 제15조제2항).
        </div>
      </form>
    </div>
  )
}
