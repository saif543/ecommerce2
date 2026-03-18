// Slider API - Firebase Token Authentication
// Hero carousel management — image + link only
import { NextResponse } from 'next/server'
import { verifyApiToken, requireRole, createAuthError, checkRateLimit } from '@/lib/auth'
import { uploadImage, deleteImage } from '@/lib/cloudinary'
import clientPromise from '@/lib/mongodb'

// ============================================================
// 🔐 SECURITY CONSTANTS
// ============================================================
const MAX_IMAGE_SIZE_ADMIN = 100 * 1024 * 1024   // 100MB
const MAX_CTA_LINK_LENGTH = 500

// IP-based upload tracking
const uploadTracker = new Map()
const UPLOAD_LIMIT_PER_HOUR = 20
const UPLOAD_WINDOW_MS = 60 * 60 * 1000

// Write rate limiting
const writeRequestCounts = new Map()
const WRITE_RATE_LIMIT = 20
const WRITE_WINDOW_MS = 15 * 60 * 1000

// ============================================================
// 🛡️ SECURITY HELPERS
// ============================================================
function getClientIP(req) {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') || 'unknown'
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

function isValidUrl(url) {
    if (!url) return true // link is optional
    try { new URL(url.startsWith('/') ? `https://example.com${url}` : url); return true }
    catch { return false }
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

// ============================================================
// 📦 GET — Get all active sliders (Public, sorted by order)
// ============================================================
export async function GET(req) {
    try {
        await checkRateLimit(req)

        const { searchParams } = new URL(req.url)
        const includeInactive = searchParams.get('includeInactive') === 'true'

        const client = await clientPromise
        const db = client.db('ECOM2')

        // Only admin can request inactive sliders (token needed)
        let query = { isActive: true }
        if (includeInactive) {
            try {
                const user = await verifyApiToken(req)
                requireRole(user, ['admin'])
                query = {} // Show all
            } catch {
                query = { isActive: true } // Fall back to active only
            }
        }

        const sliders = await db.collection('sliders').find(query).sort({ order: 1 }).toArray()
        return NextResponse.json({ success: true, slides: sliders })

    } catch (err) {
        console.error('❌ GET /api/slider error:', err)
        return NextResponse.json({
            error: 'Failed to fetch sliders',
            details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        }, { status: 500 })
    }
}

// ============================================================
// ➕ POST — Create/Update/Reorder slider data (Admin only, JSON body)
// ============================================================
export async function POST(req) {
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
        const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
        if (contentLength > 50_000) {
            return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
        }

        const body = await req.json()
        const { action, slideData, id, slides: slidesOrder } = body

        const client = await clientPromise
        const db = client.db('ECOM2')

        // ── Reorder ──
        if (action === 'reorder') {
            if (!Array.isArray(slidesOrder)) {
                return NextResponse.json({ error: 'slides array is required for reorder' }, { status: 400 })
            }
            for (const item of slidesOrder) {
                if (!item.id) continue
                await db.collection('sliders').updateOne(
                    { id: item.id },
                    { $set: { order: item.order, updatedAt: new Date() } }
                )
            }
            return NextResponse.json({ success: true, message: 'Slides reordered successfully' })
        }

        // ── Create ──
        if (action === 'create') {
            if (!slideData) {
                return NextResponse.json({ error: 'slideData is required' }, { status: 400 })
            }

            const link = sanitizeString(slideData.link || '', MAX_CTA_LINK_LENGTH)
            if (link && !isValidUrl(link)) {
                return NextResponse.json({ error: 'Invalid link URL' }, { status: 400 })
            }

            const newSlide = {
                id: slideData.id || `slide-${Date.now()}`,
                link: link || '',
                isActive: slideData.isActive !== false,
                image: null,
                order: 0,
                createdBy: user.dbUserId || user.userId,
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            // Set order to be last
            const count = await db.collection('sliders').countDocuments()
            newSlide.order = count

            const result = await db.collection('sliders').insertOne(newSlide)
            const created = await db.collection('sliders').findOne({ _id: result.insertedId })

            logAudit('SLIDER_CREATED', { userId: user.userId, slideId: newSlide.id }, req)
            return NextResponse.json({ success: true, message: 'Slide created successfully', slide: created }, { status: 201 })
        }

        // ── Update (slide data only, image handled by PUT) ──
        if (action === 'update') {
            const slideId = id || slideData?.id
            if (!slideId) {
                return NextResponse.json({ error: 'Slide id is required for update' }, { status: 400 })
            }

            const updateData = { updatedAt: new Date() }
            if (slideData) {
                if (slideData.link !== undefined) {
                    const link = sanitizeString(slideData.link, MAX_CTA_LINK_LENGTH)
                    if (link && !isValidUrl(link)) {
                        return NextResponse.json({ error: 'Invalid link URL' }, { status: 400 })
                    }
                    updateData.link = link || ''
                }
                if (slideData.isActive !== undefined) updateData.isActive = Boolean(slideData.isActive)
            }

            await db.collection('sliders').updateOne({ id: slideId }, { $set: updateData })
            const updated = await db.collection('sliders').findOne({ id: slideId })

            logAudit('SLIDER_UPDATED', { userId: user.userId, slideId }, req)
            return NextResponse.json({ success: true, message: 'Slide updated successfully', slide: updated })
        }

        return NextResponse.json({ error: 'Invalid action. Use: create, update, or reorder' }, { status: 400 })

    } catch (err) {
        console.error('❌ POST /api/slider error:', err)
        return NextResponse.json({
            success: false,
            error: 'Failed to create slider',
            details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        }, { status: 500 })
    }
}

// ============================================================
// ✏️ PUT — Upload/replace slider image (Admin only, FormData)
// ============================================================
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
        const slideId = formData.get('slideId') || formData.get('id')
        const file = formData.get('image')

        if (!slideId) return NextResponse.json({ error: 'slideId is required' }, { status: 400 })
        if (!file) return NextResponse.json({ error: 'image file is required' }, { status: 400 })

        if (file.size > MAX_IMAGE_SIZE_ADMIN) {
            return NextResponse.json({ error: 'Image too large (max 100MB)' }, { status: 400 })
        }

        const client = await clientPromise
        const db = client.db('ECOM2')

        const slider = await db.collection('sliders').findOne({ id: slideId })
        if (!slider) return NextResponse.json({ error: 'Slide not found' }, { status: 404 })

        // Delete old Cloudinary image if exists
        if (slider.imagePublicId) {
            await deleteImage(slider.imagePublicId)
        } else if (slider.image?.publicId) {
            await deleteImage(slider.image.publicId)
        }

        // Upload new image
        const buffer = Buffer.from(await file.arrayBuffer())
        const uploaded = await uploadImage(buffer, {
            folder: 'ecom2/sliders',
            publicId: `slider_${slideId}_${Date.now()}`,
            transformation: [{ width: 1920, height: 800, crop: 'fill' }],
        })

        const imageUrl = uploaded.secure_url || uploaded.url

        await db.collection('sliders').updateOne(
            { id: slideId },
            { $set: { image: imageUrl, imagePublicId: uploaded.publicId, updatedAt: new Date() } }
        )

        const updated = await db.collection('sliders').findOne({ id: slideId })

        logAudit('SLIDER_IMAGE_UPLOADED', { userId: user.userId, slideId }, req)
        return NextResponse.json({ success: true, message: 'Slide image uploaded successfully', slide: updated })

    } catch (err) {
        console.error('❌ PUT /api/slider error:', err)
        return NextResponse.json({
            success: false,
            error: 'Failed to upload slider image',
            details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        }, { status: 500 })
    }
}


// ============================================================
// 🗑️ DELETE — Delete slide or toggle active status (Admin only)
// ============================================================
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
        const slideId = sanitizeString(searchParams.get('id') || '', 100)
        const action = searchParams.get('action')

        if (!slideId) return NextResponse.json({ error: 'Slide id is required' }, { status: 400 })

        const client = await clientPromise
        const db = client.db('ECOM2')

        const slider = await db.collection('sliders').findOne({ id: slideId })
        if (!slider) return NextResponse.json({ error: 'Slide not found' }, { status: 404 })

        // Toggle active status
        if (action === 'toggle') {
            await db.collection('sliders').updateOne(
                { id: slideId },
                { $set: { isActive: !slider.isActive, updatedAt: new Date() } }
            )
            logAudit('SLIDER_TOGGLED', { userId: user.userId, slideId }, req)
            return NextResponse.json({ success: true, message: `Slide ${slider.isActive ? 'deactivated' : 'activated'}` })
        }

        // Delete: remove Cloudinary image first
        if (slider.imagePublicId) await deleteImage(slider.imagePublicId)
        else if (slider.image?.publicId) await deleteImage(slider.image.publicId)

        await db.collection('sliders').deleteOne({ id: slideId })

        logAudit('SLIDER_DELETED', { userId: user.userId, slideId }, req)
        return NextResponse.json({ success: true, message: 'Slide deleted successfully' })

    } catch (err) {
        console.error('❌ DELETE /api/slider error:', err)
        return NextResponse.json({
            success: false,
            error: 'Failed to delete slider',
            details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        }, { status: 500 })
    }
}
