'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginFormData } from '@/lib/validators/schemas'

export default function LoginPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirectTo   = searchParams.get('redirectTo') || '/dashboard'
  const supabase     = createClient()

  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)

  const { register, handleSubmit, formState: { errors } } =
    useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginFormData) {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    setLoading(false)

    if (error) {
      if (error.message.includes('Invalid login')) {
        toast.error('이메일 또는 비밀번호가 올바르지 않습니다.')
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('이메일 인증을 완료해주세요. 받은편지함을 확인하세요.')
      } else {
        toast.error('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      }
      return
    }

    toast.success('로그인 되었습니다.')
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* 좌측 브랜드 패널 */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1E3A5F] to-[#2E6DA4] flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-white" />
          <span className="text-white text-xl font-bold tracking-tight">SafeDoc</span>
        </div>
        <div>
          <h1 className="text-white text-4xl font-bold leading-tight mb-4">
            산업안전보건<br />문서 통합관리 플랫폼
          </h1>
          <p className="text-blue-200 text-base leading-relaxed mb-8">
            위험성평가를 허브로 삼아 교육일지·작업계획서·순회점검일지를<br />
            자동으로 연계·생성하는 현장 실무 전용 서비스
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: '연계 문서 종류', value: '11종' },
              { label: '자동 생성 항목', value: '7가지' },
              { label: '알림 지원', value: '이메일·카카오' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/10 rounded-xl p-4">
                <div className="text-white text-2xl font-bold">{stat.value}</div>
                <div className="text-blue-200 text-xs mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-blue-300 text-xs">© 2025 SafeDoc. All rights reserved.</p>
      </div>

      {/* 우측 로그인 폼 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* 모바일 로고 */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            <span className="text-blue-600 text-lg font-bold">SafeDoc</span>
          </div>

          <div className="card p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">로그인</h2>
            <p className="text-sm text-gray-500 mb-7">
              계정이 없으신가요?{' '}
              <Link href="/register" className="text-blue-600 hover:underline font-medium">
                회원가입
              </Link>
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* 이메일 */}
              <div>
                <label className="label-base">이메일</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="example@company.com"
                  autoComplete="email"
                  className={`input-base ${errors.email ? 'border-red-400 focus:ring-red-500' : ''}`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* 비밀번호 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label-base mb-0">비밀번호</label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    비밀번호 찾기
                  </Link>
                </div>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPw ? 'text' : 'password'}
                    placeholder="8자 이상"
                    autoComplete="current-password"
                    className={`input-base pr-10 ${errors.password ? 'border-red-400 focus:ring-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-2.5 mt-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 로그인 중...</>
                ) : '로그인'}
              </button>
            </form>

            {/* 구분선 */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-gray-400">또는</span>
              </div>
            </div>

            {/* 데모 계정 */}
            <button
              type="button"
              onClick={async () => {
                setLoading(true)
                const { error } = await supabase.auth.signInWithPassword({
                  email: 'demo@safedoc.kr',
                  password: 'demo1234!',
                })
                setLoading(false)
                if (!error) { router.push('/dashboard'); router.refresh() }
                else toast.info('데모 계정을 준비 중입니다.')
              }}
              className="btn-secondary w-full justify-center py-2.5"
            >
              데모 계정으로 체험하기
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            로그인 시 <Link href="/terms" className="hover:underline">이용약관</Link> 및{' '}
            <Link href="/privacy" className="hover:underline">개인정보처리방침</Link>에 동의합니다.
          </p>
        </div>
      </div>
    </div>
  )
}
