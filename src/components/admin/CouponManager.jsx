'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Swal from 'sweetalert2'
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Save,
    Tag,
    Percent,
    DollarSign,
    Calendar,
    ChevronDown,
    ChevronUp,
    ToggleLeft,
    ToggleRight,
    Package,
    AlertCircle,
    CheckCircle,
    Clock,
    XCircle,
    Store,
    Folder,
    FolderTree,
    Info,
} from 'lucide-react'

// ─── Toast ─────────────────────────────────────────────
function Toast({ toasts }) {
    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
            <AnimatePresence>
                {toasts.map(t => (
                    <motion.div
                        key={t.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium ${t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-gray-800'}`}
                    >
                        {t.type === 'success' ? <CheckCircle size={16} /> : t.type === 'error' ? <XCircle size={16} /> : <AlertCircle size={16} />}
                        {t.message}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
}

// ─── Scope Badge ───────────────────────────────────────
const SCOPE_COLORS = {
    all: 'bg-purple-100 text-purple-700',
    category: 'bg-orange-100 text-orange-700',
    subcategory: 'bg-orange-100 text-orange-700',
    product: 'bg-orange-100 text-orange-700',
}

const SCOPE_LABELS = {
    all: 'Entire Store',
    category: 'Category',
    subcategory: 'Subcategory',
    product: 'Specific Products',
}

// ─── Status Badge ──────────────────────────────────────
function StatusBadge({ coupon }) {
    const now = new Date()
    const expired = coupon.expiresAt && new Date(coupon.expiresAt) < now
    const usedUp = coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit

    if (!coupon.isActive) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
            <XCircle size={11} /> Inactive
        </span>
    )
    if (expired) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-medium">
            <Clock size={11} /> Expired
        </span>
    )
    if (usedUp) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
            <AlertCircle size={11} /> Used Up
        </span>
    )
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
            <CheckCircle size={11} /> Active
        </span>
    )
}

// ─── Default Form ──────────────────────────────────────
const DEFAULT_FORM = {
    code: '',
    discountType: 'percent',
    discountValue: '',
    scope: 'all',
    categories: [],
    subcategories: [],
    productIds: [],
    minOrderAmount: '',
    maxDiscountAmount: '',
    usageLimit: '',
    expiresAt: '',
    isActive: true,
}

// ─── Main Component ────────────────────────────────────
export default function CouponManager({ getToken }) {
    const [coupons, setCoupons] = useState([])
    const [loading, setLoading] = useState(true)
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingCoupon, setEditingCoupon] = useState(null)
    const [form, setForm] = useState(DEFAULT_FORM)
    const [saving, setSaving] = useState(false)
    const [toasts, setToasts] = useState([])
    const [categories, setCategories] = useState([])
    const [products, setProducts] = useState([])
    const [productSearch, setProductSearch] = useState('')
    const [loadingProducts, setLoadingProducts] = useState(false)
    const [expandedCoupon, setExpandedCoupon] = useState(null)

    // ── Toast helpers ──────────────────────────────────
    const showToast = useCallback((message, type = 'success') => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
    }, [])

    // ── Load coupons ───────────────────────────────────
    const fetchCoupons = useCallback(async (page = 1, search = '') => {
        setLoading(true)
        try {
            const token = await getToken()
            const params = new URLSearchParams({ page, limit: 20, ...(search ? { search } : {}) })
            const res = await fetch(`/api/coupon?${params}`, { headers: { Authorization: `Bearer ${token}` } })
            const data = await res.json()
            if (res.ok) {
                setCoupons(data.coupons || [])
                setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
            } else {
                showToast(data.error || 'Failed to load coupons', 'error')
            }
        } catch {
            showToast('Failed to load coupons', 'error')
        } finally {
            setLoading(false)
        }
    }, [getToken, showToast])

    // ── Load categories ────────────────────────────────
    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch('/api/category')
            const data = await res.json()
            if (res.ok) setCategories(data.categories || [])
        } catch { /* ignore */ }
    }, [])

    // ── Load products ──────────────────────────────────
    const fetchProducts = useCallback(async (search = '') => {
        setLoadingProducts(true)
        try {
            const token = await getToken()
            const params = new URLSearchParams({ limit: 30, ...(search ? { search } : {}) })
            const res = await fetch(`/api/product?${params}`, { headers: { Authorization: `Bearer ${token}` } })
            const data = await res.json()
            if (res.ok) setProducts(data.products || [])
        } catch { /* ignore */ } finally { setLoadingProducts(false) }
    }, [getToken])

    useEffect(() => { fetchCoupons(1, ''); fetchCategories() }, [fetchCoupons, fetchCategories])

    useEffect(() => {
        if (form.scope === 'product') fetchProducts(productSearch)
    }, [form.scope, productSearch, fetchProducts])

    // ── Search debounce ────────────────────────────────
    useEffect(() => {
        const t = setTimeout(() => fetchCoupons(1, searchTerm), 400)
        return () => clearTimeout(t)
    }, [searchTerm])

    // ── Open create modal ──────────────────────────────
    const openCreate = () => {
        setEditingCoupon(null)
        setForm(DEFAULT_FORM)
        setProductSearch('')
        setShowModal(true)
    }

    // ── Open edit modal ────────────────────────────────
    const openEdit = (coupon) => {
        setEditingCoupon(coupon)
        setForm({
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: String(coupon.discountValue),
            scope: coupon.scope,
            categories: coupon.categories || [],
            subcategories: coupon.subcategories || [],
            productIds: coupon.productIds || [],
            minOrderAmount: coupon.minOrderAmount ? String(coupon.minOrderAmount) : '',
            maxDiscountAmount: coupon.maxDiscountAmount ? String(coupon.maxDiscountAmount) : '',
            usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '',
            expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split('T')[0] : '',
            isActive: coupon.isActive,
        })
        if (coupon.scope === 'product') fetchProducts('')
        setProductSearch('')
        setShowModal(true)
    }

    // ── Save coupon ────────────────────────────────────
    const handleSave = async () => {
        if (!form.code.trim()) return showToast('Coupon code is required', 'error')
        if (!form.discountValue || parseFloat(form.discountValue) <= 0) return showToast('Discount value must be greater than 0', 'error')
        if (form.discountType === 'percent' && parseFloat(form.discountValue) > 100) return showToast('Percent discount cannot exceed 100', 'error')
        if (form.scope === 'category' && form.categories.length === 0) return showToast('Select at least one category', 'error')
        if (form.scope === 'subcategory' && form.subcategories.length === 0) return showToast('Select at least one subcategory', 'error')
        if (form.scope === 'product' && form.productIds.length === 0) return showToast('Select at least one product', 'error')

        setSaving(true)
        try {
            const token = await getToken()
            const payload = {
                ...form,
                code: form.code.toUpperCase().trim(),
                discountValue: parseFloat(form.discountValue),
                minOrderAmount: parseFloat(form.minOrderAmount) || 0,
                maxDiscountAmount: parseFloat(form.maxDiscountAmount) || 0,
                usageLimit: parseInt(form.usageLimit, 10) || 0,
                expiresAt: form.expiresAt || null,
                ...(editingCoupon ? { id: editingCoupon._id } : {}),
            }

            const res = await fetch('/api/coupon', {
                method: editingCoupon ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            })
            const data = await res.json()
            if (res.ok) {
                showToast(editingCoupon ? 'Coupon updated!' : 'Coupon created!', 'success')
                setShowModal(false)
                fetchCoupons(pagination.page, searchTerm)
            } else {
                showToast(data.error || 'Failed to save coupon', 'error')
            }
        } catch {
            showToast('Failed to save coupon', 'error')
        } finally {
            setSaving(false)
        }
    }

    // ── Delete coupon ──────────────────────────────────
    const handleDelete = async (coupon) => {
        const result = await Swal.fire({
            title: 'Delete Coupon?',
            html: `Coupon <b>${coupon.code}</b> will be permanently deleted.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
        })
        if (!result.isConfirmed) return

        try {
            const token = await getToken()
            const res = await fetch(`/api/coupon?id=${coupon._id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            const data = await res.json()
            if (res.ok) {
                showToast('Coupon deleted', 'success')
                fetchCoupons(pagination.page, searchTerm)
            } else {
                showToast(data.error || 'Failed to delete', 'error')
            }
        } catch {
            showToast('Failed to delete coupon', 'error')
        }
    }

    // ── Toggle category selection ──────────────────────
    const toggleCategory = (catName) => {
        setForm(prev => {
            const already = prev.categories.includes(catName)
            const cats = already ? prev.categories.filter(c => c !== catName) : [...prev.categories, catName]
            // When a category is deselected, also clear its subcategories.
            // availableSubcategories for the remaining selected cats:
            const remainingSubs = cats.flatMap(cn => {
                const cat = categories.find(c => c.name === cn)
                return (cat?.subcategories || []).map(s => s.name)
            })
            const validSubs = prev.subcategories.filter(s => remainingSubs.includes(s))
            return { ...prev, categories: cats, subcategories: validSubs }
        })
    }

    // ── Toggle subcategory selection ───────────────────
    const toggleSubcategory = (subName) => {
        setForm(prev => {
            const already = prev.subcategories.includes(subName)
            return { ...prev, subcategories: already ? prev.subcategories.filter(s => s !== subName) : [...prev.subcategories, subName] }
        })
    }

    // ── Toggle product selection ───────────────────────
    const toggleProduct = (productId) => {
        setForm(prev => {
            const already = prev.productIds.includes(productId)
            return { ...prev, productIds: already ? prev.productIds.filter(p => p !== productId) : [...prev.productIds, productId] }
        })
    }

    // ── Subcategories from selected categories ─────────
    const availableSubcategories = categories
        .filter(c => form.categories.includes(c.name))
        .flatMap(c => (c.subcategories || []).map(s => ({ catName: c.name, subName: s.name })))

    // ─────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            <Toast toasts={toasts} />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Tag className="text-[#F47B20]" size={26} />
                        Coupon Manager
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">{pagination.total || 0} coupon{pagination.total !== 1 ? 's' : ''} total</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-[#F47B20] hover:bg-[#C45A00] text-white px-5 py-2.5 rounded-xl font-semibold shadow-md transition-colors"
                >
                    <Plus size={18} /> New Coupon
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search by coupon code…"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F47B20]/30 bg-white"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F47B20]" />
                    </div>
                ) : coupons.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                        <Tag size={40} className="opacity-30" />
                        <p className="font-medium">No coupons yet</p>
                        <button onClick={openCreate} className="text-sm text-[#F47B20] hover:underline font-medium">Create your first coupon</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                                    <th className="text-left px-5 py-3">Code</th>
                                    <th className="text-left px-5 py-3">Discount</th>
                                    <th className="text-left px-5 py-3">Scope</th>
                                    <th className="text-left px-5 py-3">Usage</th>
                                    <th className="text-left px-5 py-3">Expires</th>
                                    <th className="text-left px-5 py-3">Status</th>
                                    <th className="text-right px-5 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {coupons.map(coupon => (
                                    <React.Fragment key={coupon._id}>
                                        <tr className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setExpandedCoupon(expandedCoupon === coupon._id ? null : coupon._id)}
                                                        className="text-gray-400 hover:text-gray-600"
                                                    >
                                                        {expandedCoupon === coupon._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </button>
                                                    <code className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-sm">{coupon.code}</code>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 font-semibold text-gray-800">
                                                {coupon.discountType === 'percent'
                                                    ? <span className="flex items-center gap-1"><Percent size={13} className="text-purple-500" />{coupon.discountValue}%</span>
                                                    : <span className="flex items-center gap-1"><DollarSign size={13} className="text-green-500" />৳{coupon.discountValue}</span>
                                                }
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${SCOPE_COLORS[coupon.scope]}`}>
                                                    {SCOPE_LABELS[coupon.scope]}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-gray-600">
                                                {coupon.usageLimit > 0 ? `${coupon.usedCount}/${coupon.usageLimit}` : `${coupon.usedCount} / ∞`}
                                            </td>
                                            <td className="px-5 py-4 text-gray-500 text-xs">
                                                {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString('en-GB') : '—'}
                                            </td>
                                            <td className="px-5 py-4"><StatusBadge coupon={coupon} /></td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => openEdit(coupon)} className="p-2 hover:bg-orange-50 text-orange-600 rounded-lg transition-colors" title="Edit">
                                                        <Edit2 size={15} />
                                                    </button>
                                                    <button onClick={() => handleDelete(coupon)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Delete">
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Expanded detail row */}
                                        {expandedCoupon === coupon._id && (
                                            <tr key={`${coupon._id}-detail`} className="bg-orange-50/40">
                                                <td colSpan={7} className="px-8 py-4">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-gray-400 text-xs uppercase font-semibold mb-1">Min Order</p>
                                                            <p className="font-medium text-gray-700">{coupon.minOrderAmount > 0 ? `৳${coupon.minOrderAmount}` : 'None'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-400 text-xs uppercase font-semibold mb-1">Max Cap</p>
                                                            <p className="font-medium text-gray-700">{coupon.maxDiscountAmount > 0 ? `৳${coupon.maxDiscountAmount}` : 'None'}</p>
                                                        </div>
                                                        {coupon.scope === 'category' && (
                                                            <div>
                                                                <p className="text-gray-400 text-xs uppercase font-semibold mb-1">Categories</p>
                                                                <p className="font-medium text-gray-700">{coupon.categories?.join(', ') || '—'}</p>
                                                            </div>
                                                        )}
                                                        {coupon.scope === 'subcategory' && (
                                                            <>
                                                                <div>
                                                                    <p className="text-gray-400 text-xs uppercase font-semibold mb-1">Categories</p>
                                                                    <p className="font-medium text-gray-700">{coupon.categories?.join(', ') || '—'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-gray-400 text-xs uppercase font-semibold mb-1">Subcategories</p>
                                                                    <p className="font-medium text-gray-700">{coupon.subcategories?.join(', ') || '—'}</p>
                                                                </div>
                                                            </>
                                                        )}
                                                        {coupon.scope === 'product' && (
                                                            <div className="col-span-2">
                                                                <p className="text-gray-400 text-xs uppercase font-semibold mb-1">Product IDs ({coupon.productIds?.length || 0})</p>
                                                                <p className="font-medium text-gray-700 truncate">{coupon.productIds?.join(', ') || '—'}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 text-sm text-gray-600">
                        <span>Page {pagination.page} of {pagination.totalPages}</span>
                        <div className="flex gap-2">
                            <button
                                disabled={pagination.page <= 1}
                                onClick={() => fetchCoupons(pagination.page - 1, searchTerm)}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >Previous</button>
                            <button
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => fetchCoupons(pagination.page + 1, searchTerm)}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >Next</button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Create / Edit Modal ─────────────────────────── */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900">
                                    {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                                </h3>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="overflow-y-auto flex-1 p-6 space-y-5">

                                {/* Code + Active */}
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Coupon Code *</label>
                                        <input
                                            value={form.code}
                                            onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                                            placeholder="e.g. SUMMER20"
                                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#F47B20]/30"
                                        />
                                    </div>
                                    <div className="flex items-end pb-1">
                                        <button
                                            onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${form.isActive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-100 border-gray-200 text-gray-500'}`}
                                        >
                                            {form.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                            {form.isActive ? 'Active' : 'Inactive'}
                                        </button>
                                    </div>
                                </div>

                                {/* Discount Type + Value */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Discount Type *</label>
                                        <div className="flex rounded-xl overflow-hidden border border-gray-200">
                                            <button
                                                onClick={() => setForm(f => ({ ...f, discountType: 'percent' }))}
                                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-all ${form.discountType === 'percent' ? 'bg-[#F47B20] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                <Percent size={14} /> Percent
                                            </button>
                                            <button
                                                onClick={() => setForm(f => ({ ...f, discountType: 'flat' }))}
                                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-all ${form.discountType === 'flat' ? 'bg-[#F47B20] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                <DollarSign size={14} /> Flat ৳
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                                            Discount Value * {form.discountType === 'percent' ? '(%)' : '(৳)'}
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max={form.discountType === 'percent' ? 100 : undefined}
                                            value={form.discountValue}
                                            onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                                            placeholder={form.discountType === 'percent' ? '0–100' : 'e.g. 100'}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47B20]/30"
                                        />
                                    </div>
                                </div>

                                {/* Scope Selector */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Applies To *</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { value: 'all', label: 'Entire Store', Icon: Store },
                                            { value: 'category', label: 'Category', Icon: Folder },
                                            { value: 'subcategory', label: 'Subcategory', Icon: FolderTree },
                                            { value: 'product', label: 'Products', Icon: Package },
                                        ].map(({ value, label, Icon }) => (
                                            <button
                                                key={value}
                                                onClick={() => setForm(f => ({ ...f, scope: value, categories: [], subcategories: [], productIds: [] }))}
                                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                                                    form.scope === value
                                                        ? 'border-[#F47B20] bg-orange-50 text-[#F47B20]'
                                                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                <Icon size={18} />
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Category picker */}
                                {(form.scope === 'category' || form.scope === 'subcategory') && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                                            Select Categories *
                                        </label>
                                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-200">
                                            {categories.length === 0 ? (
                                                <p className="text-gray-400 text-sm p-2">No categories found</p>
                                            ) : categories.map(cat => (
                                                <button
                                                    key={cat._id}
                                                    onClick={() => toggleCategory(cat.name)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${form.categories.includes(cat.name) ? 'bg-[#F47B20] border-[#F47B20] text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'}`}
                                                >
                                                    {cat.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Subcategory picker — always visible when scope=subcategory */}
                                {form.scope === 'subcategory' && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                                            Select Subcategories *
                                        </label>
                                        {form.categories.length === 0 ? (
                                            <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-600 font-medium">
                                                <Info size={14} className="flex-shrink-0" />
                                                Select one or more categories above first to see their subcategories.
                                            </div>
                                        ) : availableSubcategories.length === 0 ? (
                                            <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
                                                <AlertCircle size={14} className="flex-shrink-0" />
                                                The selected categories have no subcategories defined.
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-200">
                                                {availableSubcategories.map(({ catName, subName }) => (
                                                    <button
                                                        key={`${catName}-${subName}`}
                                                        onClick={() => toggleSubcategory(subName)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                                            form.subcategories.includes(subName)
                                                                ? 'bg-indigo-500 border-indigo-500 text-white'
                                                                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
                                                        }`}
                                                    >
                                                        <span className="opacity-60 mr-0.5">{catName} /</span> {subName}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Product picker */}
                                {form.scope === 'product' && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                                            Select Products * ({form.productIds.length} selected)
                                        </label>
                                        <div className="relative mb-2">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                value={productSearch}
                                                onChange={e => setProductSearch(e.target.value)}
                                                placeholder="Search products…"
                                                className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F47B20]/30"
                                            />
                                        </div>
                                        <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                                            {loadingProducts ? (
                                                <div className="flex items-center justify-center h-20">
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#F47B20]" />
                                                </div>
                                            ) : products.length === 0 ? (
                                                <p className="text-gray-400 text-sm p-4 text-center">No products found</p>
                                            ) : products.map(product => {
                                                const pid = String(product._id)
                                                const selected = form.productIds.includes(pid)
                                                return (
                                                    <button
                                                        key={pid}
                                                        onClick={() => toggleProduct(pid)}
                                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${selected ? 'bg-orange-50' : ''}`}
                                                    >
                                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected ? 'bg-[#F47B20] border-[#F47B20]' : 'border-gray-300'}`}>
                                                            {selected && <CheckCircle size={12} className="text-white" strokeWidth={3} />}
                                                        </div>
                                                        {product.images?.[0]?.url && (
                                                            <img src={product.images[0].url} alt="" className="w-8 h-8 object-cover rounded-lg flex-shrink-0" />
                                                        )}
                                                        {!product.images?.[0]?.url && (
                                                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                <Package size={14} className="text-gray-400" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                                                            <p className="text-xs text-gray-400">{product.category} {product.brand ? `· ${product.brand}` : ''}</p>
                                                        </div>
                                                        <span className="text-sm font-semibold text-gray-700 flex-shrink-0">৳{product.price}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Advanced options */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Min Order Amount (৳)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.minOrderAmount}
                                            onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))}
                                            placeholder="0 = no minimum"
                                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47B20]/30"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Max Discount Cap (৳)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.maxDiscountAmount}
                                            onChange={e => setForm(f => ({ ...f, maxDiscountAmount: e.target.value }))}
                                            placeholder="0 = no cap"
                                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47B20]/30"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Usage Limit</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.usageLimit}
                                            onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))}
                                            placeholder="0 = unlimited"
                                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47B20]/30"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                                            <Calendar size={12} /> Expiry Date
                                        </label>
                                        <input
                                            type="date"
                                            value={form.expiresAt}
                                            onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47B20]/30"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                                <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-[#F47B20] hover:bg-[#C45A00] text-white rounded-xl text-sm font-semibold shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {saving ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                    ) : (
                                        <Save size={15} />
                                    )}
                                    {saving ? 'Saving…' : editingCoupon ? 'Save Changes' : 'Create Coupon'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
