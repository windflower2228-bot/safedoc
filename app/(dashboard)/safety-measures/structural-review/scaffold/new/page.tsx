'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, Layers, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
export default function NewPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const form = useForm({ defaultValues: { title:'', work_location:'', review_date:new Date().toISOString().slice(0,10), reviewer_name:'', reviewer_cert:'', design_load:'', material_spec:'', assembly_plan:'', review_result:'pass', review_notes:'' } })
  async function onSubmit(data: any) {
    setSaving(true)
    const uploaded: any[] = []
    for (const f of files) {
      const path = 'structural-review/' + Date.now() + '-' + f.name
      const { data:ud } = await supabase.storage.from('company-assets').upload(path, f, { upsert:false })
      if (ud) { const { data:pu } = supabase.storage.from('company-assets').getPublicUrl(path); uploaded.push({ file_name:f.name, file_url:pu.publicUrl, file_size:f.size, uploaded_at:new Date().toISOString() }) }
    }
    const res = await fetch('/api/safety-measures/structural-review', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ ...data, review_type:'scaffold', files:uploaded }) })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('구조검토서가 등록되었습니다.')
    router.push('/safety-measures/structural-review/scaffold')
  }
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/safety-measures/structural-review/scaffold" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Layers className="w-5 h-5" style={{color:'#2563eb'}}/>비계 구조검토서 등록</h1>
        </div>
        <button onClick={form.handleSubmit(onSubmit)} disabled={saving} className="btn-primary" style={{background:'#2563eb'}}>
          {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}저장
        </button>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="card p-5"><h2 className="font-semibold text-gray-800 mb-4">기본정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label-base">제목 *</label><input {...form.register('title',{required:true})} className="input-base"/></div>
            <div><label className="label-base">작업 위치</label><input {...form.register('work_location')} className="input-base"/></div>
            <div><label className="label-base">검토일 *</label><input {...form.register('review_date')} type="date" className="input-base"/></div>
            <div><label className="label-base">검토자</label><input {...form.register('reviewer_name')} placeholder="홍길동" className="input-base"/></div>
            <div><label className="label-base">자격 정보</label><input {...form.register('reviewer_cert')} placeholder="건설안전기사" className="input-base"/></div>
          </div>
        </div>
        <div className="card p-5"><h2 className="font-semibold text-gray-800 mb-4">구조검토 내용</h2>
          <div className="space-y-3">
            <div><label className="label-base">설계하중</label><input {...form.register('design_load')} placeholder="예: 슬래브 자중 25kN/m²" className="input-base"/></div>
            <div><label className="label-base">재료 사양</label><input {...form.register('material_spec')} placeholder="예: 강관 Φ48.6×2.3, SS400" className="input-base"/></div>
            <div><label className="label-base">조립계획</label><textarea {...form.register('assembly_plan')} rows={3} className="input-base resize-none text-sm"/></div>
            <div><label className="label-base">검토 결과</label>
              <select {...form.register('review_result')} className="input-base">
                <option value="pass">적합</option><option value="conditional">조건부 적합</option><option value="fail">부적합</option>
              </select>
            </div>
            <div><label className="label-base">검토 의견</label><textarea {...form.register('review_notes')} rows={3} className="input-base resize-none text-sm"/></div>
          </div>
        </div>
        <div className="card p-5"><h2 className="font-semibold text-gray-800 mb-3">조립상세도 파일 첨부 (PDF, DWG, JPG 등)</h2>
          <label className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-300 hover:bg-blue-50/10 transition-all">
            <Upload className="w-5 h-5 text-gray-400"/>
            <div className="flex-1">
              {files.length > 0 ? <span className="text-sm text-gray-700">{files.map(f=>f.name).join(', ')}</span> : <span className="text-sm text-gray-400">파일을 선택하세요 (다중 선택 가능)</span>}
            </div>
            <input type="file" multiple accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png" onChange={e=>setFiles(Array.from(e.target.files??[]))} className="hidden"/>
          </label>
        </div>
      </form>
    </div>
  )
}
