'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
export default function Page() {
  const router = useRouter()
  useEffect(() => { router.replace('/documents/joint-inspection') }, [])
  return <div className="flex items-center justify-center h-48"><Loader2 className="w-5 h-5 animate-spin text-gray-300"/></div>
}
