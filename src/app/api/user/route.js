// User API - Firebase Token Authentication (Firebase-only, no JWT fallback)
import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { verifyApiToken, requireRole, createAuthError, checkRateLimit } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'

// ── Validate Cloudinary env vars at startup ──
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Missing required Cloudinary environment variables')
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

// ── Security constants ──
const MAX_BODY_SIZE = 20_000
const WRITE_RATE_LIMIT = 30
const WRITE_WINDOW_MS = 15 * 60 * 1000
const writeRequestCounts = new Map()

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_ROLES = ['admin', 'user', 'shop_owner']

function isValidEmail(email) {
    return typeof email === 'string' && EMAIL_REGEX.test(email)
}

function getClientIP(req) {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') || 'unknown'
}

function checkWriteRateLimit(req) {
    const ip = getClientIP(req)
    const now = Date.now()
    const current = writeRequestCounts.get(ip) || { count: 0, timestamp: now }
    if (current.timestamp < now - WRITE_WINDOW_MS) { current.count = 1; current.timestamp = now }
    else current.count++
    writeRequestCounts.set(ip, current)
    if (current.count > WRITE_RATE_LIMIT) throw new Error('Too many write requests')
}

function sanitizeString(value, maxLength = 200) {
    if (typeof value !== 'string') return ''
    return value.trim()
        .replace(/<[^>]*>/g, '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .slice(0, maxLength)
}

async function logAudit(action, data, req) {
    setImmediate(async () => {
        try {
            const client = await clientPromise
            await client.db('ECOM2').collection('audit_logs').insertOne({
                action, ...data, timestamp: new Date(), ipAddress: getClientIP(req),
            })
        } catch (err) { console.error('Audit log error:', err.message) }
    })
}

// ── Strip sensitive fields before returning to client ──
function sanitizeUserResponse(user) {
    if (!user) return null
    const { firebaseUid, ...safeUser } = user
    return safeUser
}

// ============================================================
// 📦 GET — Own profile / check email / list all (admin)
// 🔒 Requires Firebase Bearer token
// ============================================================
export async function GET(req) {
    let user = null
    try {
        await checkRateLimit(req)
        user = await verifyApiToken(req)
    } catch (authError) {
        return createAuthError(authError.message, authError.message.includes('rate') ? 429 : 401)
    }

    try {
        const { searchParams } = new URL(req.url)
        const email = searchParams.get('email')
        const getAllUsers = searchParams.get('getAllUsers')
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

        const client = await clientPromise
        const db = client.db('ECOM2')

        // ── Check specific email ──
        if (email) {
            if (!isValidEmail(email)) {
                return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
            }
            // Users can only check their own email unless admin
            if (user.email !== email.toLowerCase() && user.role !== 'admin') {
                return createAuthError('Access denied', 403)
            }
            const foundUser = await db.collection('user').findOne({ email: email.toLowerCase() })
            logAudit('USER_EMAIL_CHECK', { userId: user.userId, checkedEmail: email, found: !!foundUser }, req)
            return NextResponse.json({ exists: !!foundUser, user: sanitizeUserResponse(foundUser) })
        }

        // ── Admin: list all users (paginated) ──
        if (getAllUsers === 'true') {
            try { requireRole(user, ['admin']) } catch {
                return createAuthError('Admin access required', 403)
            }
            const skip = (page - 1) * limit
            const [users, total] = await Promise.all([
                db.collection('user').find({}).skip(skip).limit(limit).sort({ createdAt: -1 }).toArray(),
                db.collection('user').countDocuments(),
            ])
            logAudit('ALL_USERS_ACCESSED', { userId: user.userId, page, limit, total }, req)
            return NextResponse.json({
                users: users.map(sanitizeUserResponse),
                pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
            })
        }

        // ── Default: current user's own profile ──
        const currentUser = await db.collection('user').findOne({ email: user.email.toLowerCase() })
        if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })
        return NextResponse.json({ user: sanitizeUserResponse(currentUser) })

    } catch (err) {
        console.error('❌ GET /api/user error:', err.message)
        return NextResponse.json({
            error: 'Failed to fetch user data',
            details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        }, { status: 500 })
    }
}

// ============================================================
// ✏️ POST — Create user (self-reg) or update profile/role
// 🔒 Update/role-change requires Firebase Bearer token
//    Self-registration is open but write-rate-limited
// ============================================================
export async function POST(req) {
    try {
        await checkRateLimit(req)
        checkWriteRateLimit(req)
    } catch (rl) {
        return createAuthError(rl.message, 429)
    }

    try {
        const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
        if (contentLength > MAX_BODY_SIZE) {
            return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
        }

        const body = await req.json()
        const { action } = body

        if (!body.email || !isValidEmail(body.email)) {
            return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
        }

        const client = await clientPromise
        const db = client.db('ECOM2')

        // ── Action: update profile or role ──
        if (action === 'update') {
            let authUser
            try { authUser = await verifyApiToken(req) } catch (e) {
                return createAuthError(e.message, 401)
            }

            const { email, name, phone, role } = body
            if (authUser.email !== email.toLowerCase() && authUser.role !== 'admin') {
                return createAuthError('Access denied: Cannot update other users', 403)
            }

            const existingUser = await db.collection('user').findOne({ email: email.toLowerCase() })
            if (!existingUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

            const updateData = {}
            if (name !== undefined) {
                const cleanName = sanitizeString(name, 100)
                if (!cleanName) return NextResponse.json({ error: 'Valid name is required' }, { status: 400 })
                updateData.name = cleanName
            }
            if (phone !== undefined) updateData.phone = sanitizeString(String(phone), 20)

            if (role !== undefined) {
                try { requireRole(authUser, ['admin']) } catch {
                    return createAuthError('Only admins can update roles', 403)
                }
                if (!VALID_ROLES.includes(role)) {
                    return NextResponse.json({ error: `Invalid role. Valid: ${VALID_ROLES.join(', ')}` }, { status: 400 })
                }
                updateData.role = role
            }

            if (Object.keys(updateData).length === 0) {
                return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
            }

            await db.collection('user').updateOne(
                { _id: existingUser._id },
                { $set: { ...updateData, updatedAt: new Date() } }
            )
            const updatedUser = await db.collection('user').findOne({ _id: existingUser._id })
            logAudit('USER_PROFILE_UPDATED', { userId: authUser.userId, targetEmail: email, updatedFields: Object.keys(updateData) }, req)
            return NextResponse.json({ success: true, message: 'Profile updated successfully', user: sanitizeUserResponse(updatedUser) })
        }

        // ── Action: self-registration or admin creation ──
        let authUser = null
        let isAdminCreation = false
        try {
            authUser = await verifyApiToken(req)
            isAdminCreation = authUser.email.toLowerCase() !== body.email.toLowerCase()
        } catch { /* unauthenticated self-registration is allowed */ }

        if (isAdminCreation) {
            try { requireRole(authUser, ['admin']) } catch {
                return createAuthError('Only admins can create accounts for other users', 403)
            }
        }

        // Check if user already exists
        const existingUser = await db.collection('user').findOne({ email: body.email.toLowerCase() })
        if (existingUser) {
            return NextResponse.json({ message: 'User already exists', user: sanitizeUserResponse(existingUser) })
        }

        const cleanName = sanitizeString(body.name || '', 100)
        if (!cleanName) return NextResponse.json({ error: 'Valid name is required' }, { status: 400 })

        const newUserData = {
            email: body.email.toLowerCase().trim(),
            name: cleanName,
            phone: sanitizeString(body.phone || '', 20),
            role: isAdminCreation && VALID_ROLES.includes(body.role) ? body.role : 'user',
            profilePicture: sanitizeString(body.profilePicture || '', 500),
            firebaseUid: sanitizeString(body.firebaseUid || '', 128),
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        const result = await db.collection('user').insertOne(newUserData)
        const createdUser = await db.collection('user').findOne({ _id: result.insertedId })
        logAudit(authUser ? 'USER_CREATED_BY_ADMIN' : 'USER_SELF_REGISTERED', {
            userId: authUser?.userId, targetEmail: body.email, role: newUserData.role,
        }, req)
        return NextResponse.json({ success: true, message: 'User created', user: sanitizeUserResponse(createdUser) }, { status: 201 })

    } catch (err) {
        console.error('❌ POST /api/user error:', err.message)
        return NextResponse.json({
            error: 'Failed to process request',
            details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        }, { status: 500 })
    }
}

// ============================================================
// 🖼️ PUT — Update profile picture (upload to Cloudinary)
// 🔒 Requires Firebase Bearer token
// ============================================================
export async function PUT(req) {
    let user = null
    try {
        await checkRateLimit(req)
        checkWriteRateLimit(req)
        user = await verifyApiToken(req)
    } catch (authError) {
        return createAuthError(authError.message, authError.message.includes('rate') ? 429 : 401)
    }

    try {
        const formData = await req.formData()
        const email = formData.get('email')
        const file = formData.get('file')

        if (!email || !isValidEmail(email)) {
            return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
        }
        if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 })

        // Ownership check
        if (user.email !== email.toLowerCase() && user.role !== 'admin') {
            return createAuthError('Access denied', 403)
        }

        // File validation — all image types accepted, 5MB max for regular users, 10MB for admins
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
        }
        const maxSize = user.role === 'admin' ? 10 * 1024 * 1024 : 5 * 1024 * 1024
        if (file.size > maxSize) {
            return NextResponse.json({ error: `File too large (max ${user.role === 'admin' ? '10MB' : '5MB'})` }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Upload to Cloudinary
        const uploadResponse = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    resource_type: 'image',
                    folder: 'ecom2/profile_pictures',
                    public_id: `user_${email.replace('@', '_').replace(/\./g, '_')}_${Date.now()}`,
                    transformation: [
                        { width: 400, height: 400, crop: 'fill' },
                        { quality: 'auto' },
                        { format: 'auto' },
                    ],
                },
                (error, result) => error ? reject(error) : resolve(result)
            ).end(buffer)
        })

        const client = await clientPromise
        const db = client.db('ECOM2')
        const existingUser = await db.collection('user').findOne({ email: email.toLowerCase() })

        if (!existingUser) {
            // Clean up uploaded image since we can't store it
            await cloudinary.uploader.destroy(uploadResponse.public_id).catch(() => { })
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Delete old profile picture
        if (existingUser.profilePicturePublicId) {
            await cloudinary.uploader.destroy(existingUser.profilePicturePublicId).catch(() => { })
        }

        await db.collection('user').updateOne(
            { _id: existingUser._id },
            { $set: { profilePicture: uploadResponse.secure_url, profilePicturePublicId: uploadResponse.public_id, updatedAt: new Date() } }
        )

        const updatedUser = await db.collection('user').findOne({ _id: existingUser._id })
        logAudit('PROFILE_PICTURE_UPDATED', { userId: user.userId, targetEmail: email, cloudinaryId: uploadResponse.public_id }, req)
        return NextResponse.json({
            success: true,
            message: 'Profile picture updated successfully',
            imageUrl: uploadResponse.secure_url,
            user: sanitizeUserResponse(updatedUser),
        })

    } catch (err) {
        console.error('❌ PUT /api/user error:', err.message)
        return NextResponse.json({
            error: 'Failed to update profile picture',
            details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        }, { status: 500 })
    }
}

// ============================================================
// 🗑️ DELETE — Remove profile picture
// 🔒 Requires Firebase Bearer token
// ============================================================
export async function DELETE(req) {
    let user = null
    try {
        await checkRateLimit(req)
        checkWriteRateLimit(req)
        user = await verifyApiToken(req)
    } catch (authError) {
        return createAuthError(authError.message, authError.message.includes('rate') ? 429 : 401)
    }

    try {
        const { searchParams } = new URL(req.url)
        const email = searchParams.get('email')

        if (!email || !isValidEmail(email)) {
            return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
        }
        if (user.email !== email.toLowerCase() && user.role !== 'admin') {
            return createAuthError('Access denied', 403)
        }

        const client = await clientPromise
        const db = client.db('ECOM2')
        const foundUser = await db.collection('user').findOne({ email: email.toLowerCase() })
        if (!foundUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        if (!foundUser.profilePicturePublicId) {
            return NextResponse.json({ success: true, message: 'No profile picture to delete' })
        }

        await cloudinary.uploader.destroy(foundUser.profilePicturePublicId).catch(() => { })
        await db.collection('user').updateOne(
            { _id: foundUser._id },
            { $unset: { profilePicture: '', profilePicturePublicId: '' }, $set: { updatedAt: new Date() } }
        )

        logAudit('PROFILE_PICTURE_DELETED', { userId: user.userId, targetEmail: email }, req)
        return NextResponse.json({ success: true, message: 'Profile picture deleted successfully' })

    } catch (err) {
        console.error('❌ DELETE /api/user error:', err.message)
        return NextResponse.json({
            error: 'Failed to delete profile picture',
            details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
        }, { status: 500 })
    }
}
