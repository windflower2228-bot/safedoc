'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BarChart3, Loader2, Printer } from 'lucide-react'
import { clsx } from 'clsx'
import DocumentPhotoSection from '@/components/common/DocumentPhotoSection'

export default function QualifiedVendorDetailPage({ params }: { params: { id: string } }) {
  const [doc, setDoc] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/subcontract/qualified-vendor/${params.id}`)
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

  const evalItems: any[] = doc.eval_items ?? []
  const maxTotal = evalItems.reduce((sum, item) => sum + (Number(item.max_score) || 0), 0)
  const totalScore = Number(doc.total_score ?? 0)
  const isQualified = Boolean(doc.is_qualified)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/subcontract/qualified-vendor" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-700" />
              적격 수급업체 선정 자료
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">수급업체 기본정보</h2>
          <span className={clsx('text-xs px-2 py-0.5 rounded-full font-semibold', isQualified ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
            {isQualified ? '적격' : '부적격'}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs text-gray-400">업체명</dt><dd className="font-medium">{doc.vendor_name}</dd></div>
          <div><dt className="text-xs text-gray-400">대표자</dt><dd>{doc.vendor_ceo || '—'}</dd></div>
          <div><dt className="text-xs text-gray-400">사업자등록번호</dt><dd>{doc.vendor_business_number || '—'}</dd></div>
          <div><dt className="text-xs text-gray-400">주소</dt><dd>{doc.vendor_address || '—'}</dd></div>
          <div><dt className="text-xs text-gray-400">도급 공종</dt><dd>{doc.work_type}</dd></div>
          <div><dt className="text-xs text-gray-400">평가일</dt><dd>{doc.evaluation_date}</dd></div>
          <div><dt className="text-xs text-gray-400">계약 시작</dt><dd>{doc.contract_start || '—'}</dd></div>
          <div><dt className="text-xs text-gray-400">계약 종료</dt><dd>{doc.contract_end || '—'}</dd></div>
        </dl>
      </div>

      <div className="card overflow-hidden mb-4">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">평가 항목</h2>
          <div className="text-xs">
            총점 <strong>{totalScore}</strong> / {maxTotal}
          </div>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['분류', '평가 항목', '배점', '취득점수', '비고'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {evalItems.map((item, idx) => (
              <tr key={idx}>
                <td className="px-3 py-2">{item.category}</td>
                <td className="px-3 py-2 font-medium text-gray-800">{item.item}</td>
                <td className="px-3 py-2">{item.max_score}점</td>
                <td className="px-3 py-2">{item.score}점</td>
                <td className="px-3 py-2 text-gray-500">{item.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DocumentPhotoSection
        category="subcontract_qualified_vendor"
        docId={doc.id}
        title="적격업체 평가 첨부 사진"
      />
    </div>
  )
}
