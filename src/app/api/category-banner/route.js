// Category Banner API - Firebase Token Authentication
// Manages per-category hero banner images displayed in ProductsView
import { NextResponse } from 'next/server'
import { verifyApiToken, requireRole, createAuthError, checkRateLimit } from '@/lib/auth'
import { uploadImage, deleteImage } from '@/lib/cloudinary'
import clientPromise from '@/lib/mongodb'

// 🔐 SECURITY CONSTANTS
const MAX_IMAGE_SIZE = 100 * 1024 * 1024 // 100 MB

// Upload rate limiting
const uploadTracker = new Map()
const UPLOAD_LIMIT_PER_HOUR = 30
const UPLOAD_WINDOW_MS = 60 * 60 * 1000

// Write rate limiting
const writeRequestCounts = new Map()
const WRITE_RATE_LIMIT = 30
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

// ── GET: Fetch hero banner for a category (Public) ──
// ?category=<category-name>   → returns { banner }
// (no param)                  → returns all banners
export async function GET(req) {
    try {
        await checkRateLimit(req)
        const { searchParams } = new URL(req.url)
        const category = sanitizeString(searchParams.get('category') || '', 200)

        const client = await clientPromise
        const db = client.db('ECOM2')

        if (category) {
            const banner = await db.collection('category_banners').findOne({
                category: { $regex: `^${category}$`, $options: 'i' }
            })
            return NextResponse.json({ success: true, banner: banner || null })
        }

        // Return all banners (admin usage)
        const banners = await db.collection('category_banners').find({}).sort({ category: 1 }).toArray()
        return NextResponse.json({ success: true, banners })

    } catch (err) {
        console.error('❌ GET /api/category-banner error:', err)
        return NextResponse.json({
            error: 'Failed to fetch category banner',
            details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        }, { status: 500 })
    }
}

// ── PUT: Upload/replace a category hero banner (Admin only, FormData) ──
// FormData: { category, image (file) }
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
        const category = sanitizeString(formData.get('category') || '', 200)
        const file = formData.get('image')

        if (!category || category.length < 1) {
            return NextResponse.json({ error: 'category name is required' }, { status: 400 })
        }
        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'image file is required' }, { status: 400 })
        }
        if (file.size > MAX_IMAGE_SIZE) {
            return NextResponse.json({ error: 'Image too large (max 100MB)' }, { status: 400 })
        }

        const client = await clientPromise
        const db = client.db('ECOM2')

        // Verify category exists in the categories collection
        const categoryDoc = await db.collection('categories').findOne({
            name: { $regex: `^${category}$`, $options: 'i' }
        })
        if (!categoryDoc) {
            return NextResponse.json({ error: `Category "${category}" not found in database` }, { status: 404 })
        }

        // Delete old banner image if exists
        const existing = await db.collection('category_banners').findOne({
            category: { $regex: `^${category}$`, $options: 'i' }
        })
        if (existing?.imagePublicId) {
            try { await deleteImage(existing.imagePublicId) } catch (e) { console.error('Cloudinary delete error:', e) }
        }

        // Upload new banner — same dimensions as ProductsView hero banner
        const safeName = category.toLowerCase().replace(/[^a-z0-9]/g, '_')
        const buffer = Buffer.from(await file.arrayBuffer())
        const uploaded = await uploadImage(buffer, {
            folder: 'ecom2/category-banners',
            publicId: `cat_banner_${safeName}_${Date.now()}`,
            transformation: [{ width: 1440, height: 176, crop: 'fill', gravity: 'auto' }],
        })
        const imageUrl = uploaded.secure_url || uploaded.url

        // Upsert the banner document
        await db.collection('category_banners').updateOne(
            { category: categoryDoc.name }, // use exact name from DB for consistency
            {
                $set: {
                    category: categoryDoc.name,
                    image: imageUrl,
                    imagePublicId: uploaded.publicId,
                    updatedAt: new Date(),
                    updatedBy: user.dbUserId || user.userId,
                },
                $setOnInsert: { createdAt: new Date(), createdBy: user.dbUserId || user.userId },
            },
            { upsert: true }
        )

        const updated = await db.collection('category_banners').findOne({ category: categoryDoc.name })

        logAudit('CATEGORY_BANNER_UPLOADED', { userId: user.userId, userEmail: user.email, category }, req)
        return NextResponse.json({ success: true, message: `Hero banner for "${category}" uploaded successfully`, banner: updated })

    } catch (err) {
        console.error('❌ PUT /api/category-banner error:', err)
        return NextResponse.json({
            error: 'Failed to upload category banner',
            details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        }, { status: 500 })
    }
}

// ── DELETE: Remove a category hero banner (Admin only) ──
// ?category=<category-name>
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
        const category = sanitizeString(searchParams.get('category') || '', 200)

        if (!category) return NextResponse.json({ error: 'category is required' }, { status: 400 })

        const client = await clientPromise
        const db = client.db('ECOM2')

        const existing = await db.collection('category_banners').findOne({
            category: { $regex: `^${category}$`, $options: 'i' }
        })
        if (!existing) {
            return NextResponse.json({ error: 'Banner not found for this category' }, { status: 404 })
        }

        // Delete Cloudinary image
        if (existing.imagePublicId) {
            try { await deleteImage(existing.imagePublicId) } catch (e) { console.error('Cloudinary delete error:', e) }
        }

        await db.collection('category_banners').deleteOne({ _id: existing._id })

        logAudit('CATEGORY_BANNER_DELETED', { userId: user.userId, userEmail: user.email, category }, req)
        return NextResponse.json({ success: true, message: `Hero banner for "${category}" removed successfully` })

    } catch (err) {
        console.error('❌ DELETE /api/category-banner error:', err)
        return NextResponse.json({
            error: 'Failed to delete category banner',
            details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        }, { status: 500 })
    }
}
