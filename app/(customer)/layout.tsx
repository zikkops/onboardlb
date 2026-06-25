'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useCustomerUser } from '../lib/customerAuth'

const LOGIN_PATH = '/customer/login'

// Scoped to the (customer) route group only — entirely separate from the
// admin/CMS auth in app/admin and app/lib/adminAuth.ts.
export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useCustomerUser()

  useEffect(() => {
    if (loading) return
    if (!user && pathname !== LOGIN_PATH) {
      router.replace(LOGIN_PATH)
    }
  }, [loading, user, pathname, router])

  if (loading) return null
  if (!user && pathname !== LOGIN_PATH) return null

  return <>{children}</>
}
