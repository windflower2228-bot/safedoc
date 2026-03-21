'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Search,
  MessageSquareQuote,
  Building2,
  CalendarDays,
  Upload,
  Download,
  FileText,
  Paperclip,
  Plus,
} from 'lucide-react'

type QnaAttachment = {
  fileName: string
  filePath: string
  fileSize: number
  fileType: string
}

type QnaItem = {
  id: string
  number: string
  title: string
  institution: string
  questionDate: string
  answerDate: string
  question: string
  answer: string
  tags: string[]
  source: string
  createdAt?: string
  authorName?: string
  isUserUpload?: boolean
  attachment?: QnaAttachment | null
}

type QnaResponse = {
  total: number
  page: number
  pageSize: number
  totalPages: number
  institutions: string[]
  items: QnaItem[]
}

const PAGE_SIZE = 20

function formatDate(v?: string) {
  return v || '-'
}

function toTxtBlob(item: QnaItem) {
  const lines = [
    `제목: ${item.title}`,
    `기관: ${item.institution}`,
    `질의일: ${item.questionDate || '-'}`,
    `회신일: ${item.answerDate || '-'}`,
    `구분: ${item.isUserUpload ? '사용자 업로드' : '기본 질의회시'}`,
    '',
    '[질의]',
    item.question || '-',
    '',
    '[회시]',
    item.answer || '-',
  ]

  return new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
}

export default function OshCostQnaPage() {
  const [keyword, setKeyword] = useState('')
  const [institution, setInstitution] = useState('')
  const [page, setPage] = useState(1)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<QnaResponse | null>(null)
  const [selectedId, setSelectedId] = useState<string>('')

  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [uTitle, setUTitle] = useState('')
  const [uQuestion, setUQuestion] = useState('')
  const [uAnswer, setUAnswer] = useState('')
  const [uTags, setUTags] = useState('')
  const [uFile, setUFile] = useState<File | null>(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        q: keyword,
        institution,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      })
      const res = await fetch(`/api/osh-cost/qna?${params.toString()}`)
      if (!res.ok) throw new Error('질의회시 데이터를 불러오지 못했습니다.')
      const json = (await res.json()) as QnaResponse
      setData(json)

      if (!selectedId && json.items[0]?.id) {
        setSelectedId(json.items[0].id)
      } else if (selectedId && !json.items.some((item) => item.id === selectedId)) {
        setSelectedId(json.items[0]?.id ?? '')
      }
    } catch (e: any) {
      setError(e?.message ?? '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [institution, keyword, page, selectedId])

  useEffect(() => {
    const t = setTimeout(() => {
      fetchList()
    }, 250)
    return () => clearTimeout(t)
  }, [fetchList])

  useEffect(() => {
    setPage(1)
  }, [keyword, institution])

  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const items = data?.items ?? []
  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId])

  const handleUpload = async () => {
    setUploadMessage('')
    if (!uTitle.trim()) {
      setUploadMessage('제목을 입력해 주세요.')
      return
    }

    if (!uQuestion.trim() && !uAnswer.trim() && !uFile) {
      setUploadMessage('질의/회시 또는 첨부파일 중 하나는 입력해 주세요.')
      return
    }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.set('title', uTitle)
      fd.set('question', uQuestion)
      fd.set('answer', uAnswer)
      fd.set('tags', uTags)
      if (uFile) fd.set('file', uFile)

      const res = await fetch('/api/osh-cost/qna', {
        method: 'POST',
        body: fd,
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || '업로드 실패')

      setUploadMessage('업로드가 완료되었습니다.')
      setUTitle('')
      setUQuestion('')
      setUAnswer('')
      setUTags('')
      setUFile(null)
      setPage(1)
      await fetchList()
      if (json?.data?.id) setSelectedId(json.data.id)
    } catch (e: any) {
      setUploadMessage(e?.message ?? '업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handleAttachmentDownload = async (item: QnaItem) => {
    if (!item.isUserUpload || !item.attachment) return
    try {
      const res = await fetch(`/api/osh-cost/qna/download/${encodeURIComponent(item.id)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || '다운로드 URL 생성 실패')
      if (json?.url) window.open(json.url, '_blank', 'noopener,noreferrer')
    } catch (e: any) {
      alert(e?.message ?? '첨부 다운로드에 실패했습니다.')
    }
  }

  const handleDetailTextDownload = (item: QnaItem) => {
    const blob = toTxtBlob(item)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `질의회시_${item.id}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <Link href="/osh-cost" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquareQuote className="w-5 h-5 text-violet-600" />
          산업안전보건관리비 질의회시 게시판
        </h1>
      </div>

      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="block md:col-span-2">
            <span className="text-xs text-gray-500">키워드 검색</span>
            <div className="mt-1 flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                className="w-full text-sm outline-none"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="예: 요율, 계상, 정산, 교육비, 출장여비"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs text-gray-500">기관 필터</span>
            <select
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
            >
              <option value="">전체 기관</option>
              {(data?.institutions ?? []).map((inst) => (
                <option key={inst} value={inst}>
                  {inst}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setUploadOpen((v) => !v)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm"
            >
              <Plus className="w-4 h-4" />
              게시글 업로드
            </button>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          기본 질의회시 + 사용자 업로드 포함 <b>{total.toLocaleString()}건</b>
        </div>
      </div>

      {uploadOpen && (
        <div className="card p-4 mb-4 border-violet-100 bg-violet-50/30">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">질의회시 게시글 업로드</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block md:col-span-2">
              <span className="text-xs text-gray-500">제목</span>
              <input
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={uTitle}
                onChange={(e) => setUTitle(e.target.value)}
                placeholder="예: 산업안전보건관리비 정산 기준 질의"
              />
            </label>

            <label className="block">
              <span className="text-xs text-gray-500">질의 내용</span>
              <textarea
                rows={5}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                value={uQuestion}
                onChange={(e) => setUQuestion(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="text-xs text-gray-500">회시 내용</span>
              <textarea
                rows={5}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                value={uAnswer}
                onChange={(e) => setUAnswer(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="text-xs text-gray-500">태그 (쉼표 구분)</span>
              <input
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={uTags}
                onChange={(e) => setUTags(e.target.value)}
                placeholder="예: 요율, 정산, 제7조"
              />
            </label>

            <label className="block">
              <span className="text-xs text-gray-500">첨부파일 (선택)</span>
              <input
                type="file"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                onChange={(e) => setUFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm disabled:opacity-60"
            >
              <Upload className="w-4 h-4" />
              {uploading ? '업로드 중...' : '업로드 저장'}
            </button>
            {uploadMessage && <p className="text-xs text-gray-600">{uploadMessage}</p>}
          </div>
        </div>
      )}

      {error && <div className="card p-4 mb-4 text-sm text-rose-600">{error}</div>}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                <th className="text-left px-4 py-3 w-20">번호</th>
                <th className="text-left px-4 py-3">제목</th>
                <th className="text-left px-4 py-3 w-40">기관</th>
                <th className="text-left px-4 py-3 w-32">회신일</th>
                <th className="text-left px-4 py-3 w-28">구분</th>
                <th className="text-left px-4 py-3 w-24">첨부</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                    검색 중입니다...
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              )}

              {!loading && items.map((item) => (
                <tr key={item.id} className={`border-b border-gray-50 ${selectedId === item.id ? 'bg-violet-50/40' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3 text-xs text-gray-500">{item.number || '-'}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className="text-left text-sm text-blue-700 hover:underline"
                    >
                      {item.title}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.institution || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.answerDate)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${item.isUserUpload ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-700'}`}>
                      {item.isUserUpload ? '업로드' : '기본'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {item.attachment ? (
                      <button type="button" onClick={() => handleAttachmentDownload(item)} className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                        <Paperclip className="w-3.5 h-3.5" />
                        파일
                      </button>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="card p-5 mt-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-bold text-gray-900">{selected.title}</h2>
              <div className="mt-1 text-xs text-gray-500 flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{selected.institution || '-'}</span>
                <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />질의 {formatDate(selected.questionDate)} / 회신 {formatDate(selected.answerDate)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDetailTextDownload(selected)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
              >
                <FileText className="w-4 h-4" />
                본문 다운로드
              </button>

              {selected.attachment && (
                <button
                  type="button"
                  onClick={() => handleAttachmentDownload(selected)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                >
                  <Download className="w-4 h-4" />
                  첨부 다운로드
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">질의</p>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 whitespace-pre-line min-h-[180px]">
                {selected.question || '-'}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">회시</p>
              <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 whitespace-pre-line min-h-[180px]">
                {selected.answer || '-'}
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="card p-4 mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40"
          >
            이전
          </button>
          <p className="text-xs text-gray-500">
            {page} / {totalPages} 페이지
          </p>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}
