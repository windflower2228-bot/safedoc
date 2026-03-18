'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
export default function NewSupervisorDutyPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/safety-measures/supervisor-duties') }, [])
  return null
}
