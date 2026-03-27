import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getProfileForAuth } from '@/lib/supabase/auth-profile'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const PHOTO_BUCKET = 'company-assets'
const MAX_FILE_COUNT = 10
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const CATEGORY_PATTERN = /^[a-z0-9_-]{1,50}$/i
const DOC_ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/

const ALLOWED_CATEGORIES = new Set([
  'risk_assessment',
  'risk_occasional',
  'risk_near_miss',
  'safety_committee',
  'joint_inspection',
  'education_journal',
  'subcontract_pre_work',
  'subcontract_safety_info',
  'subcontract_qualified_vendor',
])

type PhotoAttachmentRecord = {
  id: string
  fileName: string
  filePath: string
  fileSize: number
  fileType: string
  createdAt: string
  uploadedBy: string
}

type PhotoAttachmentResponse = PhotoAttachmentRecord & {
  url: string | null
}

function validateCategoryAndDocId(category: string, docId: string): string | null {
  if (!category || !docId) return 'category, docId는 필수입니다.'
  if (!CATEGORY_PATTERN.test(category) || !ALLOWED_CATEGORIES.has(category)) {
    return '지원하지 않는 category 입니다.'
  }
  if (!DOC_ID_PATTERN.test(docId)) return '유효하지 않은 docId 입니다.'
  return null
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function getBasePrefix(companyId: string, category: string, docId: string): string {
  return `company_${companyId}/document-photos/${category}/${docId}`
}

function getIndexPath(basePrefix: string): string {
  return `${basePrefix}/index.json`
}

async function readIndex(
  admin: ReturnType<typeof createAdminClient>,
  indexPath: string
): Promise<PhotoAttachmentRecord[]> {
  const { data, error } = await admin.storage.from(PHOTO_BUCKET).download(indexPath)
  if (error || !data) {
    return []
  }

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
  indexPath: string,
  records: PhotoAttachmentRecord[]
): Promise<void> {
  const payload = Buffer.from(JSON.stringify(records, null, 2), 'utf-8')
  const { error } = await admin.storage.from(PHOTO_BUCKET).upload(indexPath, payload, {
    upsert: true,
    contentType: 'application/json',
  })
  if (error) throw new Error(`첨부 목록 저장 실패: ${error.message}`)
}

async function withSignedUrl(
  admin: ReturnType<typeof createAdminClient>,
  records: PhotoAttachmentRecord[]
): Promise<PhotoAttachmentResponse[]> {
  return Promise.all(
    records.map(async (record) => {
      const { data, error } = await admin.storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(record.filePath, 60 * 60)
      return {
        ...record,
        url: error ? null : data?.signedUrl ?? null,
      }
    })
  )
}

async function getAuthContext() {
  const supabase = createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: NextResponse.json({ error: '인증 필요' }, { status: 401 }) }

  const { profile, errorMessage } = await getProfileForAuth<{ company_id: string; name: string }>(
    supabase,
    user.id,
    'company_id, name'
  )

  if (!profile?.company_id) {
    return {
      error: NextResponse.json(
        { error: errorMessage ? `프로필 없음 (${errorMessage})` : '프로필 없음' },
        { status: 403 }
      ),
    }
  }

  return { admin, user, profile }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error

    const category = String(req.nextUrl.searchParams.get('category') ?? '').trim()
    const docId = String(req.nextUrl.searchParams.get('docId') ?? '').trim()
    const validationError = validateCategoryAndDocId(category, docId)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const basePrefix = getBasePrefix(auth.profile.company_id, category, docId)
    const indexPath = getIndexPath(basePrefix)
    const records = await readIndex(auth.admin, indexPath)
    const sorted = [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const items = await withSignedUrl(auth.admin, sorted)
    return NextResponse.json({ items })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? '사진 목록을 불러오지 못했습니다.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error

    const formData = await req.formData()
    const category = String(formData.get('category') ?? '').trim()
    const docId = String(formData.get('docId') ?? '').trim()
    const validationError = validateCategoryAndDocId(category, docId)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const files = formData
      .getAll('files')
      .filter((value): value is File => value instanceof File)
    const singleFile = formData.get('file')
    if (files.length === 0 && singleFile instanceof File) files.push(singleFile)

    if (files.length === 0) {
      return NextResponse.json({ error: '업로드할 파일이 없습니다.' }, { status: 400 })
    }
    if (files.length > MAX_FILE_COUNT) {
      return NextResponse.json({ error: `한 번에 최대 ${MAX_FILE_COUNT}개까지 업로드할 수 있습니다.` }, { status: 400 })
    }

    const basePrefix = getBasePrefix(auth.profile.company_id, category, docId)
    const indexPath = getIndexPath(basePrefix)
    const current = await readIndex(auth.admin, indexPath)
    const uploadedBy = auth.profile.name || auth.user.email || '사용자'
    const uploadedRecords: PhotoAttachmentRecord[] = []

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: `이미지 파일만 업로드할 수 있습니다. (${file.name})` }, { status: 400 })
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `파일 크기는 10MB 이하여야 합니다. (${file.name})` }, { status: 400 })
      }

      const photoId = randomUUID()
      const safeName = sanitizeFileName(file.name || 'photo.jpg')
      const filePath = `${basePrefix}/${photoId}_${safeName}`
      const buffer = Buffer.from(await file.arrayBuffer())

      const { error: uploadError } = await auth.admin.storage.from(PHOTO_BUCKET).upload(filePath, buffer, {
        upsert: false,
        contentType: file.type || 'image/jpeg',
      })
      if (uploadError) throw new Error(`사진 업로드 실패: ${uploadError.message}`)

      uploadedRecords.push({
        id: photoId,
        fileName: file.name || safeName,
        filePath,
        fileSize: file.size,
        fileType: file.type || 'image/jpeg',
        createdAt: new Date().toISOString(),
        uploadedBy,
      })
    }

    const nextIndex = [...current, ...uploadedRecords]
    await saveIndex(auth.admin, indexPath, nextIndex)
    const items = await withSignedUrl(auth.admin, [...nextIndex].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    return NextResponse.json({ items }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? '사진 업로드에 실패했습니다.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) return auth.error

    const body = await req.json()
    const category = String(body?.category ?? '').trim()
    const docId = String(body?.docId ?? '').trim()
    const photoId = String(body?.photoId ?? '').trim()
    const validationError = validateCategoryAndDocId(category, docId)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })
    if (!photoId) return NextResponse.json({ error: 'photoId는 필수입니다.' }, { status: 400 })

    const basePrefix = getBasePrefix(auth.profile.company_id, category, docId)
    const indexPath = getIndexPath(basePrefix)
    const current = await readIndex(auth.admin, indexPath)
    const target = current.find((item) => item.id === photoId)
    if (!target) return NextResponse.json({ error: '삭제할 사진을 찾지 못했습니다.' }, { status: 404 })

    const { error: removeError } = await auth.admin.storage.from(PHOTO_BUCKET).remove([target.filePath])
    if (removeError) throw new Error(`사진 삭제 실패: ${removeError.message}`)

    const nextIndex = current.filter((item) => item.id !== photoId)
    await saveIndex(auth.admin, indexPath, nextIndex)
    const items = await withSignedUrl(auth.admin, [...nextIndex].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    return NextResponse.json({ items })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? '사진 삭제에 실패했습니다.' }, { status: 500 })
  }
}
