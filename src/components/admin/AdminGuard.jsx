// src/components/admin/AdminGuard.jsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function AdminGuard({ children }) {
    const router = useRouter()
    const { user, loading, userRole } = useAuth()
    const [checking, setChecking] = useState(true)

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (loading) return

            if (!user) {
                router.push('/login?redirect=/admin')
                return
            }

            // Check if user has admin role
            if (userRole !== 'admin') {
                console.error('Access denied: User is not an admin')
                router.push('/')
                return
            }

            setChecking(false)
        }

        checkAdminStatus()
    }, [user, loading, userRole, router])

    if (loading || checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F47B20]"></div>
            </div>
        )
    }

    if (userRole !== 'admin') {
        return null
    }

    return <>{children}</>
}
