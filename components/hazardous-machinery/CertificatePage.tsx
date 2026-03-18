'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Award, CheckSquare, Upload, Download,
  Trash2, Search, Loader2, FileText, X, Eye,
} from 'lucide-react'
import { clsx } from 'clsx'
import { createClient } from '@/lib/supabase/client'
import { SAFETY_CERT_MACHINES, VOLUNTARY_CERT_MACHINES } from '@/types/hazardous-machinery'

type CertType = 'safety_cert' | 'voluntary_cert'

const CFG = {
  safety_cert:   { label: '안전인증',    icon: Award,       color: '#2563eb', bg: '#eff6ff', legalBasis: '산안법 제84조', machines: SAFETY_CERT_MACHINES   },
  voluntary_cert:{ label: '자율안전확인', icon: CheckSquare, color: '#16a34a', bg: '#f0fdf4', legalBasis: '산안법 제89조', machines: VOLUNTARY_CERT_MACHINES },
}

interface CertItem {
  id: string; cert_type: string; machine_category: string; machine_name: string
  model_no: string | null; manufacturer: string | null; cert_no: string
  cert_date: string | null; expiry_date: string | null
  file_url: string | null; file_name: string | null; file_size: number | null
  notes: string | null; created_at: string; author: { name: string } | null
}

interface Props { certType: CertType }

export default function CertificatePage({ certType }: Props) {
  const supabase = createClient()
  const cfg      = CFG[certType]
  const Icon     = cfg.icon
  const fileRef  = useRef<HTMLInputElement>(null)

  const [items,    setItems]    = useState<CertItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [q,        setQ]        = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [uploading,setUploading]= useState(false)
  const [selFile,  setSelFile]  = useState<File | null>(null)
  const [form, setForm] = useState({
    machine_category: '', machine_name: '', model_no: '',
    manufacturer: '', cert_no: '', cert_date: '', expiry_date: '', notes: '',
  })

  useEffect(() => {
    fetch(`/api/hazardous-machinery/certificates?type=${certType}`)
      .then(r => r.json()).then(j => { setItems(j.data ?? []); setLoading(false) })
  }, [certType])

  // 파일 선택
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 20 * 1024 * 1024) { toast.error('파일 크기는 20MB 이하여야 합니다.'); return }
    setSelFile(f)
  }

  // 등록
  async function handleSave() {
    if (!form.machine_category) { toast.error('기계·기구 분류를 선택하세요.'); return }
    if (!form.machine_name)     { toast.error('기계명을 입력하세요.'); return }
    if (!form.cert_no)          { toast.error('인증번호를 입력하세요.'); return }

    setSaving(true)
    let fileUrl  = null
    let fileName = null
    let fileSize = null

    // 파일 업로드
    if (selFile) {
      setUploading(true)
      const ext  = selFile.name.split('.').pop()
      const path = `machinery-certs/${certType}/${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('company-assets').upload(path, selFile, { upsert: false })
      if (error) { toast.error('파일 업로드 실패: ' + error.message); setSaving(false); setUploading(false); return }
      const { data: urlData } = supabase.storage.from('company-assets').getPublicUrl(path)
      fileUrl  = urlData.publicUrl
      fileName = selFile.name
      fileSize = selFile.size
      setUploading(false)
    }

    const res  = await fetch('/api/hazardous-machinery/certificates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, cert_type: certType, file_url: fileUrl, file_name: fileName, file_size: fileSize }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error); return }
    setItems(prev => [json.data, ...prev])
    setShowForm(false)
    setSelFile(null)
    setForm({ machine_category:'', machine_name:'', model_no:'', manufacturer:'', cert_no:'', cert_date:'', expiry_date:'', notes:'' })
    toast.success('인증서가 등록되었습니다.')
  }

  // 삭제
  async function handleDelete(id: string, fileUrl: string | null) {
    if (!confirm('삭제하시겠습니까?')) return
    if (fileUrl) {
      const path = fileUrl.split('/company-assets/')[1]
      if (path) await supabase.storage.from('company-assets').remove([path])
    }
    await fetch(`/api/hazardous-machinery/certificates/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
    toast.success('삭제되었습니다.')
  }

  // 만료 상태
  function expiryStatus(expiry: string | null) {
    if (!expiry) return null
    const days = (new Date(expiry).getTime() - Date.now()) / 86400000
    if (days < 0)   return { cls: 'text-red-600 bg-red-50',   label: '만료' }
    if (days <= 60) return { cls: 'text-amber-600 bg-amber-50', label: `D-${Math.ceil(days)}` }
    return { cls: 'text-green-600 bg-green-50', label: '유효' }
  }

  const filtered = items.filter(i =>
    !q || i.machine_name.includes(q) || i.cert_no.includes(q) || i.machine_category.includes(q)
  )

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/hazardous-machinery" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Icon className="w-5 h-5" style={{ color: cfg.color }} />
              {cfg.label}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">{cfg.legalBasis} | 인증서 업로드 및 관리</p>
          </div>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="btn-primary text-sm gap-1.5" style={{ background: cfg.color }}>
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? '취소' : '인증서 등록'}
        </button>
      </div>

      {/* 등록 폼 */}
      {showForm && (
        <div className="card p-5 mb-5 border-2" style={{ borderColor: cfg.color + '40' }}>
          <h2 className="font-semibold text-gray-800 mb-4">인증서 등록</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label-base">기계·기구 분류 *</label>
              <select value={form.machine_category}
                onChange={e => setForm(f => ({ ...f, machine_category: e.target.value }))}
                className="input-base">
                <option value="">선택하세요</option>
                {cfg.machines.map(m => (
                  <option key={m.code} value={m.label}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-base">기계명 *</label>
              <input value={form.machine_name}
                onChange={e => setForm(f => ({ ...f, machine_name: e.target.value }))}
                placeholder="예: 크레인 TC-800" className="input-base" />
            </div>
            <div>
              <label className="label-base">모델·형식번호</label>
              <input value={form.model_no}
                onChange={e => setForm(f => ({ ...f, model_no: e.target.value }))}
                className="input-base" />
            </div>
            <div>
              <label className="label-base">제조사</label>
              <input value={form.manufacturer}
                onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))}
                className="input-base" />
            </div>
            <div>
              <label className="label-base">인증번호 *</label>
              <input value={form.cert_no}
                onChange={e => setForm(f => ({ ...f, cert_no: e.target.value }))}
                placeholder="예: KCs-2025-001234" className="input-base" />
            </div>
            <div>
              <label className="label-base">인증일</label>
              <input type="date" value={form.cert_date}
                onChange={e => setForm(f => ({ ...f, cert_date: e.target.value }))}
                className="input-base" />
            </div>
            <div>
              <label className="label-base">유효기간 (해당 시)</label>
              <input type="date" value={form.expiry_date}
                onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
                className="input-base" />
            </div>
            <div>
              <label className="label-base">비고</label>
              <input value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="input-base" />
            </div>
          </div>

          {/* 파일 업로드 */}
          <div className="mb-4">
            <label className="label-base">인증서 파일 첨부 (PDF, JPG, PNG — 최대 20MB)</label>
            <label className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-300 hover:bg-blue-50/20 transition-all">
              <Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div>
                {selFile
                  ? <><span className="text-sm font-medium text-gray-800">{selFile.name}</span>
                      <span className="text-xs text-gray-400 ml-2">({(selFile.size/1024).toFixed(0)}KB)</span></>
                  : <span className="text-sm text-gray-400">파일을 선택하거나 여기에 드래그하세요</span>}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileSelect} className="hidden" />
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary">취소</button>
            <button onClick={handleSave} disabled={saving || uploading}
              className="btn-primary" style={{ background: cfg.color }}>
              {(saving || uploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {uploading ? '업로드 중...' : '저장'}
            </button>
          </div>
        </div>
      )}

      {/* 검색 */}
      <div className="relative max-w-xs mb-4">
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="기계명, 인증번호 검색..."
          className="input-base pl-9" />
      </div>

      {/* 목록 */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center text-gray-400 text-sm">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>등록된 인증서가 없습니다.</p>
            <button onClick={() => setShowForm(true)}
              className="btn-primary mt-4 text-sm" style={{ background: cfg.color }}>
              <Plus className="w-4 h-4" /> 인증서 등록
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['분류','기계명','모델','인증번호','인증일','유효기간','파일','등록일',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(item => {
                const es = expiryStatus(item.expiry_date)
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        {item.machine_category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.machine_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.model_no || '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-700">{item.cert_no}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.cert_date || '—'}</td>
                    <td className="px-4 py-3">
                      {item.expiry_date
                        ? <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">{item.expiry_date}</span>
                            {es && <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full font-medium', es.cls)}>{es.label}</span>}
                          </div>
                        : <span className="text-xs text-gray-400">없음</span>}
                    </td>
                    <td className="px-4 py-3">
                      {item.file_url
                        ? <div className="flex items-center gap-1.5">
                            <a href={item.file_url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                              <Eye className="w-3.5 h-3.5" /> 보기
                            </a>
                            <a href={item.file_url} download={item.file_name}
                              className="flex items-center gap-1 text-xs text-green-600 hover:underline">
                              <Download className="w-3.5 h-3.5" /> 다운
                            </a>
                          </div>
                        : <span className="text-xs text-gray-400">없음</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(item.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => handleDelete(item.id, item.file_url)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 대상 목록 안내 */}
      <div className="card p-5 mt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {cfg.label} 대상 ({cfg.machines.length}종) — {cfg.legalBasis}
        </h3>
        <div className="grid grid-cols-3 gap-1.5">
          {cfg.machines.map(m => (
            <div key={m.code} className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                style={{ background: cfg.color }}></span>
              <div>
                <div className="text-xs text-gray-700">{m.label}</div>
                <div className="text-[10px] text-gray-400">{m.legalRef}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
