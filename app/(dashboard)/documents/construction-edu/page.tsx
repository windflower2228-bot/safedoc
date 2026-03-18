'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Upload, Loader2, Plus, Trash2, Check, X,
  ChevronDown, ChevronUp, Save, Camera, Eye,
  Search, Download, RefreshCw, HardDriveUpload,
  FileText, CalendarDays, AlertCircle,
} from 'lucide-react'
import { clsx } from 'clsx'

/* ── 타입 ─────────────────────────────────────────────────────── */
interface EduRecord {
  id?:             string   // DB id (저장 후)
  _localId:        string   // 로컬 식별자 (편집용)
  person_name:     string
  birth_date:      string
  register_date:   string
  completion_date: string
  course_name:     string
  issuer:          string
  isNew?:          boolean  // OCR로 새로 추가된 행
}

interface UploadGroup {
  id:          string
  upload_date: string
  image_url:   string | null
  image_name:  string | null
  note:        string | null
  records:     EduRecord[]
  expanded:    boolean
  dirty:       boolean      // 수정되었으나 미저장
}

/* ── 로컬 ID 생성기 ────────────────────────────────────────────── */
let _seq = 0
const newId = () => `r-${Date.now()}-${_seq++}`

/* ── 컬럼 정의 ────────────────────────────────────────────────── */
const COLS = [
  { key: 'person_name',     label: '이름',    width: 90  },
  { key: 'birth_date',      label: '생년월일', width: 108 },
  { key: 'completion_date', label: '이수일자', width: 108 },
  { key: 'register_date',   label: '등록일자', width: 108 },
  { key: 'course_name',     label: '교육명',   width: 180 },
  { key: 'issuer',          label: '발급기관', width: 140 },
] as const

type ColKey = typeof COLS[number]['key']

/* ── 메인 컴포넌트 ─────────────────────────────────────────────── */
export default function ConstructionEduPage() {
  const [groups,     setGroups]    = useState<UploadGroup[]>([])
  const [loading,    setLoading]   = useState(false)
  const [uploading,  setUploading] = useState(false)
  const [ocrLoading, setOcr]       = useState(false)
  const [saving,     setSaving]    = useState<string | null>(null)
  const [previewUrl, setPreview]   = useState<string | null>(null)
  const [searchQ,    setSearch]    = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

  /* 업로드 폼 상태 */
  const [pendingDate,    setPendingDate]    = useState(new Date().toISOString().slice(0,10))
  const [pendingNote,    setPendingNote]    = useState('')
  const [pendingImg,     setPendingImg]     = useState<{ base64: string; type: string; name: string } | null>(null)
  const [pendingRecords, setPendingRecords] = useState<EduRecord[]>([])
  const [showUploadForm, setShowUploadForm] = useState(false)

  /* ── 데이터 로드 ─────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/documents/construction-edu')
    const json = await res.json()
    setLoading(false)
    setGroups((json.data ?? []).map((d: any) => ({
      ...d,
      expanded: false,
      dirty:    false,
      records:  (d.records ?? []).map((r: any) => ({ ...r, _localId: newId() })),
    })))
  }, [])

  useEffect(() => { load() }, [load])

  /* ── 이미지 선택 → base64 변환 ──────────────────────────────── */
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      const base64 = result.split(',')[1]
      const type   = file.type || 'image/jpeg'
      setPendingImg({ base64, type, name: file.name })
      setPreview(result)
    }
    reader.readAsDataURL(file)
    setShowUploadForm(true)
  }

  /* ── OCR 실행 ────────────────────────────────────────────────── */
  async function runOcr() {
    if (!pendingImg) { toast.error('이미지를 먼저 선택해주세요.'); return }
    setOcr(true)
    const res  = await fetch('/api/documents/construction-edu/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: pendingImg.base64, media_type: pendingImg.type }),
    })
    const json = await res.json()
    setOcr(false)
    if (!res.ok) { toast.error(json.error); return }

    const newRecords: EduRecord[] = (json.records ?? []).map((r: any) => ({
      ...r,
      _localId: newId(),
      isNew:    true,
    }))
    setPendingRecords(newRecords)
    toast.success(`이수증 ${newRecords.length}건이 인식되었습니다!`)
  }

  /* ── 저장 ────────────────────────────────────────────────────── */
  async function saveUpload() {
    if (pendingRecords.length === 0) { toast.error('이수 기록이 없습니다.'); return }
    setSaving('new')

    // 이미지 먼저 Supabase Storage에 업로드 (선택)
    let imageUrl: string | null = null
    if (pendingImg) {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const path = `construction-edu/${Date.now()}_${pendingImg.name}`
      const blob = await fetch(`data:${pendingImg.type};base64,${pendingImg.base64}`).then(r => r.blob())
      const { data } = await supabase.storage.from('edu-certificates').upload(path, blob, { upsert: true })
      if (data) {
        const { data: urlData } = supabase.storage.from('edu-certificates').getPublicUrl(path)
        imageUrl = urlData.publicUrl
      }
    }

    const res = await fetch('/api/documents/construction-edu', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        upload_date: pendingDate,
        note:        pendingNote,
        image_url:   imageUrl,
        image_name:  pendingImg?.name ?? null,
        records:     pendingRecords,
      }),
    })
    const json = await res.json()
    setSaving(null)
    if (!res.ok) { toast.error(json.error); return }
    toast.success('저장되었습니다.')
    setPendingImg(null); setPendingRecords([]); setPendingNote(''); setPreview(null); setShowUploadForm(false)
    if (fileRef.current) fileRef.current.value = ''
    load()
  }

  /* ── 그룹 편집 저장 ─────────────────────────────────────────── */
  async function saveGroup(g: UploadGroup) {
    setSaving(g.id)
    const res = await fetch(`/api/documents/construction-edu/${g.id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upload_date: g.upload_date, note: g.note, records: g.records }),
    })
    setSaving(null)
    if (res.ok) {
      toast.success('저장되었습니다.')
      setGroups(prev => prev.map(x => x.id===g.id ? {...x, dirty:false} : x))
    } else toast.error('저장 실패')
  }

  /* ── 그룹 삭제 ───────────────────────────────────────────────── */
  async function deleteGroup(id: string) {
    if (!confirm('이 업로드와 모든 이수 기록을 삭제하시겠습니까?')) return
    await fetch(`/api/documents/construction-edu/${id}`, { method: 'DELETE' })
    toast.success('삭제되었습니다.')
    setGroups(prev => prev.filter(g => g.id !== id))
  }

  /* ── 그룹 내 행 편집 헬퍼 ──────────────────────────────────── */
  function updateGroupRecord(gid: string, lid: string, field: ColKey, value: string) {
    setGroups(prev => prev.map(g => {
      if (g.id !== gid) return g
      return { ...g, dirty: true, records: g.records.map(r => r._localId===lid ? {...r,[field]:value} : r) }
    }))
  }
  function addGroupRow(gid: string) {
    setGroups(prev => prev.map(g => {
      if (g.id !== gid) return g
      const newRow: EduRecord = { _localId:newId(), person_name:'', birth_date:'', register_date:'', completion_date:'', course_name:'건설업 기초안전보건교육', issuer:'' }
      return { ...g, dirty:true, records:[...g.records, newRow] }
    }))
  }
  function removeGroupRow(gid: string, lid: string) {
    setGroups(prev => prev.map(g => {
      if (g.id !== gid) return g
      return { ...g, dirty:true, records:g.records.filter(r=>r._localId!==lid) }
    }))
  }
  function updateGroupField(gid: string, field: 'upload_date'|'note', value: string) {
    setGroups(prev => prev.map(g => g.id===gid ? {...g, dirty:true, [field]:value} : g))
  }

  /* ── 대기 기록 편집 헬퍼 ────────────────────────────────────── */
  function updatePending(lid: string, field: ColKey, value: string) {
    setPendingRecords(prev => prev.map(r => r._localId===lid ? {...r,[field]:value} : r))
  }
  function addPendingRow() {
    setPendingRecords(prev => [...prev, { _localId:newId(), person_name:'', birth_date:'', register_date:'', completion_date:'', course_name:'건설업 기초안전보건교육', issuer:'' }])
  }
  function removePendingRow(lid: string) {
    setPendingRecords(prev => prev.filter(r => r._localId !== lid))
  }

  /* ── 엑셀 내보내기 ───────────────────────────────────────────── */
  function exportCsv(g: UploadGroup) {
    const header = ['이름','생년월일','이수일자','등록일자','교육명','발급기관'].join(',')
    const rows   = g.records.map(r =>
      [r.person_name,r.birth_date,r.completion_date,r.register_date,r.course_name,r.issuer]
        .map(v => `"${(v||'').replace(/"/g,'""')}"`)
        .join(',')
    )
    const csv  = '\uFEFF' + [header,...rows].join('\n')
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `건설업기초안전보건교육_${g.upload_date}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ── 필터링 ─────────────────────────────────────────────────── */
  const filtered = searchQ
    ? groups.filter(g =>
        g.upload_date.includes(searchQ) ||
        g.records.some(r => r.person_name.includes(searchQ) || r.completion_date.includes(searchQ))
      )
    : groups

  const totalRecords = groups.reduce((s,g) => s+g.records.length, 0)

  /* ── 공통 테이블 컴포넌트 ───────────────────────────────────── */
  function RecordTable({
    records, onUpdate, onAddRow, onRemoveRow,
  }: {
    records:    EduRecord[]
    onUpdate:   (lid:string, field:ColKey, value:string) => void
    onAddRow:   () => void
    onRemoveRow:(lid:string) => void
  }) {
    return (
      <div>
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse" style={{minWidth: COLS.reduce((s,c)=>s+c.width,60)+20}}>
            <thead>
              <tr className="bg-gray-50">
                <th className="w-8 border border-gray-200 px-2 py-2 text-[10px] font-semibold text-gray-400 text-center">#</th>
                {COLS.map(c => (
                  <th key={c.key} style={{width:c.width}}
                    className="border border-gray-200 px-2 py-2 text-[10px] font-semibold text-gray-600 text-left bg-blue-50">
                    {c.label}
                  </th>
                ))}
                <th className="w-8 border border-gray-200 bg-gray-50"/>
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => (
                <tr key={r._localId}
                  className={clsx('group hover:bg-blue-50/30 transition-colors', r.isNew && 'bg-green-50/40')}>
                  <td className="border border-gray-200 px-2 py-1 text-center text-gray-400 text-[10px]">{idx+1}</td>
                  {COLS.map(c => (
                    <td key={c.key} className="border border-gray-200 p-0">
                      <input
                        value={r[c.key] ?? ''}
                        onChange={e => onUpdate(r._localId, c.key, e.target.value)}
                        className="w-full h-full px-2 py-1.5 text-xs bg-transparent outline-none focus:bg-blue-50 transition-colors"
                        style={{minWidth: c.width-8}}
                      />
                    </td>
                  ))}
                  <td className="border border-gray-200 px-1 py-1 text-center">
                    <button onClick={() => onRemoveRow(r._localId)}
                      className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all mx-auto">
                      <X className="w-3 h-3"/>
                    </button>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={COLS.length+2} className="border border-gray-200 py-6 text-center text-gray-400 text-xs">
                    이수 기록이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <button onClick={onAddRow}
          className="flex items-center gap-1.5 mt-2 text-xs text-blue-600 hover:underline px-1">
          <Plus className="w-3.5 h-3.5"/> 행 추가
        </button>
      </div>
    )
  }

  /* ── 렌더 ───────────────────────────────────────────────────── */
  return (
    <div className="max-w-6xl mx-auto">

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <HardDriveUpload className="w-5 h-5 text-orange-500"/>
            건설업 기초안전보건교육 이수증 관리
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            이수증 사진을 업로드하면 AI가 자동으로 이수자 정보를 인식합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowUploadForm(v=>!v)}
            className={clsx('btn-primary text-sm gap-1.5', showUploadForm && 'opacity-80')}
            style={{background:'#ea580c'}}>
            <Upload className="w-4 h-4"/> 이수증 업로드
          </button>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card p-4 flex items-center gap-3">
          <div className="bg-orange-50 p-2.5 rounded-xl"><FileText className="w-4 h-4 text-orange-500"/></div>
          <div><div className="text-xs text-gray-400">전체 업로드</div><div className="text-xl font-bold text-orange-600">{groups.length}</div></div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="bg-blue-50 p-2.5 rounded-xl"><Check className="w-4 h-4 text-blue-500"/></div>
          <div><div className="text-xs text-gray-400">총 이수 인원</div><div className="text-xl font-bold text-blue-600">{totalRecords}</div></div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="bg-green-50 p-2.5 rounded-xl"><CalendarDays className="w-4 h-4 text-green-500"/></div>
          <div><div className="text-xs text-gray-400">최근 업로드</div><div className="text-sm font-bold text-green-600">{groups[0]?.upload_date ?? '—'}</div></div>
        </div>
      </div>

      {/* 업로드 폼 */}
      {showUploadForm && (
        <div className="card p-5 mb-5 border-orange-200 bg-orange-50/30">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Camera className="w-4 h-4 text-orange-500"/> 이수증 사진 업로드 및 OCR 인식
          </h2>

          <div className="grid grid-cols-2 gap-5">
            {/* 왼쪽: 이미지 업로드 */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">이수증 사진 *</label>
              {previewUrl ? (
                <div className="relative">
                  <img src={previewUrl} alt="이수증 미리보기"
                    className="w-full rounded-xl border border-gray-200 object-contain max-h-64 bg-gray-50"/>
                  <button onClick={() => { setPendingImg(null); setPreview(null); setPendingRecords([]); if(fileRef.current)fileRef.current.value='' }}
                    className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:text-red-500">
                    <X className="w-3.5 h-3.5"/>
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-orange-200 rounded-xl cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all bg-white">
                  <Upload className="w-7 h-7 text-orange-300"/>
                  <div className="text-sm text-gray-500 text-center">
                    이수증 사진을 클릭하거나 드래그하세요<br/>
                    <span className="text-xs text-gray-400">한 장에 여러 이수증이 있어도 자동 인식</span>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden"/>
                </label>
              )}

              {/* OCR 버튼 */}
              {pendingImg && (
                <button onClick={runOcr} disabled={ocrLoading}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                  {ocrLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin"/> AI 이수증 인식 중...</>
                    : <><Search className="w-4 h-4"/> AI 자동 인식</>}
                </button>
              )}

              {!pendingImg && (
                <div className="mt-3 p-3 bg-blue-50 rounded-xl text-xs text-blue-700 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"/>
                  사진 업로드 후 'AI 자동 인식' 버튼을 누르면 이름·생년월일·이수일자·등록일자가 자동 입력됩니다.
                </div>
              )}
            </div>

            {/* 오른쪽: 날짜/메모 + 인식 결과 테이블 */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">업로드 날짜 *</label>
                  <input type="date" value={pendingDate} onChange={e=>setPendingDate(e.target.value)} className="input-base"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">메모</label>
                  <input value={pendingNote} onChange={e=>setPendingNote(e.target.value)} placeholder="현장명 등" className="input-base"/>
                </div>
              </div>

              {/* 인식 결과 */}
              {ocrLoading ? (
                <div className="flex items-center justify-center py-10 gap-3 text-blue-600">
                  <Loader2 className="w-6 h-6 animate-spin"/>
                  <span className="text-sm">AI가 이수증을 분석하고 있습니다...</span>
                </div>
              ) : pendingRecords.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600">
                      인식 결과 <span className="text-green-600 font-bold">{pendingRecords.length}건</span>
                      <span className="text-gray-400 font-normal ml-1">— 직접 수정 가능합니다</span>
                    </span>
                  </div>
                  <RecordTable
                    records={pendingRecords}
                    onUpdate={(lid,field,val) => updatePending(lid,field,val)}
                    onAddRow={addPendingRow}
                    onRemoveRow={removePendingRow}
                  />
                </div>
              ) : pendingImg ? (
                <div className="py-8 text-center text-sm text-gray-400">
                  'AI 자동 인식' 버튼을 눌러주세요.
                </div>
              ) : null}
            </div>
          </div>

          {/* 저장 버튼 */}
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-orange-100">
            <button onClick={() => { setShowUploadForm(false); setPendingImg(null); setPreview(null); setPendingRecords([]) }}
              className="btn-secondary">취소</button>
            <button onClick={saveUpload} disabled={saving==='new' || pendingRecords.length===0}
              className="btn-primary gap-1.5" style={{background:'#ea580c'}}>
              {saving==='new'
                ? <><Loader2 className="w-4 h-4 animate-spin"/>저장 중...</>
                : <><Save className="w-4 h-4"/>{pendingRecords.length}건 저장</>}
            </button>
          </div>
        </div>
      )}

      {/* 검색 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/>
          <input value={searchQ} onChange={e=>setSearch(e.target.value)}
            placeholder="날짜, 이름으로 검색..."
            className="input-base pl-9"/>
        </div>
        <button onClick={load} className="btn-secondary" title="새로고침">
          <RefreshCw className={clsx('w-4 h-4', loading&&'animate-spin')}/>
        </button>
      </div>

      {/* 업로드 목록 */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-300">
          <Loader2 className="w-6 h-6 animate-spin"/>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="card py-16 text-center text-gray-400">
          <HardDriveUpload className="w-10 h-10 mx-auto mb-3 opacity-20"/>
          <p className="text-sm">업로드된 이수증이 없습니다.</p>
          <button onClick={() => setShowUploadForm(true)}
            className="btn-primary mt-4 text-sm gap-1.5" style={{background:'#ea580c'}}>
            <Upload className="w-4 h-4"/> 첫 이수증 업로드
          </button>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(g => (
          <div key={g.id} className={clsx('card overflow-hidden', g.dirty && 'ring-2 ring-amber-300')}>
            {/* 그룹 헤더 */}
            <div
              className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setGroups(prev => prev.map(x => x.id===g.id ? {...x,expanded:!x.expanded} : x))}>

              <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', g.dirty ? 'bg-amber-400' : 'bg-green-400')}/>

              {/* 업로드 날짜 (인라인 편집) */}
              <input
                type="date"
                value={g.upload_date}
                onClick={e=>e.stopPropagation()}
                onChange={e=>updateGroupField(g.id,'upload_date',e.target.value)}
                className="text-sm font-bold text-gray-900 bg-transparent border-none outline-none cursor-pointer w-32 focus:bg-gray-100 focus:rounded focus:px-1"
              />

              {/* 메모 (인라인 편집) */}
              <input
                value={g.note ?? ''}
                onClick={e=>e.stopPropagation()}
                onChange={e=>updateGroupField(g.id,'note',e.target.value)}
                placeholder="메모 (현장명 등)"
                className="text-sm text-gray-500 bg-transparent border-none outline-none flex-1 focus:bg-gray-100 focus:rounded focus:px-2"
              />

              <span className="text-xs text-gray-400 flex-shrink-0">{g.records.length}명</span>

              {g.dirty && (
                <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                  미저장
                </span>
              )}

              <div className="flex items-center gap-1 flex-shrink-0" onClick={e=>e.stopPropagation()}>
                {g.image_url && (
                  <button onClick={()=>setPreview(g.image_url!)}
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="원본 이미지">
                    <Eye className="w-3.5 h-3.5"/>
                  </button>
                )}
                <button onClick={()=>exportCsv(g)}
                  className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="CSV 내보내기">
                  <Download className="w-3.5 h-3.5"/>
                </button>
                {g.dirty && (
                  <button onClick={()=>saveGroup(g)} disabled={saving===g.id}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
                    {saving===g.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3"/>}
                    저장
                  </button>
                )}
                <button onClick={()=>deleteGroup(g.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="삭제">
                  <Trash2 className="w-3.5 h-3.5"/>
                </button>
              </div>
              {g.expanded
                ? <ChevronUp className="w-4 h-4 text-gray-300 flex-shrink-0"/>
                : <ChevronDown className="w-4 h-4 text-gray-300 flex-shrink-0"/>}
            </div>

            {/* 그룹 상세 — 이수 기록 테이블 */}
            {g.expanded && (
              <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                <RecordTable
                  records={g.records}
                  onUpdate={(lid,field,val) => updateGroupRecord(g.id,lid,field,val)}
                  onAddRow={() => addGroupRow(g.id)}
                  onRemoveRow={lid => removeGroupRow(g.id,lid)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 이미지 전체보기 모달 */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={()=>setPreview(null)}>
          <div className="relative max-w-3xl w-full" onClick={e=>e.stopPropagation()}>
            <img src={previewUrl} alt="이수증" className="w-full rounded-xl shadow-2xl object-contain max-h-[85vh]"/>
            <button onClick={()=>setPreview(null)}
              className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-700 hover:text-red-500 shadow">
              <X className="w-4 h-4"/>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
