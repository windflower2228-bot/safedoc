'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ShieldCheck, Loader2, Building2, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { registerSchema, type RegisterFormData } from '@/lib/validators/schemas'

const POSITIONS = [
  '안전보건총괄책임자', '안전보건관리책임자', '안전관리자',
  '보건관리자', '관리감독자', '안전보건담당자',
  '현장소장', '공사부장', '기타',
]

export default function RegisterPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [loading, setLoading]     = useState(false)
  const [joinMode, setJoinMode]   = useState<'create' | 'join'>('create')

  const { register, handleSubmit, watch, formState: { errors } } =
    useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) })

  async function onSubmit(data: RegisterFormData) {
    setLoading(true)
    try {
      // 1) Supabase Auth 회원가입
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
        // 2-A) 회사 생성 → API 호출 (service role 필요)
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
      }

      toast.success(
        '가입 완료! 이메일 인증 후 로그인해주세요.',
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
        {/* 로고 */}
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

          {/* 회사 가입 방식 선택 */}
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
            {/* 이름 + 직급 */}
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

            {/* 회사 정보 */}
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
                <label className="label-base">회사 초대 코드 *</label>
                <input
                  {...register('companyCode')}
                  placeholder="관리자에게 받은 6자리 코드"
                  className="input-base tracking-widest uppercase"
                  maxLength={6}
                />
                <p className="mt-1 text-xs text-gray-400">회사 관리자에게 초대 코드를 요청하세요.</p>
              </div>
            )}

            {/* 이메일 */}
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

            {/* 비밀번호 */}
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
