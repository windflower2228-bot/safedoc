'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, Search, Mail, Shield, UserX, UserCheck, Loader2, X, CheckCircle2, XCircle } from 'lucide-react'
import { userInviteSchema, type UserInviteFormData } from '@/lib/validators/schemas'
import type { UserProfile } from '@/types'

const ROLE_LABELS: Record<string, string> = {
  super_admin:   '슈퍼관리자',
  company_admin: '회사관리자',
  manager:       '담당자',
  viewer:        '열람자',
}
const ROLE_COLORS: Record<string, string> = {
  super_admin:   'bg-purple-100 text-purple-700',
  company_admin: 'bg-blue-100 text-blue-700',
  manager:       'bg-green-100 text-green-700',
  viewer:        'bg-gray-100 text-gray-600',
}
const POSITIONS = [
  '안전보건총괄책임자', '안전보건관리책임자', '안전관리자',
  '보건관리자', '관리감독자', '안전보건담당자', '현장소장', '기타',
]

export default function UsersPage() {
  const [users, setUsers]       = useState<UserProfile[]>([])
  const [joinRequests, setJoinRequests] = useState<Array<{
    id: string
    requester_email: string
    requester_name: string
    requester_position: string
    requester_department: string | null
    requester_phone: string | null
    requested_role: string
    requested_at: string
  }>>([])
  const [loading, setLoading]   = useState(true)
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [q, setQ]               = useState('')
  const [showModal, setModal]   = useState(false)
  const [submitting, setSub]    = useState(false)
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<UserInviteFormData>({ resolver: zodResolver(userInviteSchema) })

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/users${q ? `?q=${encodeURIComponent(q)}` : ''}`)
    const json = await res.json()
    setUsers(json.data ?? [])
    setLoading(false)
  }, [q])

  const fetchJoinRequests = useCallback(async () => {
    setLoadingRequests(true)
    try {
      const res = await fetch('/api/company-join-requests')
      if (res.status === 403 || res.status === 401) {
        setJoinRequests([])
        return
      }
      const json = await res.json()
      if (!res.ok) {
        setJoinRequests([])
        return
      }
      setJoinRequests(json.data ?? [])
    } finally {
      setLoadingRequests(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
    fetchJoinRequests()
  }, [fetchUsers, fetchJoinRequests])

  async function onInvite(data: UserInviteFormData) {
    setSub(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    setSub(false)
    if (!res.ok) { toast.error(json.error); return }
    toast.success(json.message)
    reset()
    setModal(false)
    fetchUsers()
  }

  async function toggleActive(userId: string, current: boolean) {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !current } : u))
      toast.success(!current ? '계정을 활성화했습니다.' : '계정을 비활성화했습니다.')
    }
  }

  async function reviewJoinRequest(id: string, action: 'approve' | 'reject') {
    setReviewingId(id)
    try {
      const res = await fetch(`/api/company-join-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? '요청 처리에 실패했습니다.')
        return
      }
      toast.success(json.message ?? (action === 'approve' ? '승인 처리되었습니다.' : '반려 처리되었습니다.'))
      setJoinRequests(prev => prev.filter(r => r.id !== id))
      fetchUsers()
    } finally {
      setReviewingId(null)
    }
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">사용자 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">회사 구성원을 초대하고 권한을 설정합니다.</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> 사용자 초대
        </button>
      </div>

      {/* 검색 */}
      <div className="card p-4 mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="이름, 이메일, 직급 검색..."
            className="input-base pl-9"
          />
        </div>
      </div>

      {/* 사용자 목록 */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">이름 / 직급</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">이메일</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">부서</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">권한</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">상태</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(user => (
                <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${!user.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-blue-700">{user.name.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-400">{user.position}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-gray-300 flex-shrink-0" />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{user.department ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${ROLE_COLORS[user.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      <Shield className="w-3 h-3" />
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${user.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {user.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(user.id, user.is_active)}
                      className={`p-1.5 rounded-lg transition-colors ${user.is_active
                        ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                        : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                      title={user.is_active ? '비활성화' : '활성화'}
                    >
                      {user.is_active
                        ? <UserX className="w-4 h-4" />
                        : <UserCheck className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-gray-400">
                    사용자가 없습니다. 팀원을 초대해보세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 가입신청 승인 */}
      <div className="card overflow-hidden mt-6">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">회사 가입신청 승인</h2>
          <p className="text-xs text-gray-500 mt-0.5">사용자가 회사 검색으로 신청한 합류 요청을 승인/반려합니다.</p>
        </div>
        {loadingRequests ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : joinRequests.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">대기 중인 가입신청이 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">신청자</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">이메일</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">요청 권한</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">신청일시</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {joinRequests.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{r.requester_name}</div>
                    <div className="text-xs text-gray-400">{r.requester_position || '직급 미입력'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{r.requester_email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${ROLE_COLORS[r.requested_role] ?? 'bg-gray-100 text-gray-600'}`}>
                      <Shield className="w-3 h-3" />
                      {ROLE_LABELS[r.requested_role] ?? r.requested_role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(r.requested_at).toLocaleString('ko-KR')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        disabled={reviewingId === r.id}
                        onClick={() => reviewJoinRequest(r.id, 'approve')}
                        className="btn-secondary text-xs px-2 py-1.5 border-green-200 text-green-700 hover:bg-green-50"
                      >
                        {reviewingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        승인
                      </button>
                      <button
                        type="button"
                        disabled={reviewingId === r.id}
                        onClick={() => reviewJoinRequest(r.id, 'reject')}
                        className="btn-secondary text-xs px-2 py-1.5 border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        반려
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 초대 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">사용자 초대</h2>
              <button onClick={() => { setModal(false); reset() }} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onInvite)} className="space-y-4">
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

              <div>
                <label className="label-base">이메일 *</label>
                <input {...register('email')} type="email" placeholder="member@company.com" className={`input-base ${errors.email ? 'border-red-400' : ''}`} />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-base">부서 (선택)</label>
                  <input {...register('department')} placeholder="안전보건팀" className="input-base" />
                </div>
                <div>
                  <label className="label-base">연락처 (선택)</label>
                  <input {...register('phone')} placeholder="010-0000-0000" className="input-base" />
                </div>
              </div>

              <div>
                <label className="label-base">권한 *</label>
                <select {...register('role')} className={`input-base ${errors.role ? 'border-red-400' : ''}`}>
                  <option value="viewer">열람자 — 문서 조회만 가능</option>
                  <option value="manager">담당자 — 문서 작성·수정 가능</option>
                  <option value="company_admin">회사관리자 — 전체 관리</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModal(false); reset() }} className="btn-secondary flex-1">
                  취소
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> 초대 중...</> : '초대 이메일 발송'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
