import { NextResponse } from 'next/server'
import admin from 'firebase-admin'
import clientPromise from './mongodb'
import crypto from 'crypto'

// ============================================================
// 🔥 Firebase Admin SDK — Single initialization
// ============================================================
if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error('🚨 CRITICAL: Missing Firebase Admin credentials in environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)')
    }

    admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        projectId,
    })
}

// ============================================================
// 🛡️ HELPERS
// ============================================================
function isValidEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getClientIP(req) {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') || 'unknown'
}

async function getUserFromDatabase(email) {
    try {
        if (!isValidEmail(email)) return null
        const client = await clientPromise
        const db = client.db('ECOM2')
        return await db.collection('user').findOne({ email: email.toLowerCase() })
    } catch (error) {
        console.error('DB lookup error:', error.message)
        return null
    }
}

async function ensureUserInDatabase(firebaseUser) {
    try {
        if (!firebaseUser?.email || !isValidEmail(firebaseUser.email)) {
            throw new Error('Invalid Firebase user email')
        }

        const client = await clientPromise
        const db = client.db('ECOM2')
        const email = firebaseUser.email.toLowerCase()

        const existing = await db.collection('user').findOne({ email })
        if (existing) return existing

        const newUser = {
            email,
            name: firebaseUser.displayName || email,
            phone: firebaseUser.phoneNumber || '',
            role: 'user',
            profilePicture: firebaseUser.photoURL || '',
            firebaseUid: firebaseUser.uid || '',
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        const result = await db.collection('user').insertOne(newUser)
        return { ...newUser, _id: result.insertedId }
    } catch (error) {
        console.error('ensureUserInDatabase error:', error.message)
        return null
    }
}

// ============================================================
// 🔑 verifyApiToken — Firebase ID Token ONLY
// ============================================================
export async function verifyApiToken(req) {
    const requestId = crypto.randomUUID()

    const authHeader = req.headers.get('authorization')
    let token = null

    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim()
    } else if (req.cookies?.get('auth-token')) {
        token = req.cookies.get('auth-token').value
    }

    if (!token) {
        throw new Error('Authentication required — no token provided')
    }

    // Only accept Firebase ID tokens — no JWT fallback
    let decodedToken
    try {
        decodedToken = await admin.auth().verifyIdToken(token)
    } catch (firebaseError) {
        if (firebaseError.code === 'auth/id-token-expired') {
            throw new Error('Token expired — please refresh your session')
        }
        if (firebaseError.code === 'auth/argument-error' || firebaseError.code === 'auth/invalid-id-token') {
            throw new Error('Invalid token')
        }
        throw new Error('Authentication failed')
    }

    if (!decodedToken.email || !isValidEmail(decodedToken.email)) {
        throw new Error('Authentication failed')
    }

    // Lookup user in MongoDB for role (role must always come from DB, never from token)
    let dbUser = await getUserFromDatabase(decodedToken.email)
    if (!dbUser) {
        dbUser = await ensureUserInDatabase(decodedToken)
    }
    if (!dbUser) {
        throw new Error('User account not found — please sign in again')
    }

    return {
        userId: decodedToken.uid,
        email: decodedToken.email,
        name: dbUser.name || decodedToken.name || decodedToken.email,
        role: dbUser.role || 'user',       // ← ALWAYS from DB, not from token claims
        phone: dbUser.phone || '',
        profilePicture: dbUser.profilePicture || decodedToken.picture || '',
        dbUserId: dbUser._id.toString(),
        provider: 'firebase',
        requestId,
    }
}

// ============================================================
// 🛑 requireRole — Role-Based Access Control
// ============================================================
export function requireRole(user, allowedRoles = ['admin']) {
    if (!user?.role || !allowedRoles.includes(user.role)) {
        throw new Error(`Access denied — required role: ${allowedRoles.join(' or ')}`)
    }
    return true
}

// ============================================================
// 🚫 createAuthError — Standardized error response
// ============================================================
export function createAuthError(message, status = 401) {
    return NextResponse.json(
        { error: message, timestamp: new Date().toISOString() },
        { status, headers: { 'Content-Type': 'application/json' } }
    )
}

// ============================================================
// ⏱️ checkRateLimit — General request rate limiting (in-memory)
// Upgrade to Redis (e.g. Upstash) for multi-instance deployments
// ============================================================
const requestCounts = new Map()
const RATE_LIMIT = 100
const WINDOW_MS = 15 * 60 * 1000

export function checkRateLimit(req) {
    const ip = getClientIP(req)
    const now = Date.now()
    const windowStart = now - WINDOW_MS

    // Evict expired entries
    requestCounts.forEach((data, key) => {
        if (data.timestamp < windowStart) requestCounts.delete(key)
    })

    const current = requestCounts.get(ip) || { count: 0, timestamp: now }
    if (current.timestamp < windowStart) {
        current.count = 1
        current.timestamp = now
    } else {
        current.count++
    }
    requestCounts.set(ip, current)

    if (current.count > RATE_LIMIT) {
        throw new Error('Too many requests — rate limit exceeded')
    }
}

// ============================================================
// 🔧 Utility — Exported for auth/me route
// ============================================================
export async function ensureUserInDatabaseExport(firebaseUser) {
    return ensureUserInDatabase(firebaseUser)
}

// Kept for backward compat — not needed without JWT
export async function updateUserRole(email, role, branch = null) {
    try {
        if (!isValidEmail(email)) throw new Error('Invalid email')
        const client = await clientPromise
        const db = client.db('ECOM2')
        const update = { role, updatedAt: new Date() }
        if (branch !== null) update.branch = branch
        const result = await db.collection('user').updateOne(
            { email: email.toLowerCase() },
            { $set: update }
        )
        return result.matchedCount > 0
    } catch (error) {
        console.error('updateUserRole error:', error.message)
        return false
    }
}
