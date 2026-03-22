'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lightbulb, Loader2, Printer } from 'lucide-react'
import { clsx } from 'clsx'
import DocumentPhotoSection from '@/components/common/DocumentPhotoSection'

export default function NearMissDetailPage({ params }: { params: { id: string } }) {
  const [doc, setDoc] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/risk/near-miss/${params.id}`)
      .then((r) => r.json())
      .then((j) => {
        setDoc(j.data ?? null)
        setLoading(false)
      })
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
      </div>
    )
  }
  if (!doc) return <div className="text-center text-gray-400 py-16">문서를 찾을 수 없습니다.</div>

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/risk/near-miss" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-600" />
              아차사고 보고
            </h1>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{doc.doc_number}</p>
          </div>
        </div>
        <button onClick={() => window.print()} className="btn-secondary gap-1.5">
          <Printer className="w-4 h-4" />
          출력
        </button>
      </div>

      <div className="card p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3">기본 정보</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs text-gray-400">발생일</dt><dd>{doc.incident_date}</dd></div>
          <div><dt className="text-xs text-gray-400">발생시간</dt><dd>{doc.incident_time || '—'}</dd></div>
          <div><dt className="text-xs text-gray-400">발생위치</dt><dd>{doc.location || '—'}</dd></div>
          <div><dt className="text-xs text-gray-400">보고자</dt><dd>{doc.reporter_name || '—'}</dd></div>
          <div><dt className="text-xs text-gray-400">위험성평가 연계</dt><dd>{doc.linked_to_risk ? '연계됨' : '미연계'}</dd></div>
          <div>
            <dt className="text-xs text-gray-400">상태</dt>
            <dd>
              <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium',
                doc.status === 'closed' ? 'bg-green-50 text-green-700' :
                doc.status === 'in_review' ? 'bg-blue-50 text-blue-700' :
                'bg-red-50 text-red-700')}>
                {doc.status === 'closed' ? '완료' : doc.status === 'in_review' ? '검토 중' : '미결'}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="card p-5 mb-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">발생 상황</h3>
          <p className="text-sm text-gray-700 whitespace-pre-line">{doc.description || '—'}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">예상 재해 형태</h3>
          <p className="text-sm text-gray-700 whitespace-pre-line">{doc.potential_injury || '—'}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">유해·위험요인</h3>
          <p className="text-sm text-gray-700 whitespace-pre-line">{(doc.hazard_factors ?? []).join('\n') || '—'}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">즉시 조치사항</h3>
          <p className="text-sm text-gray-700 whitespace-pre-line">{(doc.actions ?? []).join('\n') || '—'}</p>
        </div>
      </div>

      <DocumentPhotoSection
        category="risk_near_miss"
        docId={doc.id}
        title="아차사고 첨부 사진"
      />
    </div>
  )
}
