'use client'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
export default function NewPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const form = useForm({ defaultValues: { title:'', measurement_date:'', location:'', result_summary:'', action_required:'', notes:'' } })
  async function onSubmit(data: any) {
    setSaving(true)
    const res = await fetch('/api/health/work_env', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...data, type:'work_env' }) })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error||'저장 실패'); return }
    toast.success('저장되었습니다.')
    router.push('/health/work-env')
  }
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/health/work-env" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div><h1 className="text-lg font-bold text-gray-900">작업환경측정 등록</h1><p className="text-xs text-gray-400">산안법 제125조 | 반기 1회 이상</p></div>
        </div>
        <button onClick={form.handleSubmit(onSubmit)} disabled={saving} className="btn-primary">
          {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}저장
        </button>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="card p-5 space-y-4">
          <div><label className="label-base">제목 *</label><input {...form.register('title',{required:true})} className="input-base" placeholder="작업환경측정 결과 등록"/></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-base">측정·검진 일자</label><input {...form.register('measurement_date')} type="date" className="input-base"/></div>
            <div><label className="label-base">위치·부서</label><input {...form.register('location')} className="input-base"/></div>
          </div>
          <div><label className="label-base">결과 요약</label><textarea {...form.register('result_summary')} rows={3} className="input-base resize-none"/></div>
          <div><label className="label-base">조치 필요사항</label><textarea {...form.register('action_required')} rows={2} className="input-base resize-none"/></div>
          <div><label className="label-base">비고</label><textarea {...form.register('notes')} rows={2} className="input-base resize-none"/></div>
        </div>
      </form>
    </div>
  )
}
