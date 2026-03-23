'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, HardHat, Loader2, Printer, FileText, ExternalLink, Image as ImageIcon } from 'lucide-react'
import { clsx } from 'clsx'

const CONDITION_CLS: Record<string,string> = {
  '신품': 'bg-green-50 text-green-700',
  '양호': 'bg-blue-50 text-blue-700',
  '보통': 'bg-amber-50 text-amber-700',
  '불량': 'bg-red-50 text-red-700',
}

export default function PpeLedgerDetailPage({ params }: { params: { id: string } }) {
  const [doc, setDoc] = useState<any>(null)
  const [attachments, setAttachments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/safety-measures/ppe-ledger/${params.id}`).then((r) => r.json()),
      fetch(`/api/safety-measures/ppe-ledger/${params.id}/attachments`).then((r) => r.json()),
    ]).then(([docJson, attachJson]) => {
      setDoc(docJson.data)
      setAttachments(Array.isArray(attachJson.items) ? attachJson.items : [])
      setLoading(false)
    })
  }, [params.id])

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
  if (!doc)    return <div className="text-center text-gray-400 py-16">문서를 찾을 수 없습니다.</div>

  const items = doc.ppe_items ?? []

  function formatFileSize(bytes: number): string {
    if (!Number.isFinite(bytes)) return '-'
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/safety-measures/ppe-ledger" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-4 h-4"/></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><HardHat className="w-5 h-5 text-blue-600"/>보호구 지급대장</h1>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{doc.doc_number}</p>
          </div>
        </div>
        <button onClick={() => window.print()} className="btn-secondary gap-1.5"><Printer className="w-4 h-4"/>출력</button>
      </div>

      {/* 인쇄 헤더 */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold tracking-widest mb-1">보호구 지급대장</h1>
        <p className="text-sm text-gray-500">산업안전보건기준에 관한 규칙 제32조</p>
      </div>

      {/* 기본정보 */}
      <div className="card p-5 mb-4">
        <div className="grid grid-cols-4 gap-4 text-sm">
          {[['문서번호', doc.doc_number], ['지급일', doc.ledger_date], ['성명', doc.worker_name], ['부서·직위', [doc.worker_dept, doc.worker_position].filter(Boolean).join(' / ') || '—']].map(([k,v]) => (
            <div key={k}><div className="text-xs text-gray-400 mb-0.5">{k}</div><div className="font-medium">{v}</div></div>
          ))}
        </div>
      </div>

      {/* 보호구 목록 */}
      <div className="card overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            {['#','보호구 종류','규격·형식','수량','상태','지급일','반납일','관리번호','비고'].map(h => (
              <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item: any, i: number) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-3 text-xs text-center text-gray-400">{i+1}</td>
                <td className="px-3 py-3 text-xs font-medium text-gray-900">{item.name}</td>
                <td className="px-3 py-3 text-xs text-gray-600">{item.spec || '—'}</td>
                <td className="px-3 py-3 text-xs text-center font-medium">{item.qty}</td>
                <td className="px-3 py-3"><span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', CONDITION_CLS[item.condition] ?? 'bg-gray-50 text-gray-500')}>{item.condition}</span></td>
                <td className="px-3 py-3 text-xs text-gray-600">{item.issued_date || '—'}</td>
                <td className="px-3 py-3 text-xs text-gray-500">{item.return_date || '—'}</td>
                <td className="px-3 py-3 text-xs font-mono text-gray-500">{item.serial_no || '—'}</td>
                <td className="px-3 py-3 text-xs text-gray-500">{item.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 비고 + 서명 */}
      <div className="grid grid-cols-2 gap-4">
        {doc.remarks && <div className="card p-4"><div className="text-xs text-gray-500 mb-1">비고</div><p className="text-sm text-gray-700">{doc.remarks}</p></div>}
        <div className="card p-5 col-start-2">
          <div className="grid grid-cols-2 gap-4 text-center text-sm">
            <div><div className="text-xs text-gray-400 mb-10">지급자 서명</div><div className="border-t border-gray-300 pt-1 text-xs text-gray-600">(인)</div></div>
            <div><div className="text-xs text-gray-400 mb-10">수령자 서명</div><div className="border-t border-gray-300 pt-1 text-xs text-gray-600">(인)</div></div>
          </div>
        </div>
      </div>

      {/* 첨부 파일 */}
      <div className="card p-5 mt-4">
        <h2 className="font-semibold text-gray-800 mb-3">첨부 자료 (현장 사진 / PDF 스캔본)</h2>
        {attachments.length === 0 ? (
          <p className="text-sm text-gray-400">등록된 첨부 파일이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {attachments.map((file) => {
              const isImage = typeof file.fileType === 'string' && file.fileType.startsWith('image/')
              return (
                <a
                  key={file.id}
                  href={file.url ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isImage ? (
                      <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    <span className="text-sm text-gray-700 truncate">{file.fileName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{formatFileSize(Number(file.fileSize ?? 0))}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
