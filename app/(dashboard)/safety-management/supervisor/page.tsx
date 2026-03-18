'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, FileText, Loader2, ArrowLeft, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { SAFETY_ROLES } from '@/types/safety-management'

export default function Page() {
  const role = SAFETY_ROLES['supervisor']
  const [items,   setItems]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/safety-documents?role_id=supervisor')
      .then(r=>r.json()).then(j=>{ setItems(j.data??[]); setLoading(false) })
  }, [])

  const STATUS_CFG: Record<string,{icon:any;cls:string;label:string}> = {
    active:  { icon:CheckCircle2, cls:'bg-green-50 text-green-700', label:'유효'   },
    expired: { icon:Clock,        cls:'bg-gray-50  text-gray-500',  label:'만료'   },
    revoked: { icon:XCircle,      cls:'bg-red-50   text-red-600',   label:'취소됨' },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/safety-management" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4"/>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5" style={{color:'#b45309'}}/>
              관리감독자
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">{role?.legalBasis} | {role?.docType}</p>
          </div>
        </div>
        <Link href="/safety-management/supervisor/new"
          className="btn-primary text-sm gap-1.5" style={{background:'#b45309'}}>
          <Plus className="w-4 h-4"/> 관리감독자 작성
        </Link>
      </div>

      <div className="card p-4 mb-4 text-xs leading-relaxed rounded-xl"
        style={{background:'#b4530910',color:'#b45309'}}>
        {role?.description}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
        ) : items.length === 0 ? (
          <div className="py-14 text-center text-sm text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-20"/>
            <p>관리감독자 문서가 없습니다.</p>
            <Link href="/safety-management/supervisor/new" className="btn-primary mt-4 text-sm inline-flex" style={{background:'#b45309'}}>
              <Plus className="w-4 h-4"/> 작성하기
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['문서번호','성명','소속','직급','지정일','만료일','상태',''].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => {
                const sc = STATUS_CFG[item.status] ?? STATUS_CFG.active
                const Icon = sc.icon
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{item.doc_number??'—'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{item.person_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.person_affiliation||'—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.person_position||'—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.effective_date}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{item.expiry_date||'재임 중'}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',sc.cls)}>
                        <Icon className="w-3 h-3"/>{sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={'/safety-management/supervisor/'+item.id} className="text-xs text-blue-600 hover:underline">상세</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
