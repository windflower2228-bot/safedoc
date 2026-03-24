'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, FileText, Loader2, Printer } from 'lucide-react'
import { clsx } from 'clsx'
import DocumentPhotoSection from '@/components/common/DocumentPhotoSection'

export default function SafetyInfoDetailPage({ params }: { params: { id: string } }) {
  const [doc, setDoc] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const shouldAutoPrint = searchParams.get('print') === '1'

  useEffect(() => {
    fetch(`/api/subcontract/safety-info/${params.id}`)
      .then((r) => r.json())
      .then((j) => {
        setDoc(j.data ?? null)
        setLoading(false)
      })
  }, [params.id])

  useEffect(() => {
    if (!loading && doc && shouldAutoPrint) {
      setTimeout(() => window.print(), 250)
    }
  }, [loading, doc, shouldAutoPrint])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
      </div>
    )
  }
  if (!doc) return <div className="text-center text-gray-400 py-16">문서를 찾을 수 없습니다.</div>

  const infoItems: any[] = doc.info_items ?? []

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/subcontract/safety-info" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              안전 및 보건에 관한 정보제공
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
        <h2 className="font-semibold text-gray-800 mb-3">기본정보</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs text-gray-400">수급업체</dt><dd className="font-medium">{doc.vendor_name}</dd></div>
          <div><dt className="text-xs text-gray-400">도급 공종</dt><dd className="font-medium">{doc.work_type}</dd></div>
          <div><dt className="text-xs text-gray-400">제공일</dt><dd>{doc.provision_date}</dd></div>
          <div><dt className="text-xs text-gray-400">수령자</dt><dd>{doc.receiver_name || '—'}</dd></div>
          <div><dt className="text-xs text-gray-400">제공자</dt><dd>{doc.provider_name || '—'}</dd></div>
          <div><dt className="text-xs text-gray-400">제공자 직위</dt><dd>{doc.provider_position || '—'}</dd></div>
        </dl>
      </div>

      <div className="card overflow-hidden mb-4">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">제공 정보 항목</h2>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['분류', '항목', '내용', '문서첨부'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {infoItems.map((item, idx) => (
              <tr key={idx}>
                <td className="px-3 py-2">{item.category}</td>
                <td className="px-3 py-2 font-medium text-gray-800">{item.item}</td>
                <td className="px-3 py-2 text-gray-600 whitespace-pre-wrap">{item.content || '—'}</td>
                <td className="px-3 py-2">
                  <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium', item.doc_attached ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500')}>
                    {item.doc_attached ? '첨부' : '미첨부'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DocumentPhotoSection
        category="subcontract_safety_info"
        docId={doc.id}
        title="정보제공 첨부 사진"
      />
    </div>
  )
}
