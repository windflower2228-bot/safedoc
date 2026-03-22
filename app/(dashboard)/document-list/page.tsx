'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type DocumentListItem = {
  id: string
  title: string
  category: string
  documentNo: string
  memo: string
  createdAt: string
  createdBy: string
}

export default function DocumentListPage() {
  const [items, setItems] = useState<DocumentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [form, setForm] = useState({
    title: '',
    category: '일반',
    documentNo: '',
    memo: '',
  })

  const load = useCallback(async (query = '') => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      const res = await fetch(`/api/document-list?${params.toString()}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? '문서목록 조회 실패')
      setItems(Array.isArray(json?.items) ? json.items : [])
    } catch (error: any) {
      toast.error(error?.message ?? '문서목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load('')
  }, [load])

  async function onAdd() {
    if (!form.title.trim()) {
      toast.error('문서명을 입력해 주세요.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/document-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? '추가 실패')
      setForm({ title: '', category: '일반', documentNo: '', memo: '' })
      toast.success('문서목록이 추가되었습니다.')
      await load(q)
    } catch (error: any) {
      toast.error(error?.message ?? '문서목록 추가에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch('/api/document-list', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? '삭제 실패')
      toast.success('문서목록을 삭제했습니다.')
      setItems((prev) => prev.filter((item) => item.id !== id))
    } catch (error: any) {
      toast.error(error?.message ?? '삭제에 실패했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  async function onSearch() {
    await load(q)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-600" />
              문서목록표
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">문서목록을 자유롭게 추가/삭제하여 자체 관리할 수 있습니다.</p>
          </div>
        </div>
      </div>

      <div className="card p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3">문서목록 추가</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label-base">문서명 *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="input-base"
              placeholder="예: 2026년 3월 안전점검 계획서"
            />
          </div>
          <div>
            <label className="label-base">분류</label>
            <input
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              className="input-base"
              placeholder="예: 위험성평가, 교육, 점검"
            />
          </div>
          <div>
            <label className="label-base">문서번호</label>
            <input
              value={form.documentNo}
              onChange={(e) => setForm((p) => ({ ...p, documentNo: e.target.value }))}
              className="input-base"
              placeholder="예: DOC-2026-031"
            />
          </div>
          <div>
            <label className="label-base">메모</label>
            <input
              value={form.memo}
              onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
              className="input-base"
              placeholder="담당자/비고"
            />
          </div>
        </div>
        <button onClick={onAdd} disabled={saving} className="btn-primary text-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          목록 추가
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-2">
          <h2 className="font-semibold text-gray-800">등록 목록 ({items.length}건)</h2>
          <div className="flex items-center gap-2">
            <div className="relative w-64 max-w-full">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void onSearch() }}
                className="input-base pl-9 py-1.5 text-sm"
                placeholder="문서명/분류/문서번호 검색"
              />
            </div>
            <button onClick={onSearch} className="btn-secondary text-sm">검색</button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400">
            등록된 문서목록이 없습니다. 위에서 첫 항목을 추가해 주세요.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['분류', '문서명', '문서번호', '메모', '등록일', '작성자', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-600">{item.category || '일반'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.title}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{item.documentNo || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.memo || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.createdAt.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.createdBy}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="text-xs text-red-600 hover:text-red-700 inline-flex items-center gap-1"
                    >
                      {deletingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
