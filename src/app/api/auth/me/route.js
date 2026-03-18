// Auth/Me API - Firebase Token Authentication
// Ensures user exists in DB after Firebase sign-in + returns current user profile
import { NextResponse } from 'next/server'
import { verifyApiToken, ensureUserInDatabaseExport, checkRateLimit, createAuthError } from '@/lib/auth'

const MAX_BODY_SIZE = 5_000

function sanitizeString(value, maxLength = 200) {
    if (typeof value !== 'string') return ''
    return value.trim()
        .replace(/<[^>]*>/g, '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .slice(0, maxLength)
}

function isValidEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// GET — return current authenticated user's profile
export async function GET(req) {
    try {
        await checkRateLimit(req)
    } catch {
        return createAuthError('Too many requests', 429)
    }

    try {
        const authHeader = req.headers.get('authorization')
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'No token provided' }, { status: 401 })
        }

        const user = await verifyApiToken(req)

        return NextResponse.json({
            email: user.email,
            name: user.name,
            role: user.role || 'user',
            phone: user.phone || '',
            profilePicture: user.profilePicture || '',
        })
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
}

// POST — called after Google/Firebase sign-in to ensure user exists in database
export async function POST(req) {
    try {
        await checkRateLimit(req)
    } catch {
        return createAuthError('Too many requests', 429)
    }

    try {
        const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
        if (contentLength > MAX_BODY_SIZE) {
            return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
        }

        const body = await req.json()
        const { uid, email, displayName, photoURL } = body

        if (!email || !isValidEmail(email)) {
            return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
        }

        if (uid && (typeof uid !== 'string' || uid.length > 128)) {
            return NextResponse.json({ error: 'Invalid uid' }, { status: 400 })
        }

        // Sanitize all user-provided fields before writing to database
        const firebaseUser = {
            uid: sanitizeString(String(uid || ''), 128),
            email: email.toLowerCase().trim().slice(0, 320),
            displayName: sanitizeString(String(displayName || ''), 100),
            photoURL: sanitizeString(String(photoURL || ''), 500),
        }

        const dbUser = await ensureUserInDatabaseExport(firebaseUser)

        if (!dbUser) {
            return NextResponse.json({ error: 'Failed to set up user account' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            user: {
                email: dbUser.email,
                name: dbUser.name,
                role: dbUser.role || 'user',
            }
        })
    } catch (error) {
        console.error('❌ POST /api/auth/me error:', error.message)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
