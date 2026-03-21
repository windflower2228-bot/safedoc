'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calculator, Save, RefreshCw } from 'lucide-react'
import { OSH_COST_TYPES, formatKrw, pickBracketByAmount } from '@/lib/oshCost'

type SavedEstimation = {
  savedAt: string
  projectTypeId: string
  bracketId: string
  materialCost: number
  laborCost: number
  contractorProvidedCost: number
  includeContractorProvided: boolean
  rate: number
  baseAmount: number
  resultAmount: number
}

export default function OshCostEstimationPage() {
  const [projectTypeId, setProjectTypeId] = useState(OSH_COST_TYPES[0].id)
  const selectedType = useMemo(
    () => OSH_COST_TYPES.find((item) => item.id === projectTypeId) ?? OSH_COST_TYPES[0],
    [projectTypeId]
  )

  const [materialCost, setMaterialCost] = useState(0)
  const [laborCost, setLaborCost] = useState(0)
  const [contractorProvidedCost, setContractorProvidedCost] = useState(0)
  const [includeContractorProvided, setIncludeContractorProvided] = useState(false)

  const [bracketId, setBracketId] = useState(selectedType.brackets[0].id)
  const selectedBracket = useMemo(
    () => selectedType.brackets.find((item) => item.id === bracketId) ?? selectedType.brackets[0],
    [selectedType, bracketId]
  )

  const [rate, setRate] = useState(selectedBracket.rate)
  const [baseAmount, setBaseAmount] = useState(selectedBracket.baseAmount)
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => {
    setBracketId(selectedType.brackets[0].id)
  }, [selectedType.id])

  useEffect(() => {
    setRate(selectedBracket.rate)
    setBaseAmount(selectedBracket.baseAmount)
  }, [selectedBracket.id])

  const targetNoProvided = Math.max(0, materialCost) + Math.max(0, laborCost)
  const targetWithProvided = targetNoProvided + Math.max(0, contractorProvidedCost)
  const rateFactor = Math.max(0, rate) / 100

  const baseCalcAmount = targetNoProvided * rateFactor + Math.max(0, baseAmount)
  const providedCalcAmount = targetWithProvided * rateFactor + Math.max(0, baseAmount)
  const providedLimitAmount = baseCalcAmount * 1.2

  const resultAmount = includeContractorProvided
    ? Math.min(providedCalcAmount, providedLimitAmount)
    : baseCalcAmount

  const autoPickBracket = () => {
    const amountForPick = includeContractorProvided ? targetWithProvided : targetNoProvided
    const found = pickBracketByAmount(selectedType, amountForPick)
    setBracketId(found.id)
  }

  const saveSnapshot = () => {
    const payload: SavedEstimation = {
      savedAt: new Date().toISOString(),
      projectTypeId,
      bracketId,
      materialCost,
      laborCost,
      contractorProvidedCost,
      includeContractorProvided,
      rate,
      baseAmount,
      resultAmount,
    }
    localStorage.setItem('osh-cost-estimation-snapshot', JSON.stringify(payload))
    setSavedMessage('계상 결과를 저장했습니다. "사용" 화면에서 불러와서 바로 집행내역을 작성할 수 있습니다.')
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <Link href="/osh-cost" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-cyan-600" />
          산업안전보건관리비 계상
        </h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">기본 입력</h2>

          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-gray-500">공사종류</span>
              <select
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={projectTypeId}
                onChange={(e) => setProjectTypeId(e.target.value)}
              >
                {OSH_COST_TYPES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">{selectedType.description}</p>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-gray-500">재료비(원)</span>
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={materialCost}
                  onChange={(e) => setMaterialCost(Number(e.target.value) || 0)}
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">직접노무비(원)</span>
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={laborCost}
                  onChange={(e) => setLaborCost(Number(e.target.value) || 0)}
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs text-gray-500">도급자관급자재비(원)</span>
              <input
                type="number"
                min={0}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={contractorProvidedCost}
                onChange={(e) => setContractorProvidedCost(Number(e.target.value) || 0)}
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={includeContractorProvided}
                onChange={(e) => setIncludeContractorProvided(e.target.checked)}
              />
              도급자관급자재 포함 공사(상한식 동시 적용)
            </label>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">별표 1 적용값</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="block flex-1">
                <span className="text-xs text-gray-500">공사규모 구간</span>
                <select
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={bracketId}
                  onChange={(e) => setBracketId(e.target.value)}
                >
                  {selectedType.brackets.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={autoPickBracket}
                className="mt-5 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                자동선택
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-gray-500">요율(%)</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value) || 0)}
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">기초액(원)</span>
                <input
                  type="number"
                  min={0}
                  step="1000"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  value={baseAmount}
                  onChange={(e) => setBaseAmount(Number(e.target.value) || 0)}
                />
              </label>
            </div>

            <div className="rounded-lg border border-cyan-100 bg-cyan-50/40 px-3 py-2 text-[11px] text-cyan-800">
              <p>대상액(도급자관급 미포함): {formatKrw(targetNoProvided)}원</p>
              <p>대상액(도급자관급 포함): {formatKrw(targetWithProvided)}원</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5 mt-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">계상 결과</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-500 mb-1">기본 산식</p>
            <p className="text-sm font-semibold text-gray-900">
              ({formatKrw(targetNoProvided)} × {rate.toFixed(2)}%) + {formatKrw(baseAmount)}
            </p>
            <p className="text-lg font-bold text-gray-900 mt-1">{formatKrw(baseCalcAmount)}원</p>
          </div>

          <div className="rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-500 mb-1">도급자관급 포함 산식</p>
            <p className="text-sm font-semibold text-gray-900">
              ({formatKrw(targetWithProvided)} × {rate.toFixed(2)}%) + {formatKrw(baseAmount)}
            </p>
            <p className="text-lg font-bold text-gray-900 mt-1">{formatKrw(providedCalcAmount)}원</p>
            <p className="text-[11px] text-gray-500 mt-1">상한식: 기본산식 × 1.2 = {formatKrw(providedLimitAmount)}원</p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs text-blue-700 mb-1">최종 계상액</p>
            <p className="text-2xl font-extrabold text-blue-700">{formatKrw(resultAmount)}원</p>
            <p className="text-[11px] text-blue-700/80 mt-1">
              {includeContractorProvided ? '도급자관급 포함 상한 비교 적용' : '기본 산식 적용'}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={saveSnapshot}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            계상결과 저장
          </button>
          <Link
            href="/osh-cost/usage"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
          >
            사용내역 작성으로 이동
          </Link>
        </div>

        {savedMessage && <p className="mt-2 text-xs text-cyan-700">{savedMessage}</p>}
        <p className="mt-2 text-[11px] text-gray-500">
          화면의 요율/기초액은 편집 가능합니다. 최신 고시 원문과 발주기관 기준이 다르면 해당 값으로 수정해서 계산하세요.
        </p>
      </div>
    </div>
  )
}
