'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Camera,
  Loader2,
  MapPin,
  Link2,
  Trash2,
  Upload,
  Calendar,
  FileText,
} from 'lucide-react'

type WorklogMatch = {
  worklogId: string
  uploadDate: string
  fileName: string
  summary: string
  snippet: string
}

type WorkStatusItem = {
  id: string
  location: string
  note: string
  capturedAt: string
  createdAt: string
  createdBy: string
  photoPath: string
  photoUrl: string
  linkedWorkLabel: string
  worklogMatches: WorklogMatch[]
}

export default function WorkStatusPage() {
  const fileRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState<WorkStatusItem[]>([])

  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [capturedAt, setCapturedAt] = useState(new Date().toISOString().slice(0, 16))
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/work-status', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '작업상황을 불러오지 못했습니다.')
      setItems(json.items ?? [])
    } catch (error: any) {
      toast.error(error?.message ?? '작업상황을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit() {
    if (!location.trim()) {
      toast.error('작업위치를 입력해주세요.')
      return
    }
    if (!photoFile) {
      toast.error('사진을 첨부해주세요.')
      return
    }

    const form = new FormData()
    form.append('location', location.trim())
    form.append('note', note.trim())
    form.append('capturedAt', capturedAt ? new Date(capturedAt).toISOString() : new Date().toISOString())
    form.append('photo', photoFile)

    setSaving(true)
    try {
      const res = await fetch('/api/work-status', {
        method: 'POST',
        body: form,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '작업상황 등록에 실패했습니다.')
      setItems((prev) => [json.item, ...prev])
      setLocation('')
      setNote('')
      setPhotoFile(null)
      if (fileRef.current) fileRef.current.value = ''
      toast.success('작업상황이 등록되었습니다.')
    } catch (error: any) {
      toast.error(error?.message ?? '작업상황 등록에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(id: string) {
    if (!confirm('이 작업상황을 삭제할까요?')) return
    try {
      const res = await fetch('/api/work-status', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '삭제에 실패했습니다.')
      setItems((prev) => prev.filter((item) => item.id !== id))
      toast.success('삭제되었습니다.')
    } catch (error: any) {
      toast.error(error?.message ?? '삭제에 실패했습니다.')
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="card p-5">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Camera className="w-5 h-5 text-blue-600" />
          작업상황
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          사진 + 작업위치를 등록하면 작업일보 분석 데이터에서 같은 위치 문구를 자동 탐지해 연동 표시합니다.
        </p>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">작업상황 등록</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label-base">작업위치</label>
            <input
              className="input-base"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="예: 지하1층"
            />
          </div>
          <div>
            <label className="label-base">촬영일시</label>
            <input
              type="datetime-local"
              className="input-base"
              value={capturedAt}
              onChange={(e) => setCapturedAt(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label-base">메모</label>
            <input
              className="input-base"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="예: 철근 배근 작업 진행 중"
            />
          </div>
          <div className="md:col-span-2">
            <label className="label-base">사진</label>
            <label className="input-base flex items-center gap-2 cursor-pointer hover:bg-gray-50">
              <Upload className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600 truncate">
                {photoFile ? photoFile.name : '사진 파일 선택 (jpg, png, webp 등)'}
              </span>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
        <div className="mt-4">
          <button className="btn-primary" onClick={onSubmit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            등록
          </button>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800">등록된 작업상황</h2>
          <span className="text-xs text-gray-400">{items.length}건</span>
        </div>

        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-400 py-10 text-center">등록된 작업상황이 없습니다.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {items.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <a href={item.photoUrl} target="_blank" rel="noreferrer" className="block bg-gray-100">
                  <img src={item.photoUrl} alt={item.location} className="w-full h-52 object-cover" />
                </a>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      {item.location}
                    </div>
                    <button className="btn-danger !px-2 !py-1 !text-xs" onClick={() => onDelete(item.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                      삭제
                    </button>
                  </div>

                  {item.note && <div className="text-sm text-gray-700">{item.note}</div>}

                  <div className="text-xs text-gray-500 flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      촬영: {new Date(item.capturedAt).toLocaleString('ko-KR')}
                    </span>
                    <span>등록자: {item.createdBy}</span>
                  </div>

                  {item.linkedWorkLabel && (
                    <div className="mt-2 p-2.5 rounded-lg border border-emerald-200 bg-emerald-50">
                      <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5" />
                        작업일보 연동 문구
                      </div>
                      <div className="text-sm text-emerald-800 mt-1">{item.linkedWorkLabel}</div>
                    </div>
                  )}

                  {item.worklogMatches.length > 0 && (
                    <div className="mt-2">
                      <div className="text-[11px] text-gray-500 mb-1">연동된 작업일보</div>
                      <div className="space-y-1.5">
                        {item.worklogMatches.map((match) => (
                          <div key={match.worklogId} className="rounded-lg border border-gray-200 p-2">
                            <div className="text-[11px] text-gray-500 flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" />
                              {match.uploadDate} {match.fileName ? `· ${match.fileName}` : ''}
                            </div>
                            <div className="text-xs text-gray-700 mt-1">{match.snippet || match.summary}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

