'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { toast } from 'sonner'
import { ShieldCheck, Loader2, Mail, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { forgotPasswordSchema } from '@/lib/validators/schemas'
import { z } from 'zod'

type ForgotData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [done, setDone]     = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } =
    useForm<ForgotData>({ resolver: zodResolver(forgotPasswordSchema) })

  async function onSubmit(data: ForgotData) {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setLoading(false)
    if (error) { toast.error('이메일 발송에 실패했습니다.'); return }
    setDone(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <ShieldCheck className="w-7 h-7 text-blue-600" />
          <span className="text-blue-600 text-xl font-bold">SafeDoc</span>
        </div>

        <div className="card p-8">
          {done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-green-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">이메일을 확인하세요</h2>
              <p className="text-sm text-gray-500 mb-6">
                비밀번호 재설정 링크를 발송했습니다.<br />
                받은편지함 또는 스팸함을 확인해주세요.
              </p>
              <Link href="/login" className="btn-primary justify-center w-full">
                로그인으로 돌아가기
              </Link>
            </div>
          ) : (
            <>
              <Link href="/login" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6">
                <ArrowLeft className="w-3.5 h-3.5" /> 로그인으로 돌아가기
              </Link>
              <h2 className="text-xl font-bold text-gray-900 mb-1">비밀번호 찾기</h2>
              <p className="text-sm text-gray-500 mb-6">
                가입 시 사용한 이메일을 입력하면 재설정 링크를 보내드립니다.
              </p>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label-base">이메일</label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="example@company.com"
                    className={`input-base ${errors.email ? 'border-red-400' : ''}`}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 발송 중...</> : '재설정 이메일 발송'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
