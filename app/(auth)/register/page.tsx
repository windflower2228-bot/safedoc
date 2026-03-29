'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ShieldCheck, Loader2, Building2, UserPlus, Search, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { registerSchema, type RegisterFormData } from '@/lib/validators/schemas'

const POSITIONS = [
  '안전보건총괄책임자', '안전보건관리책임자', '안전관리자',
  '보건관리자', '관리감독자', '안전보건담당자',
  '현장소장', '공사부장', '기타',
]

interface CompanyOption {
  id: string
  name: string
}

export default function RegisterPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [joinMode, setJoinMode] = useState<'create' | 'join'>('create')
  const [companyQuery, setCompanyQuery] = useState('')
  const [companyResults, setCompanyResults] = useState<CompanyOption[]>([])
  const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } =
    useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) })

  useEffect(() => {
    if (joinMode !== 'join') {
      setCompanyQuery('')
      setCompanyResults([])
      setSelectedCompany(null)
      return
    }

    const keyword = companyQuery.trim()
    if (keyword.length < 2) {
      setCompanyResults([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true)
        const res = await fetch(`/api/companies/search?q=${encodeURIComponent(keyword)}`)
        const json = await res.json()
        if (!res.ok) {
          setCompanyResults([])
          return
        }
        setCompanyResults(json.data ?? [])
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [joinMode, companyQuery])

  async function onSubmit(data: RegisterFormData) {
    if (joinMode === 'create' && !(data.companyName ?? '').trim()) {
      toast.error('회사명을 입력해주세요.')
      return
    }
    if (joinMode === 'join' && !selectedCompany) {
      toast.error('가입 신청할 회사를 검색 후 선택해주세요.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { name: data.name, position: data.position },
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      })
      if (authError) throw authError

      const userId = authData.user?.id
      if (!userId) throw new Error('사용자 ID를 가져올 수 없습니다.')

      if (joinMode === 'create' && data.companyName) {
        const res = await fetch('/api/company/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.companyName,
            userId,
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || '회사 생성 중 오류가 발생했습니다.')
        }
      } else if (joinMode === 'join' && selectedCompany) {
        const res = await fetch('/api/company-join-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: selectedCompany.id,
            userId,
            email: data.email,
            name: data.name,
            position: data.position,
            requestedRole: 'viewer',
          }),
        })
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json.error || '가입신청 처리 중 오류가 발생했습니다.')
        }
      }

      toast.success(
        joinMode === 'create'
          ? '가입 완료! 이메일 인증 후 로그인해주세요.'
          : '가입신청이 접수되었습니다. 회사 관리자 승인 후 이용 가능합니다.',
        { description: `${data.email}로 인증 메일을 발송했습니다.`, duration: 8000 }
      )
      router.push('/login')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '회원가입 중 오류가 발생했습니다.'
      if (msg.includes('already registered')) {
        toast.error('이미 가입된 이메일입니다.')
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <ShieldCheck className="w-7 h-7 text-blue-600" />
          <span className="text-blue-600 text-xl font-bold">SafeDoc</span>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">회원가입</h2>
          <p className="text-sm text-gray-500 mb-6">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">로그인</Link>
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setJoinMode('create')}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all
                ${joinMode === 'create'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              <Building2 className="w-4 h-4 flex-shrink-0" />
              <span>새 회사로 시작</span>
            </button>
            <button
              type="button"
              onClick={() => setJoinMode('join')}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all
                ${joinMode === 'join'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              <UserPlus className="w-4 h-4 flex-shrink-0" />
              <span>기존 회사 합류</span>
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-base">이름 *</label>
                <input {...register('name')} placeholder="홍길동" className={`input-base ${errors.name ? 'border-red-400' : ''}`} />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label-base">직급 *</label>
                <select {...register('position')} className={`input-base ${errors.position ? 'border-red-400' : ''}`}>
                  <option value="">선택</option>
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {errors.position && <p className="mt-1 text-xs text-red-500">{errors.position.message}</p>}
              </div>
            </div>

            {joinMode === 'create' ? (
              <div>
                <label className="label-base">회사명 *</label>
                <input
                  {...register('companyName')}
                  placeholder="(주)한국건설"
                  className={`input-base ${errors.companyName ? 'border-red-400' : ''}`}
                />
                {errors.companyName && <p className="mt-1 text-xs text-red-500">{errors.companyName.message}</p>}
              </div>
            ) : (
              <div>
                <label className="label-base">회사 검색 후 가입신청 *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={companyQuery}
                    onChange={(e) => {
                      setCompanyQuery(e.target.value)
                      setSelectedCompany(null)
                    }}
                    placeholder="회사명을 입력하세요 (2자 이상)"
                    className="input-base pl-9"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">원하는 회사를 선택하면 관리자 승인 후 가입됩니다.</p>

                <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-gray-200 bg-white">
                  {searchLoading ? (
                    <div className="px-3 py-2 text-xs text-gray-500">검색 중...</div>
                  ) : companyQuery.trim().length < 2 ? (
                    <div className="px-3 py-2 text-xs text-gray-400">회사명을 2자 이상 입력해주세요.</div>
                  ) : companyResults.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-400">검색 결과가 없습니다.</div>
                  ) : (
                    companyResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCompany(c)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                          selectedCompany?.id === c.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <span>{c.name}</span>
                        {selectedCompany?.id === c.id && <Check className="w-4 h-4" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="label-base">이메일 *</label>
              <input
                {...register('email')}
                type="email"
                placeholder="example@company.com"
                autoComplete="email"
                className={`input-base ${errors.email ? 'border-red-400' : ''}`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-base">비밀번호 *</label>
                <input
                  {...register('password')}
                  type="password"
                  placeholder="8자 이상"
                  className={`input-base ${errors.password ? 'border-red-400' : ''}`}
                />
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
              </div>
              <div>
                <label className="label-base">비밀번호 확인 *</label>
                <input
                  {...register('confirmPassword')}
                  type="password"
                  placeholder="동일하게 입력"
                  className={`input-base ${errors.confirmPassword ? 'border-red-400' : ''}`}
                />
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> 가입 처리 중...</>
                : '회원가입'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

