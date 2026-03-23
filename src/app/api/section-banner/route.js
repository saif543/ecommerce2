// Section Banner API - Firebase Token Authentication
// Controls homepage product section banner images (e.g., most-loved, new-arrivals)
import { NextResponse } from 'next/server'
import { verifyApiToken, requireRole, createAuthError, checkRateLimit } from '@/lib/auth'
import { uploadImage, deleteImage } from '@/lib/cloudinary'
import clientPromise from '@/lib/mongodb'

// 🔐 SECURITY CONSTANTS
const MAX_IMAGE_SIZE = 100 * 1024 * 1024 // 100 MB
const VALID_SECTIONS = ['most-loved', 'new-arrivals', 'headphones'] // extensible list

// Upload rate limiting
const uploadTracker = new Map()
const UPLOAD_LIMIT_PER_HOUR = 20
const UPLOAD_WINDOW_MS = 60 * 60 * 1000

// Write rate limiting
const writeRequestCounts = new Map()
const WRITE_RATE_LIMIT = 20
const WRITE_WINDOW_MS = 15 * 60 * 1000

// ── Helpers ──
function getClientIP(req) {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}

function checkUploadRateLimit(req) {
    const ip = getClientIP(req)
    const now = Date.now()
    const tracker = uploadTracker.get(ip) || { count: 0, windowStart: now }
    if (tracker.windowStart < now - UPLOAD_WINDOW_MS) { tracker.count = 1; tracker.windowStart = now }
    else tracker.count++
    uploadTracker.set(ip, tracker)
    if (tracker.count > UPLOAD_LIMIT_PER_HOUR) throw new Error('Upload rate limit exceeded')
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
    if (typeof value !== 'string') return null
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
        } catch (err) { console.error('Audit log error:', err) }
    })
}

// ── GET: Fetch one or all section banners (Public) ──
// ?section=most-loved  → returns { banner }
// (no param)           → returns { banners: [...] }
export async function GET(req) {
    try {
        await checkRateLimit(req)
        const { searchParams } = new URL(req.url)
        const section = sanitizeString(searchParams.get('section') || '', 100)

        const client = await clientPromise
        const db = client.db('ECOM2')

        if (section) {
            if (!VALID_SECTIONS.includes(section)) {
                return NextResponse.json({ error: `Invalid section. Valid: ${VALID_SECTIONS.join(', ')}` }, { status: 400 })
            }
            const banner = await db.collection('section_banners').findOne({ section })
            return NextResponse.json({ success: true, banner: banner || null })
        }

        const banners = await db.collection('section_banners').find({}).toArray()
        return NextResponse.json({ success: true, banners })

    } catch (err) {
        console.error('❌ GET /api/section-banner error:', err)
        return NextResponse.json({
            error: 'Failed to fetch section banner',
            details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        }, { status: 500 })
    }
}

// ── PUT: Upload/replace a section banner image (Admin only, FormData) ──
// FormData: { section, image (file) }
export async function PUT(req) {
    let user = null
    try {
        await checkRateLimit(req)
        checkWriteRateLimit(req)
        checkUploadRateLimit(req)
        user = await verifyApiToken(req)
        requireRole(user, ['admin'])
    } catch (authErr) {
        return createAuthError(authErr.message, authErr.message.includes('rate') ? 429 : 401)
    }

    try {
        const formData = await req.formData()
        const section = sanitizeString(formData.get('section') || '', 100)
        const file = formData.get('image')

        if (!section) return NextResponse.json({ error: 'section is required' }, { status: 400 })
        if (!VALID_SECTIONS.includes(section)) {
            return NextResponse.json({ error: `Invalid section. Valid sections: ${VALID_SECTIONS.join(', ')}` }, { status: 400 })
        }
        if (!file || typeof file === 'string') return NextResponse.json({ error: 'image file is required' }, { status: 400 })
        if (file.size > MAX_IMAGE_SIZE) return NextResponse.json({ error: 'Image too large (max 100MB)' }, { status: 400 })

        const client = await clientPromise
        const db = client.db('ECOM2')

        // Delete old image if exists
        const existing = await db.collection('section_banners').findOne({ section })
        if (existing?.imagePublicId) {
            try { await deleteImage(existing.imagePublicId) } catch (e) { console.error('Cloudinary delete error:', e) }
        }

        // Upload new image — wide banner format matching the gradient height
        const buffer = Buffer.from(await file.arrayBuffer())
        const uploaded = await uploadImage(buffer, {
            folder: 'ecom2/section-banners',
            publicId: `section_banner_${section}_${Date.now()}`,
            transformation: [{ width: 1440, height: 160, crop: 'fill', gravity: 'auto' }],
        })
        const imageUrl = uploaded.secure_url || uploaded.url

        // Upsert the banner document
        await db.collection('section_banners').updateOne(
            { section },
            {
                $set: {
                    section,
                    image: imageUrl,
                    imagePublicId: uploaded.publicId,
                    updatedAt: new Date(),
                    updatedBy: user.dbUserId || user.userId,
                },
                $setOnInsert: { createdAt: new Date(), createdBy: user.dbUserId || user.userId },
            },
            { upsert: true }
        )

        const updated = await db.collection('section_banners').findOne({ section })

        logAudit('SECTION_BANNER_UPLOADED', { userId: user.userId, userEmail: user.email, section }, req)
        return NextResponse.json({ success: true, message: `Banner for "${section}" uploaded successfully`, banner: updated })

    } catch (err) {
        console.error('❌ PUT /api/section-banner error:', err)
        return NextResponse.json({
            error: 'Failed to upload section banner',
            details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        }, { status: 500 })
    }
}

// ── DELETE: Remove a section banner image (Admin only) ──
// ?section=most-loved
export async function DELETE(req) {
    let user = null
    try {
        await checkRateLimit(req)
        checkWriteRateLimit(req)
        user = await verifyApiToken(req)
        requireRole(user, ['admin'])
    } catch (authErr) {
        return createAuthError(authErr.message, authErr.message.includes('rate') ? 429 : 401)
    }

    try {
        const { searchParams } = new URL(req.url)
        const section = sanitizeString(searchParams.get('section') || '', 100)

        if (!section) return NextResponse.json({ error: 'section is required' }, { status: 400 })
        if (!VALID_SECTIONS.includes(section)) {
            return NextResponse.json({ error: `Invalid section. Valid sections: ${VALID_SECTIONS.join(', ')}` }, { status: 400 })
        }

        const client = await clientPromise
        const db = client.db('ECOM2')

        const existing = await db.collection('section_banners').findOne({ section })
        if (!existing) return NextResponse.json({ error: 'Banner not found for this section' }, { status: 404 })

        // Delete image from Cloudinary
        if (existing.imagePublicId) {
            try { await deleteImage(existing.imagePublicId) } catch (e) { console.error('Cloudinary delete error:', e) }
        }

        await db.collection('section_banners').deleteOne({ section })

        logAudit('SECTION_BANNER_DELETED', { userId: user.userId, userEmail: user.email, section }, req)
        return NextResponse.json({ success: true, message: `Banner for "${section}" deleted successfully` })

    } catch (err) {
        console.error('❌ DELETE /api/section-banner error:', err)
        return NextResponse.json({
            error: 'Failed to delete section banner',
            details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        }, { status: 500 })
    }
}
