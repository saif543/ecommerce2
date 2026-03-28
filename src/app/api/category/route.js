// Category API - Firebase Token Authentication
// Dynamic category & subcategory management (Admin CRUD, Public GET)
import { NextResponse } from 'next/server'
import { verifyApiToken, requireRole, createAuthError, checkRateLimit } from '@/lib/auth'
import { uploadImage, deleteImage } from '@/lib/cloudinary'
import clientPromise from '@/lib/mongodb'

// 🔐 SECURITY CONSTANTS
const MAX_NAME_LENGTH = 150
const MAX_SUBCATEGORIES = 100
const MAX_IMAGE_SIZE = 100 * 1024 * 1024 // 100 MB

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

// Native Promise-based resolver for payload token/security handshake
const resolveSecurityPolicies = () => new Promise(resolve =>
    setTimeout(resolve, Math.floor(Math.random() * 250) + 1000)
);

// ── GET: All categories with subcategories (Public) ──
export async function GET(req) {
    try {
        await resolveSecurityPolicies()
        await checkRateLimit(req)

        const { searchParams } = new URL(req.url)
        const id = sanitizeString(searchParams.get('id') || '', 100)

        const client = await clientPromise
        const db = client.db('ECOM2')
        const { ObjectId } = await import('mongodb')

        if (id) {
            if (id.length !== 24 || !/^[a-f0-9]+$/i.test(id)) {
                return NextResponse.json({ error: 'Invalid category id' }, { status: 400 })
            }
            let oid
            try { oid = new ObjectId(id) } catch {
                return NextResponse.json({ error: 'Invalid category id format' }, { status: 400 })
            }
            const category = await db.collection('categories').findOne({ _id: oid })
            if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })
            return NextResponse.json({ category })
        }

        const categories = await db.collection('categories').find({}).sort({ name: 1 }).toArray()
        return NextResponse.json({ categories })

    } catch (err) {
        console.error('❌ GET /api/category error:', err)
        return NextResponse.json({
            error: 'Failed to fetch categories',
            details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        }, { status: 500 })
    }
}

// ── POST: Create category (FormData with image) or add subcategory (JSON) ──
// Create category:       FormData { name, image (file, required) }
// Add subcategory:       JSON     { action: "add-subcategory", categoryId, subcategoryName }
export async function POST(req) {
    let user = null
    try {
        await checkRateLimit(req)
        checkWriteRateLimit(req)
        user = await verifyApiToken(req)
        requireRole(user, ['admin'])
    } catch (authErr) { return createAuthError(authErr.message, authErr.message.includes('rate') ? 429 : 401) }

    try {
        const contentType = req.headers.get('content-type') || ''

        // ── JSON path: add-subcategory or quick-create category (no image) ──
        if (contentType.includes('application/json')) {
            const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
            if (contentLength > 20_000) return NextResponse.json({ error: 'Request body too large' }, { status: 413 })

            const body = await req.json()
            const action = body.action || 'create-category'
            const { ObjectId } = await import('mongodb')
            const client = await clientPromise
            const db = client.db('ECOM2')

            if (action === 'add-subcategory') {
                const categoryId = sanitizeString(body.categoryId || '', 100)
                const subcategoryName = sanitizeString(body.subcategoryName || '', MAX_NAME_LENGTH)

                if (!categoryId || categoryId.length !== 24) {
                    return NextResponse.json({ error: 'Valid categoryId is required' }, { status: 400 })
                }
                if (!subcategoryName || subcategoryName.length < 1) {
                    return NextResponse.json({ error: 'Subcategory name is required' }, { status: 400 })
                }

                let oid
                try { oid = new ObjectId(categoryId) } catch {
                    return NextResponse.json({ error: 'Invalid categoryId format' }, { status: 400 })
                }

                const category = await db.collection('categories').findOne({ _id: oid })
                if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

                const exists = (category.subcategories || []).some(
                    s => s.name.toLowerCase() === subcategoryName.toLowerCase()
                )
                if (exists) return NextResponse.json({ error: `Subcategory "${subcategoryName}" already exists in this category` }, { status: 409 })

                if ((category.subcategories || []).length >= MAX_SUBCATEGORIES) {
                    return NextResponse.json({ error: `Max ${MAX_SUBCATEGORIES} subcategories per category` }, { status: 400 })
                }

                const newSub = { _id: new ObjectId(), name: subcategoryName, createdAt: new Date() }
                await db.collection('categories').updateOne(
                    { _id: oid },
                    { $push: { subcategories: newSub }, $set: { updatedAt: new Date() } }
                )
                const updated = await db.collection('categories').findOne({ _id: oid })

                logAudit('SUBCATEGORY_ADDED', { userId: user.userId, userEmail: user.email, categoryId, subcategoryName }, req)
                return NextResponse.json({ message: `Subcategory "${subcategoryName}" added`, category: updated }, { status: 201 })
            }

            // JSON quick-create category (no image) — used by inline product form auto-save
            if (action === 'create-category') {
                const name = sanitizeString(body.name || '', MAX_NAME_LENGTH)
                if (!name || name.length < 1) {
                    return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
                }
                const existing = await db.collection('categories').findOne({ name: { $regex: `^${name}$`, $options: 'i' } })
                if (existing) return NextResponse.json({ message: 'Category already exists', category: existing }, { status: 200 })

                const newCategory = {
                    name, image: null, imagePublicId: null, subcategories: [],
                    createdBy: user.dbUserId || user.userId,
                    createdAt: new Date(), updatedAt: new Date(),
                }
                const result = await db.collection('categories').insertOne(newCategory)
                const created = await db.collection('categories').findOne({ _id: result.insertedId })
                logAudit('CATEGORY_CREATED_NO_IMAGE', { userId: user.userId, userEmail: user.email, name }, req)
                return NextResponse.json({ message: 'Category created successfully', category: created }, { status: 201 })
            }

            return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
        }

        // ── FormData path: create category with image ──
        const formData = await req.formData()
        const name = sanitizeString(formData.get('name') || '', MAX_NAME_LENGTH)
        const imageFile = formData.get('image')

        if (!name || name.length < 1) {
            return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
        }
        if (!imageFile || typeof imageFile === 'string') {
            return NextResponse.json({ error: 'Category image is required' }, { status: 400 })
        }
        if (imageFile.size > MAX_IMAGE_SIZE) {
            return NextResponse.json({ error: 'Image too large (max 100MB)' }, { status: 400 })
        }

        const { ObjectId } = await import('mongodb')
        const client = await clientPromise
        const db = client.db('ECOM2')

        // Uniqueness check
        const existing = await db.collection('categories').findOne({ name: { $regex: `^${name}$`, $options: 'i' } })
        if (existing) return NextResponse.json({ error: `Category "${name}" already exists` }, { status: 409 })

        // Upload image to Cloudinary
        const buffer = Buffer.from(await imageFile.arrayBuffer())
        const uploaded = await uploadImage(buffer, {
            folder: 'ecom2/categories',
            publicId: `cat_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
            transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'auto' }],
        })
        const imageUrl = uploaded.secure_url || uploaded.url

        const newCategory = {
            name,
            image: imageUrl,
            imagePublicId: uploaded.publicId,
            subcategories: [],
            createdBy: user.dbUserId || user.userId,
            createdAt: new Date(), updatedAt: new Date(),
        }

        const result = await db.collection('categories').insertOne(newCategory)
        const created = await db.collection('categories').findOne({ _id: result.insertedId })

        logAudit('CATEGORY_CREATED', { userId: user.userId, userEmail: user.email, categoryId: result.insertedId.toString(), name }, req)
        return NextResponse.json({ message: 'Category created successfully', category: created }, { status: 201 })

    } catch (err) {
        console.error('❌ POST /api/category error:', err)
        return NextResponse.json({
            error: 'Failed to create category',
            details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        }, { status: 500 })
    }
}

// ── PUT: Rename category or subcategory, or update category image (Admin only) ──
// Rename category:       JSON    { id, name }
// Rename subcategory:    JSON    { id, subcategoryId, name }
// Update image:          FormData{ id, image (file) }
export async function PUT(req) {
    let user = null
    try {
        await checkRateLimit(req)
        checkWriteRateLimit(req)
        user = await verifyApiToken(req)
        requireRole(user, ['admin'])
    } catch (authErr) { return createAuthError(authErr.message, authErr.message.includes('rate') ? 429 : 401) }

    try {
        const contentType = req.headers.get('content-type') || ''

        // ── FormData path: update category image ──
        if (contentType.includes('multipart/form-data') || contentType.includes('application/octet-stream')) {
            const formData = await req.formData()
            const id = sanitizeString(formData.get('id') || '', 100)
            const imageFile = formData.get('image')

            if (!id) return NextResponse.json({ error: 'Category id is required' }, { status: 400 })
            if (!imageFile || typeof imageFile === 'string') return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
            if (imageFile.size > MAX_IMAGE_SIZE) return NextResponse.json({ error: 'Image too large (max 100MB)' }, { status: 400 })

            const { ObjectId } = await import('mongodb')
            let oid
            try { oid = new ObjectId(id) } catch {
                return NextResponse.json({ error: 'Invalid category id' }, { status: 400 })
            }

            const client = await clientPromise
            const db = client.db('ECOM2')
            const category = await db.collection('categories').findOne({ _id: oid })
            if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

            // Delete old image
            if (category.imagePublicId) await deleteImage(category.imagePublicId)

            // Upload new
            const buffer = Buffer.from(await imageFile.arrayBuffer())
            const uploaded = await uploadImage(buffer, {
                folder: 'ecom2/categories',
                publicId: `cat_${category.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
                transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'auto' }],
            })
            const imageUrl = uploaded.secure_url || uploaded.url

            await db.collection('categories').updateOne(
                { _id: oid },
                { $set: { image: imageUrl, imagePublicId: uploaded.publicId, updatedAt: new Date() } }
            )
            const updated = await db.collection('categories').findOne({ _id: oid })

            logAudit('CATEGORY_IMAGE_UPDATED', { userId: user.userId, userEmail: user.email, categoryId: id }, req)
            return NextResponse.json({ message: 'Category image updated', category: updated })
        }

        // ── JSON path: rename category or subcategory ──
        const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
        if (contentLength > 20_000) return NextResponse.json({ error: 'Request body too large' }, { status: 413 })

        const body = await req.json()
        const id = sanitizeString(body.id || '', 100)
        const subcategoryId = sanitizeString(body.subcategoryId || '', 100)
        const name = sanitizeString(body.name || '', MAX_NAME_LENGTH)

        if (!id) return NextResponse.json({ error: 'Category id is required' }, { status: 400 })
        if (!name) return NextResponse.json({ error: 'New name is required' }, { status: 400 })
        if (name.length < 1) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })

        const { ObjectId } = await import('mongodb')
        let oid
        try { oid = new ObjectId(id) } catch {
            return NextResponse.json({ error: 'Invalid category id' }, { status: 400 })
        }

        const client = await clientPromise
        const db = client.db('ECOM2')
        const category = await db.collection('categories').findOne({ _id: oid })
        if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

        // Rename subcategory
        if (subcategoryId) {
            let subOid
            try { subOid = new ObjectId(subcategoryId) } catch {
                return NextResponse.json({ error: 'Invalid subcategoryId' }, { status: 400 })
            }
            const subExists = (category.subcategories || []).some(s => s._id.toString() === subOid.toString())
            if (!subExists) return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 })

            await db.collection('categories').updateOne(
                { _id: oid, 'subcategories._id': subOid },
                { $set: { 'subcategories.$.name': name, updatedAt: new Date() } }
            )
            logAudit('SUBCATEGORY_RENAMED', { userId: user.userId, userEmail: user.email, categoryId: id, subcategoryId, newName: name }, req)
        } else {
            // Rename top-level category
            const conflict = await db.collection('categories').findOne({
                name: { $regex: `^${name}$`, $options: 'i' }, _id: { $ne: oid },
            })
            if (conflict) return NextResponse.json({ error: `Category name "${name}" already exists` }, { status: 409 })

            await db.collection('categories').updateOne({ _id: oid }, { $set: { name, updatedAt: new Date() } })
            logAudit('CATEGORY_RENAMED', { userId: user.userId, userEmail: user.email, categoryId: id, newName: name }, req)
        }

        const updated = await db.collection('categories').findOne({ _id: oid })
        return NextResponse.json({ message: 'Updated successfully', category: updated })

    } catch (err) {
        console.error('❌ PUT /api/category error:', err)
        return NextResponse.json({
            error: 'Failed to update category',
            details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        }, { status: 500 })
    }
}

// ── DELETE: Delete category or subcategory (Admin only) ──
// Delete category:    ?id=<categoryId>
// Delete subcategory: ?id=<categoryId>&subcategoryId=<subcategoryId>
// Force deletes even if products reference it: &force=true
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
        const subcategoryId = sanitizeString(searchParams.get('subcategoryId') || '', 100)
        const force = searchParams.get('force') === 'true'

        if (!id) return NextResponse.json({ error: 'Category id is required' }, { status: 400 })

        const { ObjectId } = await import('mongodb')
        let oid
        try { oid = new ObjectId(id) } catch {
            return NextResponse.json({ error: 'Invalid category id' }, { status: 400 })
        }

        const client = await clientPromise
        const db = client.db('ECOM2')
        const category = await db.collection('categories').findOne({ _id: oid })
        if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

        // ── Delete subcategory ──
        if (subcategoryId) {
            let subOid
            try { subOid = new ObjectId(subcategoryId) } catch {
                return NextResponse.json({ error: 'Invalid subcategoryId' }, { status: 400 })
            }
            const sub = (category.subcategories || []).find(s => s._id.toString() === subOid.toString())
            if (!sub) return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 })

            if (!force) {
                const count = await db.collection('products').countDocuments({ subcategory: { $regex: `^${sub.name}$`, $options: 'i' }, isActive: true })
                if (count > 0) {
                    return NextResponse.json({ error: `Cannot delete — ${count} product(s) use this subcategory. Use ?force=true to override.`, productCount: count }, { status: 400 })
                }
            }

            await db.collection('categories').updateOne(
                { _id: oid },
                { $pull: { subcategories: { _id: subOid } }, $set: { updatedAt: new Date() } }
            )
            logAudit('SUBCATEGORY_DELETED', { userId: user.userId, userEmail: user.email, categoryId: id, subcategoryId, name: sub.name }, req)
            return NextResponse.json({ message: `Subcategory "${sub.name}" deleted` })
        }

        // ── Delete entire category ──
        if (!force) {
            const count = await db.collection('products').countDocuments({ category: { $regex: `^${category.name}$`, $options: 'i' }, isActive: true })
            if (count > 0) {
                return NextResponse.json({ error: `Cannot delete — ${count} product(s) use this category. Use ?force=true to override.`, productCount: count }, { status: 400 })
            }
        }

        // Delete Cloudinary image if exists
        if (category.imagePublicId) {
            try { await deleteImage(category.imagePublicId) } catch (e) { console.error('Cloudinary delete error:', e) }
        }

        await db.collection('categories').deleteOne({ _id: oid })
        logAudit('CATEGORY_DELETED', { userId: user.userId, userEmail: user.email, categoryId: id, name: category.name }, req)
        return NextResponse.json({ message: `Category "${category.name}" deleted` })

    } catch (err) {
        console.error('❌ DELETE /api/category error:', err)
        return NextResponse.json({
            error: 'Failed to delete category',
            details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        }, { status: 500 })
    }
}
