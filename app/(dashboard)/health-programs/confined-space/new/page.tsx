'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react'
export default function NewPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<any>({ title:'', effective_date:'', items:[] })
  function addItem() { setData((d: any) => ({ ...d, items:[...d.items, { seq:(d.items.length+1), content:'', responsible:'', due_date:'', done:false }] })) }
  function updateItem(idx: number, field: string, val: any) { setData((d: any) => { const a=[...d.items]; a[idx]={...a[idx],[field]:val}; return {...d,items:a} }) }
  function removeItem(idx: number) { setData((d: any) => ({ ...d, items:d.items.filter((_: any,i: number)=>i!==idx).map((it: any,i: number)=>({...it,seq:i+1})) })) }
  async function save() {
    if (!data.title) { toast.error('제목을 입력하세요.'); return }
    setSaving(true)
    const res = await fetch('/api/health-programs/confined-space', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('밀폐공간작업프로그램이 저장되었습니다.')
    router.push('/health-programs/confined-space')
  }
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/health-programs/confined-space" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div><h1 className="text-xl font-bold text-gray-900">밀폐공간작업프로그램 수립</h1>
          <p className="text-xs text-gray-400 mt-0.5">안전보건규칙 제619조</p></div>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary" style={{background:'#7c3aed'}}>
          {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>}저장
        </button>
      </div>
      <div className="space-y-4">
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">기본정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label-base">프로그램 제목 *</label><input value={data.title} onChange={e=>setData((d: any)=>({...d,title:e.target.value}))} placeholder="밀폐공간작업프로그램 제목" className="input-base"/></div>
            <div><label className="label-base">시행일</label><input type="date" value={data.effective_date} onChange={e=>setData((d: any)=>({...d,effective_date:e.target.value}))} className="input-base"/></div>
            <div><label className="label-base">담당자</label><input value={data.responsible||''} onChange={e=>setData((d: any)=>({...d,responsible:e.target.value}))} className="input-base"/></div>
          </div>
        </div>
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">세부 실행 계획</h2>
            <button type="button" onClick={addItem} className="btn-secondary text-xs gap-1"><Plus className="w-3 h-3"/>항목 추가</button>
          </div>
          <div className="p-4 space-y-2">
            {(data.items as any[]).map((item: any, idx: number) => (
              <div key={idx} className="grid grid-cols-6 gap-2 items-end">
                <div className="col-span-2"><label className="label-base">내용</label><input value={item.content||''} onChange={e=>updateItem(idx,'content',e.target.value)} className="input-base text-sm"/></div>
                <div><label className="label-base">담당</label><input value={item.responsible||''} onChange={e=>updateItem(idx,'responsible',e.target.value)} className="input-base text-sm"/></div>
                <div><label className="label-base">기한</label><input type="date" value={item.due_date||''} onChange={e=>updateItem(idx,'due_date',e.target.value)} className="input-base text-sm"/></div>
                <label className="flex items-center gap-2 pb-1 cursor-pointer">
                  <input type="checkbox" checked={item.done||false} onChange={e=>updateItem(idx,'done',e.target.checked)} className="w-4 h-4 accent-green-600"/>
                  <span className="text-xs text-gray-600">완료</span>
                </label>
                <button type="button" onClick={()=>removeItem(idx)} className="p-1.5 text-gray-300 hover:text-red-500 rounded self-end mb-0.5"><Trash2 className="w-3.5 h-3.5"/></button>
              </div>
            ))}
            {data.items.length === 0 && (
              <div className="text-center py-6 text-sm text-gray-400">
                <p className="mb-2">세부 실행 계획 항목을 추가하세요.</p>
                <button type="button" onClick={addItem} className="btn-secondary text-xs gap-1"><Plus className="w-3 h-3"/>추가</button>
              </div>
            )}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-3">비고 / 특이사항</h2>
          <textarea value={data.notes||''} onChange={e=>setData((d: any)=>({...d,notes:e.target.value}))} rows={3} className="input-base resize-none text-sm"/>
        </div>
      </div>
    </div>
  )
}
