import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const OSH_QNA_BUCKET = 'company-assets'
const OSH_QNA_PREFIX = 'osh-qna-board'

type StorageClient = {
  storage: {
    from: (bucket: string) => {
      list: (path: string, options?: any) => Promise<{ data: any[] | null; error: any }>
      download: (path: string) => Promise<{ data: any; error: any }>
      upload: (path: string, body: any, options?: any) => Promise<{ data: any; error: any }>
      createSignedUrl: (path: string, expiresIn: number) => Promise<{ data: any; error: any }>
    }
  }
}

export type OshQnaAttachment = {
  fileName: string
  filePath: string
  fileSize: number
  fileType: string
}

export type OshQnaRecord = {
  id: string
  number: string
  title: string
  institution: string
  questionDate: string
  answerDate: string
  question: string
  answer: string
  tags: string[]
  source: string
  createdAt?: string
  authorName?: string
  isUserUpload?: boolean
  attachment?: OshQnaAttachment | null
}

let staticCache: OshQnaRecord[] | null = null

export async function loadStaticQnaData(): Promise<OshQnaRecord[]> {
  if (staticCache) return staticCache
  const filePath = path.join(process.cwd(), 'data', 'osh-qna.json')
  const raw = await readFile(filePath, 'utf-8')
  staticCache = JSON.parse(raw) as OshQnaRecord[]
  return staticCache
}

export function toPositiveInt(value: string | null, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.floor(n)
}

export function getCompanyPrefix(companyId: string): string {
  return `${OSH_QNA_PREFIX}/${companyId}`
}

function getPostsPrefix(companyId: string): string {
  return `${getCompanyPrefix(companyId)}/posts`
}

function getAttachmentPrefix(companyId: string, postId: string): string {
  return `${getCompanyPrefix(companyId)}/attachments/${postId}`
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-가-힣]/g, '_')
}

function toIsoDate(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

function toRecordDateSortKey(item: OshQnaRecord): string {
  return item.answerDate || item.questionDate || item.createdAt || ''
}

export async function listUserQnaPosts(admin: StorageClient, companyId: string): Promise<OshQnaRecord[]> {
  const prefix = getPostsPrefix(companyId)
  const { data, error } = await admin.storage.from(OSH_QNA_BUCKET).list(prefix, {
    limit: 1000,
    offset: 0,
    sortBy: { column: 'name', order: 'desc' },
  })

  if (error || !data || data.length === 0) return []

  const posts: OshQnaRecord[] = []
  for (const item of data) {
    const name = String(item?.name ?? '')
    if (!name.endsWith('.json')) continue

    const objectPath = `${prefix}/${name}`
    const { data: fileBlob, error: fileError } = await admin.storage.from(OSH_QNA_BUCKET).download(objectPath)
    if (fileError || !fileBlob) continue

    try {
      const text = await fileBlob.text()
      const parsed = JSON.parse(text) as OshQnaRecord
      if (!parsed?.id || !parsed?.title) continue
      posts.push({
        ...parsed,
        isUserUpload: true,
        source: parsed.source || '사용자 업로드',
      })
    } catch {
      // ignore broken JSON
    }
  }

  return posts.sort((a, b) => toRecordDateSortKey(b).localeCompare(toRecordDateSortKey(a)))
}

export async function createUserQnaPost(params: {
  admin: StorageClient
  companyId: string
  authorId: string
  authorName: string
  title: string
  question: string
  answer: string
  tags: string[]
  file: File | null
}): Promise<OshQnaRecord> {
  const { admin, companyId, authorId, authorName, title, question, answer, tags, file } = params
  const postId = crypto.randomUUID()
  const now = new Date()

  let attachment: OshQnaAttachment | null = null
  if (file && file.size > 0) {
    const safeName = sanitizeFileName(file.name || 'upload.bin')
    const attachmentPath = `${getAttachmentPrefix(companyId, postId)}/${Date.now()}_${safeName}`
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadErr } = await admin.storage
      .from(OSH_QNA_BUCKET)
      .upload(attachmentPath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadErr) {
      throw new Error(`첨부 업로드 실패: ${uploadErr.message}`)
    }

    attachment = {
      fileName: file.name || safeName,
      filePath: attachmentPath,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
    }
  }

  const record: OshQnaRecord = {
    id: `upload_${postId}`,
    number: '',
    title: title.trim(),
    institution: '사용자 업로드',
    questionDate: toIsoDate(now),
    answerDate: toIsoDate(now),
    question: question.trim(),
    answer: answer.trim(),
    tags,
    source: '사용자 업로드',
    createdAt: now.toISOString(),
    authorName,
    isUserUpload: true,
    attachment,
  }

  const postPath = `${getPostsPrefix(companyId)}/${postId}.json`
  const { error: saveErr } = await admin.storage
    .from(OSH_QNA_BUCKET)
    .upload(postPath, Buffer.from(JSON.stringify(record, null, 2), 'utf-8'), {
      contentType: 'application/json',
      upsert: false,
    })

  if (saveErr) {
    throw new Error(`게시글 저장 실패: ${saveErr.message}`)
  }

  return record
}

export async function getUserUploadById(admin: StorageClient, companyId: string, postId: string): Promise<OshQnaRecord | null> {
  const posts = await listUserQnaPosts(admin, companyId)
  return posts.find((item) => item.id === postId) ?? null
}

export async function createAttachmentSignedUrl(admin: StorageClient, filePath: string): Promise<string> {
  const { data, error } = await admin.storage
    .from(OSH_QNA_BUCKET)
    .createSignedUrl(filePath, 60)

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? '다운로드 URL 생성 실패')
  }

  return data.signedUrl
}
