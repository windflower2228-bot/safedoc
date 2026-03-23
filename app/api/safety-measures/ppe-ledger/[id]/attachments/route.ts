import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const BUCKET = 'company-assets'
const MAX_FILE_COUNT = 10
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

type AttachmentRecord = {
  id: string
  fileName: string
  filePath: string
  fileSize: number
  fileType: string
  createdAt: string
  uploadedBy: string
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function basePrefix(companyId: string, docId: string): string {
  return `company_${companyId}/ppe-ledger/${docId}/attachments`
}

function indexPath(companyId: string, docId: string): string {
  return `${basePrefix(companyId, docId)}/index.json`
}

async function readIndex(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  docId: string
): Promise<AttachmentRecord[]> {
  const { data, error } = await admin.storage.from(BUCKET).download(indexPath(companyId, docId))
  if (error || !data) return []

  try {
    const raw = await data.text()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((item) => item && typeof item === 'object' && item.id && item.filePath)
      .map((item) => ({
        id: String(item.id),
        fileName: String(item.fileName ?? ''),
        filePath: String(item.filePath),
        fileSize: Number(item.fileSize ?? 0),
        fileType: String(item.fileType ?? 'application/octet-stream'),
        createdAt: String(item.createdAt ?? new Date().toISOString()),
        uploadedBy: String(item.uploadedBy ?? '사용자'),
      }))
  } catch {
    return []
  }
}

async function saveIndex(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  docId: string,
  records: AttachmentRecord[]
) {
  const payload = Buffer.from(JSON.stringify(records, null, 2), 'utf-8')
  const { error } = await admin.storage.from(BUCKET).upload(indexPath(companyId, docId), payload, {
    upsert: true,
    contentType: 'application/json',
  })
  if (error) throw new Error(`첨부 목록 저장 실패: ${error.message}`)
}

async function withSignedUrl(
  admin: ReturnType<typeof createAdminClient>,
  records: AttachmentRecord[]
) {
  return Promise.all(
    records.map(async (record) => {
      const { data, error } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(record.filePath, 60 * 60)
      return { ...record, url: error ? null : data?.signedUrl ?? null }
    })
  )
}

async function getAuthAndDoc(docId: string) {
  const supabase = createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: '인증 필요' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id, name')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) {
    return { error: NextResponse.json({ error: '프로필 없음' }, { status: 403 }) }
  }

  const { data: doc, error: docError } = await supabase
    .from('ppe_ledger')
    .select('id')
    .eq('id', docId)
    .single()

  if (docError || !doc) {
    return { error: NextResponse.json({ error: '보호구 지급대장을 찾을 수 없습니다.' }, { status: 404 }) }
  }

  return { admin, user, profile }
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthAndDoc(params.id)
    if ('error' in auth) return auth.error

    const records = await readIndex(auth.admin, auth.profile.company_id, params.id)
    const sorted = [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const items = await withSignedUrl(auth.admin, sorted)
    return NextResponse.json({ items })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? '첨부 파일을 불러오지 못했습니다.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthAndDoc(params.id)
    if ('error' in auth) return auth.error

    const formData = await req.formData()
    const files = formData
      .getAll('files')
      .filter((value): value is File => value instanceof File)

    if (files.length === 0) {
      return NextResponse.json({ error: '업로드할 파일이 없습니다.' }, { status: 400 })
    }
    if (files.length > MAX_FILE_COUNT) {
      return NextResponse.json({ error: `한 번에 최대 ${MAX_FILE_COUNT}개까지 업로드할 수 있습니다.` }, { status: 400 })
    }

    const current = await readIndex(auth.admin, auth.profile.company_id, params.id)
    const uploadedBy = auth.profile.name || auth.user.email || '사용자'
    const created: AttachmentRecord[] = []

    for (const file of files) {
      const isImage = file.type.startsWith('image/')
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      if (!isImage && !isPdf) {
        return NextResponse.json({ error: `사진 또는 PDF만 업로드 가능합니다. (${file.name})` }, { status: 400 })
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `파일 크기는 20MB 이하여야 합니다. (${file.name})` }, { status: 400 })
      }

      const attachmentId = randomUUID()
      const safeName = sanitizeFileName(file.name || 'attachment')
      const filePath = `${basePrefix(auth.profile.company_id, params.id)}/${attachmentId}_${safeName}`
      const buffer = Buffer.from(await file.arrayBuffer())

      const { error: uploadError } = await auth.admin.storage.from(BUCKET).upload(filePath, buffer, {
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      })
      if (uploadError) throw new Error(`첨부 업로드 실패: ${uploadError.message}`)

      created.push({
        id: attachmentId,
        fileName: file.name || safeName,
        filePath,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
        createdAt: new Date().toISOString(),
        uploadedBy,
      })
    }

    const next = [...current, ...created]
    await saveIndex(auth.admin, auth.profile.company_id, params.id, next)
    const items = await withSignedUrl(auth.admin, [...next].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    return NextResponse.json({ items }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? '첨부 업로드에 실패했습니다.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthAndDoc(params.id)
    if ('error' in auth) return auth.error

    const body = await req.json()
    const attachmentId = String(body?.attachmentId ?? '').trim()
    if (!attachmentId) {
      return NextResponse.json({ error: 'attachmentId는 필수입니다.' }, { status: 400 })
    }

    const current = await readIndex(auth.admin, auth.profile.company_id, params.id)
    const target = current.find((item) => item.id === attachmentId)
    if (!target) {
      return NextResponse.json({ error: '삭제할 첨부 파일을 찾을 수 없습니다.' }, { status: 404 })
    }

    const { error: removeError } = await auth.admin.storage.from(BUCKET).remove([target.filePath])
    if (removeError) throw new Error(`첨부 파일 삭제 실패: ${removeError.message}`)

    const next = current.filter((item) => item.id !== attachmentId)
    await saveIndex(auth.admin, auth.profile.company_id, params.id, next)
    const items = await withSignedUrl(auth.admin, [...next].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    return NextResponse.json({ items })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? '첨부 삭제에 실패했습니다.' }, { status: 500 })
  }
}
