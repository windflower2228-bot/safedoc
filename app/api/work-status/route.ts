import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getProfileForAuth } from '@/lib/supabase/auth-profile'

const BUCKET = 'company-assets'
const MAX_PHOTO_SIZE = 15 * 1024 * 1024

type WorklogMatch = {
  worklogId: string
  uploadDate: string
  fileName: string
  summary: string
  snippet: string
}

type WorkStatusItem = {
  id: string
  location: string
  note: string
  capturedAt: string
  createdAt: string
  createdBy: string
  photoPath: string
  photoUrl: string
  linkedWorkLabel: string
  worklogMatches: WorklogMatch[]
}

function getIndexPath(companyId: string): string {
  return `company_${companyId}/work-status/index.json`
}

function getPhotoPath(companyId: string, id: string, fileName: string): string {
  const safeName = fileName
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 120)
  return `company_${companyId}/work-status/photos/${id}_${safeName}`
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function extractSnippet(rawText: string, location: string): string {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const target = normalizeText(location)
  const found = lines.find((line) => normalizeText(line).includes(target))
  if (found) return found.slice(0, 120)
  const idx = normalizeText(rawText).indexOf(target)
  if (idx < 0) return ''
  const start = Math.max(0, idx - 25)
  const end = Math.min(rawText.length, idx + location.length + 55)
  return rawText.slice(start, end).replace(/\s+/g, ' ').trim().slice(0, 120)
}

async function readItems(admin: ReturnType<typeof createAdminClient>, companyId: string): Promise<WorkStatusItem[]> {
  const { data, error } = await admin.storage.from(BUCKET).download(getIndexPath(companyId))
  if (error || !data) return []
  try {
    const parsed = JSON.parse(await data.text())
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item && typeof item === 'object' && item.id && item.location && item.photoPath)
      .map((item) => ({
        id: String(item.id),
        location: String(item.location),
        note: String(item.note ?? ''),
        capturedAt: String(item.capturedAt ?? new Date().toISOString()),
        createdAt: String(item.createdAt ?? new Date().toISOString()),
        createdBy: String(item.createdBy ?? '사용자'),
        photoPath: String(item.photoPath),
        photoUrl: String(item.photoUrl ?? ''),
        linkedWorkLabel: String(item.linkedWorkLabel ?? ''),
        worklogMatches: Array.isArray(item.worklogMatches)
          ? item.worklogMatches
              .filter((m: any) => m && m.worklogId)
              .map((m: any) => ({
                worklogId: String(m.worklogId),
                uploadDate: String(m.uploadDate ?? ''),
                fileName: String(m.fileName ?? ''),
                summary: String(m.summary ?? ''),
                snippet: String(m.snippet ?? ''),
              }))
          : [],
      }))
  } catch {
    return []
  }
}

async function writeItems(admin: ReturnType<typeof createAdminClient>, companyId: string, items: WorkStatusItem[]) {
  const payload = Buffer.from(JSON.stringify(items, null, 2), 'utf-8')
  const { error } = await admin.storage.from(BUCKET).upload(getIndexPath(companyId), payload, {
    upsert: true,
    contentType: 'application/json',
  })
  if (error) throw new Error(`작업상황 저장 실패: ${error.message}`)
}

async function findWorklogMatches(
  userClient: ReturnType<typeof createClient>,
  companyId: string,
  location: string
): Promise<{ linkedWorkLabel: string; matches: WorklogMatch[] }> {
  if (!location.trim()) return { linkedWorkLabel: '', matches: [] }

  const { data, error } = await userClient
    .from('worklog_analyses')
    .select('id, upload_date, file_name, summary, raw_text')
    .eq('company_id', companyId)
    .order('upload_date', { ascending: false })
    .limit(80)

  if (error || !data) return { linkedWorkLabel: '', matches: [] }

  const target = normalizeText(location)
  const matches: WorklogMatch[] = []
  for (const row of data) {
    const rawText = String(row.raw_text ?? '')
    const summary = String(row.summary ?? '')
    const haystack = normalizeText(`${rawText}\n${summary}`)
    if (!haystack.includes(target)) continue

    const snippet = extractSnippet(rawText || summary, location) || summary
    matches.push({
      worklogId: String(row.id),
      uploadDate: String(row.upload_date ?? ''),
      fileName: String(row.file_name ?? ''),
      summary,
      snippet,
    })
  }

  const linkedWorkLabel = matches[0]?.snippet || ''
  return { linkedWorkLabel, matches }
}

async function getAuth() {
  const supabase = createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: '인증 필요' }, { status: 401 }) }

  const { profile, errorMessage } = await getProfileForAuth<{ company_id: string; role: string; name: string }>(
    supabase,
    user.id,
    'company_id, role, name'
  )
  if (!profile?.company_id) {
    return {
      error: NextResponse.json(
        { error: errorMessage ? `프로필 없음 (${errorMessage})` : '프로필 없음' },
        { status: 403 }
      ),
    }
  }

  return { supabase, admin, user, profile }
}

export async function GET() {
  try {
    const auth = await getAuth()
    if ('error' in auth) return auth.error
    const items = await readItems(auth.admin, auth.profile.company_id)
    const sorted = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return NextResponse.json({ items: sorted })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? '작업상황을 불러오지 못했습니다.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth()
    if ('error' in auth) return auth.error

    const form = await req.formData()
    const location = String(form.get('location') ?? '').trim()
    const note = String(form.get('note') ?? '').trim()
    const capturedAt = String(form.get('capturedAt') ?? '').trim() || new Date().toISOString()
    const file = form.get('photo')

    if (!location) return NextResponse.json({ error: '작업위치를 입력해주세요.' }, { status: 400 })
    if (!(file instanceof File)) return NextResponse.json({ error: '사진 파일이 필요합니다.' }, { status: 400 })
    if (file.size <= 0) return NextResponse.json({ error: '빈 파일은 업로드할 수 없습니다.' }, { status: 400 })
    if (file.size > MAX_PHOTO_SIZE) return NextResponse.json({ error: '사진은 15MB 이하만 업로드할 수 있습니다.' }, { status: 400 })

    const id = randomUUID()
    const photoPath = getPhotoPath(auth.profile.company_id, id, file.name || 'photo.jpg')
    const photoBuffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await auth.admin.storage.from(BUCKET).upload(photoPath, photoBuffer, {
      upsert: true,
      contentType: file.type || 'image/jpeg',
    })
    if (uploadError) return NextResponse.json({ error: `사진 업로드 실패: ${uploadError.message}` }, { status: 500 })

    const {
      data: { publicUrl },
    } = auth.admin.storage.from(BUCKET).getPublicUrl(photoPath)

    const { linkedWorkLabel, matches } = await findWorklogMatches(auth.supabase, auth.profile.company_id, location)

    const item: WorkStatusItem = {
      id,
      location,
      note,
      capturedAt,
      createdAt: new Date().toISOString(),
      createdBy: auth.profile.name || auth.user.email || '사용자',
      photoPath,
      photoUrl: publicUrl,
      linkedWorkLabel,
      worklogMatches: matches.slice(0, 5),
    }

    const current = await readItems(auth.admin, auth.profile.company_id)
    await writeItems(auth.admin, auth.profile.company_id, [item, ...current])
    return NextResponse.json({ item }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? '작업상황 등록에 실패했습니다.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuth()
    if ('error' in auth) return auth.error

    const body = await req.json()
    const id = String(body?.id ?? '').trim()
    if (!id) return NextResponse.json({ error: '삭제할 항목 id가 필요합니다.' }, { status: 400 })

    const current = await readItems(auth.admin, auth.profile.company_id)
    const target = current.find((item) => item.id === id)
    if (!target) return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 })

    const { error: removeError } = await auth.admin.storage.from(BUCKET).remove([target.photoPath])
    if (removeError) {
      console.error('work-status photo remove failed', removeError)
    }

    const next = current.filter((item) => item.id !== id)
    await writeItems(auth.admin, auth.profile.company_id, next)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? '작업상황 삭제에 실패했습니다.' }, { status: 500 })
  }
}

