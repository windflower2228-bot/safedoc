'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Camera, Loader2, Trash2, Upload } from 'lucide-react'

type PhotoAttachment = {
  id: string
  fileName: string
  filePath: string
  fileSize: number
  fileType: string
  createdAt: string
  uploadedBy: string
  url: string | null
}

type Props = {
  category: string
  docId: string
  title?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export default function DocumentPhotoSection({
  category,
  docId,
  title = '첨부 사진',
}: Props) {
  const [items, setItems] = useState<PhotoAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ category, docId })
    return params.toString()
  }, [category, docId])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/document-photos?${queryString}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? '사진 목록 조회 실패')
      setItems(Array.isArray(json?.items) ? json.items : [])
    } catch (error: any) {
      toast.error(error?.message ?? '사진 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [queryString])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  async function onSelectFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList)

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('category', category)
      formData.append('docId', docId)
      files.forEach((file) => formData.append('files', file))

      const res = await fetch('/api/document-photos', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? '사진 업로드 실패')

      setItems(Array.isArray(json?.items) ? json.items : [])
      toast.success(`${files.length}장 업로드 완료`)
    } catch (error: any) {
      toast.error(error?.message ?? '사진 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function onDelete(photoId: string) {
    setDeletingId(photoId)
    try {
      const res = await fetch('/api/document-photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, docId, photoId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? '사진 삭제 실패')

      setItems(Array.isArray(json?.items) ? json.items : [])
      toast.success('사진을 삭제했습니다.')
    } catch (error: any) {
      toast.error(error?.message ?? '사진 삭제에 실패했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className="card p-4 mt-4">
        <div className="no-print flex items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              업로드한 사진은 인쇄 시 문서 하단에 함께 출력됩니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onSelectFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="btn-secondary text-xs gap-1.5"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              사진 업로드
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-24 flex items-center justify-center text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> 사진 목록 불러오는 중...
          </div>
        ) : items.length === 0 ? (
          <div className="h-24 border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-sm">
            <Camera className="w-4 h-4 mr-2" /> 등록된 사진이 없습니다.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <a href={item.url ?? '#'} target="_blank" rel="noreferrer" className="block bg-gray-100">
                  {item.url ? (
                    <img src={item.url} alt={item.fileName} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 flex items-center justify-center text-gray-400 text-xs">미리보기 불가</div>
                  )}
                </a>
                <div className="p-2.5 no-print">
                  <div className="text-xs font-medium text-gray-800 truncate">{item.fileName}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {formatFileSize(item.fileSize)} · {item.createdAt.slice(0, 10)}
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      disabled={deletingId === item.id}
                      onClick={() => onDelete(item.id)}
                      className="text-[10px] px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center gap-1"
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="hidden print:block mt-6 page-break-before">
          <h3 className="text-sm font-bold text-gray-800 mb-2">{title}</h3>
          <div className="grid grid-cols-2 gap-3">
            {items
              .filter((item) => Boolean(item.url))
              .map((item) => (
                <div key={`print-${item.id}`} className="border border-gray-300 rounded p-2">
                  <img src={item.url ?? ''} alt={item.fileName} className="w-full h-48 object-cover rounded" />
                  <div className="text-[10px] text-gray-600 mt-1">{item.fileName}</div>
                </div>
              ))}
          </div>
        </div>
      )}
    </>
  )
}
