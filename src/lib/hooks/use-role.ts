'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useRole() {
  const [role, setRole] = useState<'admin' | 'viewer' | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user?.role) setRole(d.user.role) })
  }, [])

  return role
}

export function useAdminGuard() {
  const role = useRole()
  const router = useRouter()

  useEffect(() => {
    if (role === 'viewer') router.replace('/')
  }, [role, router])

  return role
}
