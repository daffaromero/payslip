'use client'

import { useState, useEffect } from 'react'

export function useRole() {
  const [role, setRole] = useState<'admin' | 'viewer' | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user?.role) setRole(d.user.role) })
  }, [])

  return role
}
