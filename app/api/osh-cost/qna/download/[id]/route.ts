import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getProfileForAuth } from '@/lib/supabase/auth-profile'
import { createAttachmentSignedUrl, getUserUploadById } from '@/lib/oshQnaBoard'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const admin = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const { profile, errorMessage } = await getProfileForAuth<{ company_id: string }>(
      supabase,
      user.id,
      'company_id'
    )
    if (!profile?.company_id) {
      return NextResponse.json(
        { error: errorMessage ? `프로필 없음 (${errorMessage})` : '프로필 없음' },
        { status: 403 }
      )
    }

    const post = await getUserUploadById(admin as any, profile.company_id, params.id)
    if (!post) return NextResponse.json({ error: '게시글을 찾을 수 없습니다.' }, { status: 404 })
    if (!post.attachment?.filePath) return NextResponse.json({ error: '첨부파일이 없습니다.' }, { status: 404 })

    const signedUrl = await createAttachmentSignedUrl(admin as any, post.attachment.filePath)
    return NextResponse.json({ url: signedUrl, fileName: post.attachment.fileName })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? '다운로드 URL 생성 실패' }, { status: 500 })
  }
}
