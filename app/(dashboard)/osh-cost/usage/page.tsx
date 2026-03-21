'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardCheck, Download, Plus, Trash2 } from 'lucide-react'
import { USAGE_CATEGORIES, formatKrw, type UsageCategory } from '@/lib/oshCost'

type UsageRow = {
  id: string
  usedAt: string
  category: UsageCategory
  detail: string
  basis: string
  amount: number
  evidence: string
}

function toDateValue(value: Date) {
  return value.toISOString().slice(0, 10)
}

export default function OshCostUsagePage() {
  const [projectName, setProjectName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [estimatedAmount, setEstimatedAmount] = useState(0)

  const [usedAt, setUsedAt] = useState(toDateValue(new Date()))
  const [category, setCategory] = useState<UsageCategory>(USAGE_CATEGORIES[0])
  const [detail, setDetail] = useState('')
  const [basis, setBasis] = useState('별지 1 사용내역서 기준')
  const [amount, setAmount] = useState(0)
  const [evidence, setEvidence] = useState('')

  const [rows, setRows] = useState<UsageRow[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    const raw = localStorage.getItem('osh-cost-estimation-snapshot')
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as { resultAmount?: number }
      if (typeof parsed.resultAmount === 'number' && parsed.resultAmount > 0) {
        setEstimatedAmount(parsed.resultAmount)
      }
    } catch {
      // ignore invalid local data
    }
  }, [])

  const totalUsed = useMemo(() => rows.reduce((sum, row) => sum + row.amount, 0), [rows])
  const remainAmount = Math.max(0, estimatedAmount - totalUsed)
  const usageRatio = estimatedAmount > 0 ? Math.min(100, (totalUsed / estimatedAmount) * 100) : 0

  const categorySums = useMemo(() => {
    return USAGE_CATEGORIES.map((item) => ({
      category: item,
      amount: rows.filter((row) => row.category === item).reduce((sum, row) => sum + row.amount, 0),
    }))
  }, [rows])

  const addRow = () => {
    if (!detail.trim() || amount <= 0) {
      setMessage('사용내역과 금액을 입력해 주세요.')
      return
    }

    const next: UsageRow = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      usedAt,
      category,
      detail: detail.trim(),
      basis: basis.trim() || '별지 1 사용내역서 기준',
      amount,
      evidence: evidence.trim(),
    }
    setRows((prev) => [next, ...prev])
    setDetail('')
    setAmount(0)
    setEvidence('')
    setMessage('')
  }

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id))
  }

  const downloadCsv = () => {
    const header = ['사용일자', '사용항목', '사용내역', '근거', '금액', '증빙']
    const lines = rows.map((row) => [
      row.usedAt,
      row.category,
      row.detail,
      row.basis,
      String(row.amount),
      row.evidence,
    ])

    const csv = [header, ...lines]
      .map((line) =>
        line
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(',')
      )
      .join('\n')

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `산업안전보건관리비_사용내역_${toDateValue(new Date())}.csv`
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
          <ClipboardCheck className="w-5 h-5 text-green-600" />
          산업안전보건관리비 사용(별지 1)
        </h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">공사/예산 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500">공사명</span>
              <input
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">발주처</span>
              <input
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs text-gray-500">계상확정액(원)</span>
              <input
                type="number"
                min={0}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={estimatedAmount}
                onChange={(e) => setEstimatedAmount(Number(e.target.value) || 0)}
              />
            </label>
          </div>

          <div className="mt-4 rounded-xl border border-green-100 bg-green-50/50 p-3">
            <p className="text-xs text-green-700">집행률 {usageRatio.toFixed(1)}%</p>
            <div className="mt-2 h-2 rounded-full bg-green-100 overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: `${usageRatio}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-gray-600">사용합계: {formatKrw(totalUsed)}원</span>
              <span className="text-gray-600">잔액: {formatKrw(remainAmount)}원</span>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">사용내역 추가</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-gray-500">사용일자</span>
                <input
                  type="date"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={usedAt}
                  onChange={(e) => setUsedAt(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">금액(원)</span>
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs text-gray-500">사용항목</span>
              <select
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value as UsageCategory)}
              >
                {USAGE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs text-gray-500">사용내역</span>
              <input
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="예: 스마트 안전고리 10세트 임대"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-gray-500">근거</span>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={basis}
                  onChange={(e) => setBasis(e.target.value)}
                  placeholder="예: 제7조 4호"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">증빙번호/비고</span>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  placeholder="예: 계산서 2026-031"
                />
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                내역 추가
              </button>
              <button
                type="button"
                onClick={downloadCsv}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
              >
                <Download className="w-4 h-4" />
                CSV 다운로드
              </button>
            </div>

            {message && <p className="text-xs text-rose-600">{message}</p>}
          </div>
        </div>
      </div>

      <div className="card p-5 mt-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">별지 1 사용내역</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500">
                <th className="text-left py-2">사용일자</th>
                <th className="text-left py-2">사용항목</th>
                <th className="text-left py-2">사용내역</th>
                <th className="text-left py-2">근거</th>
                <th className="text-right py-2">금액(원)</th>
                <th className="text-left py-2">증빙</th>
                <th className="text-right py-2">삭제</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-gray-400">
                    아직 입력된 사용내역이 없습니다.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-50">
                  <td className="py-2.5">{row.usedAt}</td>
                  <td className="py-2.5">{row.category}</td>
                  <td className="py-2.5">{row.detail}</td>
                  <td className="py-2.5 text-xs text-gray-500">{row.basis}</td>
                  <td className="py-2.5 text-right font-medium">{formatKrw(row.amount)}</td>
                  <td className="py-2.5 text-xs text-gray-500">{row.evidence || '-'}</td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-gray-100 text-gray-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5 mt-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">항목별 집행 합계</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {categorySums.map((item) => (
            <div key={item.category} className="rounded-xl border border-gray-200 p-3">
              <p className="text-xs text-gray-500">{item.category}</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{formatKrw(item.amount)}원</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
