// Coupon API - Firebase Token Authentication
// Admin: full CRUD | Public: single coupon validation via ?code=&total=&items=
import { NextResponse } from 'next/server'
import { verifyApiToken, requireRole, createAuthError, checkRateLimit } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'

// ────────────────────────────────────────────────────
// 🔐 SECURITY CONSTANTS
// ────────────────────────────────────────────────────
const MAX_BODY_SIZE = 20_000
const VALID_DISCOUNT_TYPES = ['percent', 'flat']
const VALID_SCOPES = ['all', 'category', 'subcategory', 'product']

const writeRequestCounts = new Map()
const WRITE_RATE_LIMIT = 30
const WRITE_WINDOW_MS = 15 * 60 * 1000

function getClientIP(req) {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
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

// ────────────────────────────────────────────────────
// Helper: apply coupon calculation to cart
// ────────────────────────────────────────────────────
function calculateDiscount(coupon, cartTotal, items) {
    if (cartTotal < (coupon.minOrderAmount || 0)) {
        return { valid: false, reason: `Minimum order amount is ৳${coupon.minOrderAmount}` }
    }

    let applicableTotal = cartTotal

    // Scope-based filtering — calculate what portion of cart is eligible
    if (coupon.scope === 'product' && Array.isArray(coupon.productIds) && coupon.productIds.length > 0 && Array.isArray(items)) {
        applicableTotal = items
            .filter(i => coupon.productIds.includes(String(i.productId || i._id || i.id)))
            .reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0)
        if (applicableTotal === 0) {
            return { valid: false, reason: 'Coupon is not applicable to the products in your cart' }
        }
    } else if ((coupon.scope === 'category' || coupon.scope === 'subcategory') && Array.isArray(items)) {
        applicableTotal = items
            .filter(i => {
                const catMatch = coupon.categories?.includes(i.category)
                const subMatch = coupon.scope === 'subcategory'
                    ? coupon.subcategories?.includes(i.subcategory)
                    : true
                return catMatch && subMatch
            })
            .reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0)
        if (applicableTotal === 0) {
            return { valid: false, reason: 'Coupon is not applicable to the products in your cart' }
        }
    }

    let discountAmount = 0
    if (coupon.discountType === 'percent') {
        discountAmount = (applicableTotal * coupon.discountValue) / 100
        if (coupon.maxDiscountAmount > 0) {
            discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount)
        }
    } else {
        discountAmount = coupon.discountValue
    }

    discountAmount = Math.min(discountAmount, cartTotal) // never discount more than cart total
    discountAmount = Math.round(discountAmount * 100) / 100

    return { valid: true, discountAmount, applicableTotal }
}

// ────────────────────────────────────────────────────
// GET — list coupons (admin) OR validate a single coupon (public)
// ────────────────────────────────────────────────────
export async function GET(req) {
    try { await checkRateLimit(req) } catch { return createAuthError('Too many requests', 429) }

    const { searchParams } = new URL(req.url)
    const code = sanitizeString(searchParams.get('code') || '', 100)

    // ── Public: validate coupon code ──
    if (code) {
        try {
            const cartTotal = parseFloat(searchParams.get('total') || '0')
            const itemsRaw = searchParams.get('items')
            let items = []
            if (itemsRaw) {
                try { items = JSON.parse(decodeURIComponent(itemsRaw)) } catch { /* ignore */ }
            }

            const client = await clientPromise
            const db = client.db('ECOM2')
            const coupon = await db.collection('coupons').findOne({ code: code.toUpperCase(), isActive: true })

            if (!coupon) return NextResponse.json({ valid: false, reason: 'Invalid or inactive coupon code' }, { status: 404 })

            const now = new Date()
            if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
                return NextResponse.json({ valid: false, reason: 'This coupon has expired' }, { status: 400 })
            }
            if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
                return NextResponse.json({ valid: false, reason: 'This coupon has reached its usage limit' }, { status: 400 })
            }

            const result = calculateDiscount(coupon, cartTotal, items)
            if (!result.valid) return NextResponse.json({ valid: false, reason: result.reason }, { status: 400 })

            return NextResponse.json({
                valid: true,
                coupon: {
                    code: coupon.code,
                    discountType: coupon.discountType,
                    discountValue: coupon.discountValue,
                    scope: coupon.scope,
                    categories: coupon.categories || [],
                    subcategories: coupon.subcategories || [],
                    productIds: coupon.productIds || [],
                    minOrderAmount: coupon.minOrderAmount || 0,
                    maxDiscountAmount: coupon.maxDiscountAmount || 0,
                    discountAmount: result.discountAmount,
                }
            })
        } catch (err) {
            console.error('❌ GET /api/coupon (validate) error:', err)
            return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 })
        }
    }

    // ── Admin: list all coupons ──
    let user = null
    try {
        user = await verifyApiToken(req)
        requireRole(user, ['admin'])
    } catch (authErr) { return createAuthError(authErr.message, 401) }

    try {
        const search = sanitizeString(searchParams.get('search') || '', 100)
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

        const client = await clientPromise
        const db = client.db('ECOM2')

        const query = {}
        if (search) query.code = { $regex: search, $options: 'i' }

        const skip = (page - 1) * limit
        const [coupons, total] = await Promise.all([
            db.collection('coupons').find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).toArray(),
            db.collection('coupons').countDocuments(query),
        ])

        return NextResponse.json({ coupons, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } })
    } catch (err) {
        console.error('❌ GET /api/coupon error:', err)
        return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 })
    }
}

// ────────────────────────────────────────────────────
// POST — create coupon (admin only)
// ────────────────────────────────────────────────────
export async function POST(req) {
    let user = null
    try {
        await checkRateLimit(req)
        checkWriteRateLimit(req)
        user = await verifyApiToken(req)
        requireRole(user, ['admin'])
    } catch (authErr) { return createAuthError(authErr.message, authErr.message.includes('rate') ? 429 : 401) }

    try {
        const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
        if (contentLength > MAX_BODY_SIZE) return NextResponse.json({ error: 'Request body too large' }, { status: 413 })

        const body = await req.json()
        const validation = validateCouponBody(body)
        if (validation.error) return NextResponse.json({ error: validation.error }, { status: 400 })

        const couponData = buildCouponData(body)

        const client = await clientPromise
        const db = client.db('ECOM2')

        // uniqueness check
        const existing = await db.collection('coupons').findOne({ code: couponData.code })
        if (existing) return NextResponse.json({ error: `Coupon code "${couponData.code}" already exists` }, { status: 409 })

        const result = await db.collection('coupons').insertOne({
            ...couponData,
            usedCount: 0,
            createdBy: user.dbUserId || user.userId,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        const created = await db.collection('coupons').findOne({ _id: result.insertedId })

        logAudit('COUPON_CREATED', { userId: user.userId, userEmail: user.email, code: couponData.code }, req)
        return NextResponse.json({ success: true, message: 'Coupon created successfully', coupon: created }, { status: 201 })
    } catch (err) {
        console.error('❌ POST /api/coupon error:', err)
        return NextResponse.json({ error: 'Failed to create coupon', details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' }, { status: 500 })
    }
}

// ────────────────────────────────────────────────────
// PUT — update coupon (admin only)
// ────────────────────────────────────────────────────
export async function PUT(req) {
    let user = null
    try {
        await checkRateLimit(req)
        checkWriteRateLimit(req)
        user = await verifyApiToken(req)
        requireRole(user, ['admin'])
    } catch (authErr) { return createAuthError(authErr.message, authErr.message.includes('rate') ? 429 : 401) }

    try {
        const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
        if (contentLength > MAX_BODY_SIZE) return NextResponse.json({ error: 'Request body too large' }, { status: 413 })

        const body = await req.json()
        const id = sanitizeString(body.id || '', 100)
        if (!id) return NextResponse.json({ error: 'Coupon id is required' }, { status: 400 })

        const validation = validateCouponBody(body)
        if (validation.error) return NextResponse.json({ error: validation.error }, { status: 400 })

        const { ObjectId } = await import('mongodb')
        let oid
        try { oid = new ObjectId(id) } catch { return NextResponse.json({ error: 'Invalid coupon id' }, { status: 400 }) }

        const client = await clientPromise
        const db = client.db('ECOM2')
        const existing = await db.collection('coupons').findOne({ _id: oid })
        if (!existing) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })

        // Check code uniqueness if code changed
        const newCode = body.code ? body.code.toUpperCase().trim() : existing.code
        if (newCode !== existing.code) {
            const conflict = await db.collection('coupons').findOne({ code: newCode, _id: { $ne: oid } })
            if (conflict) return NextResponse.json({ error: `Coupon code "${newCode}" already exists` }, { status: 409 })
        }

        const couponData = buildCouponData(body)
        await db.collection('coupons').updateOne({ _id: oid }, { $set: { ...couponData, updatedAt: new Date() } })
        const updated = await db.collection('coupons').findOne({ _id: oid })

        logAudit('COUPON_UPDATED', { userId: user.userId, userEmail: user.email, couponId: id, code: couponData.code }, req)
        return NextResponse.json({ success: true, message: 'Coupon updated successfully', coupon: updated })
    } catch (err) {
        console.error('❌ PUT /api/coupon error:', err)
        return NextResponse.json({ error: 'Failed to update coupon', details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' }, { status: 500 })
    }
}

// ────────────────────────────────────────────────────
// DELETE — delete coupon (admin only)
// ────────────────────────────────────────────────────
export async function DELETE(req) {
    let user = null
    try {
        await checkRateLimit(req)
        checkWriteRateLimit(req)
        user = await verifyApiToken(req)
        requireRole(user, ['admin'])
    } catch (authErr) { return createAuthError(authErr.message, authErr.message.includes('rate') ? 429 : 401) }

    try {
        const { searchParams } = new URL(req.url)
        const id = sanitizeString(searchParams.get('id') || '', 100)
        if (!id) return NextResponse.json({ error: 'Coupon id is required' }, { status: 400 })

        const { ObjectId } = await import('mongodb')
        let oid
        try { oid = new ObjectId(id) } catch { return NextResponse.json({ error: 'Invalid coupon id' }, { status: 400 }) }

        const client = await clientPromise
        const db = client.db('ECOM2')
        const coupon = await db.collection('coupons').findOne({ _id: oid })
        if (!coupon) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })

        await db.collection('coupons').deleteOne({ _id: oid })
        logAudit('COUPON_DELETED', { userId: user.userId, userEmail: user.email, couponId: id, code: coupon.code }, req)
        return NextResponse.json({ success: true, message: `Coupon "${coupon.code}" deleted successfully` })
    } catch (err) {
        console.error('❌ DELETE /api/coupon error:', err)
        return NextResponse.json({ error: 'Failed to delete coupon', details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' }, { status: 500 })
    }
}

// ────────────────────────────────────────────────────
// Shared helpers
// ────────────────────────────────────────────────────
function validateCouponBody(body) {
    const code = body.code ? body.code.trim() : ''
    if (!code || code.length < 2) return { error: 'Coupon code is required (min 2 chars)' }
    if (!VALID_DISCOUNT_TYPES.includes(body.discountType)) return { error: `discountType must be one of: ${VALID_DISCOUNT_TYPES.join(', ')}` }
    const val = parseFloat(body.discountValue)
    if (isNaN(val) || val <= 0) return { error: 'discountValue must be a positive number' }
    if (body.discountType === 'percent' && val > 100) return { error: 'Percentage discount cannot exceed 100%' }
    if (!VALID_SCOPES.includes(body.scope)) return { error: `scope must be one of: ${VALID_SCOPES.join(', ')}` }
    return { error: null }
}

function buildCouponData(body) {
    const code = body.code.trim().toUpperCase()
    const scope = body.scope || 'all'

    return {
        code,
        discountType: body.discountType,
        discountValue: parseFloat(body.discountValue),
        scope,
        categories: scope === 'category' || scope === 'subcategory'
            ? (Array.isArray(body.categories) ? body.categories.filter(Boolean) : [])
            : [],
        subcategories: scope === 'subcategory'
            ? (Array.isArray(body.subcategories) ? body.subcategories.filter(Boolean) : [])
            : [],
        productIds: scope === 'product'
            ? (Array.isArray(body.productIds) ? body.productIds.filter(Boolean) : [])
            : [],
        minOrderAmount: Math.max(0, parseFloat(body.minOrderAmount) || 0),
        maxDiscountAmount: Math.max(0, parseFloat(body.maxDiscountAmount) || 0),
        usageLimit: Math.max(0, parseInt(body.usageLimit, 10) || 0),
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        isActive: body.isActive !== false,
    }
}
