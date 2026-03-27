'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Swal from 'sweetalert2'
import {
    Plus,
    Trash2,
    Edit2,
    Check,
    X,
    Image as ImageIcon,
    Upload,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Tag,
    Maximize2,
} from 'lucide-react'

export default function BrandManager({ getToken }) {
    const [brands, setBrands] = useState([])
    const [loading, setLoading] = useState(true)

    // Add brand form
    const [newBrandName, setNewBrandName] = useState('')
    const [newBrandLogo, setNewBrandLogo] = useState(null)   // File
    const [newBrandPreview, setNewBrandPreview] = useState(null) // Object URL
    const [addingBrand, setAddingBrand] = useState(false)
    const newLogoRef = useRef(null)

    // Inline rename
    const [renamingId, setRenamingId] = useState(null)
    const [renamingValue, setRenamingValue] = useState('')

    // Logo update
    const [updatingLogoFor, setUpdatingLogoFor] = useState(null)

    // Logo scale + position
    const [scaleEditing, setScaleEditing] = useState(null) // brand._id
    const [scaleValue, setScaleValue] = useState(100)
    const [offsetX, setOffsetX] = useState(0)
    const [offsetY, setOffsetY] = useState(0)
    const [savingScale, setSavingScale] = useState(false)

    // Toast
    const [toast, setToast] = useState(null)

    const showToast = (type, message) => {
        setToast({ type, message })
        setTimeout(() => setToast(null), 4000)
    }

    useEffect(() => {
        fetchBrands()
    }, [])

    const fetchBrands = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/brand')
            const data = await res.json()
            setBrands(data.brands || [])
        } catch (err) {
            console.error('Error fetching brands:', err)
            showToast('error', 'Failed to load brands')
        } finally {
            setLoading(false)
        }
    }

    // ── Logo file selection for new brand ──
    const handleNewLogoSelect = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
        if (!allowed.includes(file.type)) {
            showToast('error', 'Only JPEG, PNG, WebP, SVG allowed')
            return
        }
        setNewBrandLogo(file)
        setNewBrandPreview(URL.createObjectURL(file))
    }

    // ── Add Brand ──
    const handleAddBrand = async () => {
        const name = newBrandName.trim()
        if (!name) return

        setAddingBrand(true)
        try {
            const token = await getToken()
            let res, data

            if (newBrandLogo) {
                const fd = new FormData()
                fd.append('name', name)
                fd.append('logo', newBrandLogo)
                res = await fetch('/api/brand', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: fd,
                })
            } else {
                res = await fetch('/api/brand', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ name }),
                })
            }

            data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to add brand')

            // Reset form
            setNewBrandName('')
            setNewBrandLogo(null)
            setNewBrandPreview(null)
            if (newLogoRef.current) newLogoRef.current.value = ''
            showToast('success', `Brand "${name}" added!`)
            fetchBrands()
        } catch (err) {
            showToast('error', err.message || 'Failed to add brand')
        } finally {
            setAddingBrand(false)
        }
    }

    // ── Rename Brand ──
    const handleRename = async (brand) => {
        const name = renamingValue.trim()
        if (!name || name === brand.name) { setRenamingId(null); return }
        try {
            const token = await getToken()
            const res = await fetch('/api/brand', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ id: brand._id, name }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to rename brand')
            setRenamingId(null)
            showToast('success', 'Brand renamed!')
            fetchBrands()
        } catch (err) {
            showToast('error', err.message || 'Failed to rename brand')
        }
    }

    // ── Update Logo ──
    const handleUpdateLogo = async (brand, file) => {
        if (!file) return
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
        if (!allowed.includes(file.type)) {
            showToast('error', 'Only JPEG, PNG, WebP, SVG allowed')
            return
        }
        setUpdatingLogoFor(brand._id)
        try {
            const token = await getToken()
            const fd = new FormData()
            fd.append('id', brand._id)
            fd.append('logo', file)
            const res = await fetch('/api/brand', {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
                body: fd,
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to update logo')
            showToast('success', 'Brand logo updated!')
            fetchBrands()
        } catch (err) {
            showToast('error', err.message || 'Failed to update logo')
        } finally {
            setUpdatingLogoFor(null)
        }
    }

    // ── Save Logo Scale ──
    const handleSaveScale = async (brand) => {
        setSavingScale(true)
        try {
            const token = await getToken()
            const res = await fetch('/api/brand', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ id: brand._id, logoScale: scaleValue, logoOffsetX: offsetX, logoOffsetY: offsetY }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to save scale')
            showToast('success', `Logo size saved for ${brand.name}`)
            setScaleEditing(null)
            fetchBrands()
        } catch (err) {
            showToast('error', err.message || 'Failed to save scale')
        } finally {
            setSavingScale(false)
        }
    }

    // ── Delete Brand ──
    const handleDelete = async (brand) => {
        const result = await Swal.fire({
            title: `Delete "${brand.name}"?`,
            text: 'This will permanently remove the brand and its logo. This cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, delete it',
            cancelButtonText: 'Cancel',
        })
        if (!result.isConfirmed) return

        try {
            const token = await getToken()
            const res = await fetch(`/api/brand?id=${brand._id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || `Server error ${res.status}`)
            }
            showToast('success', `Brand "${brand.name}" deleted.`)
            fetchBrands()
        } catch (err) {
            showToast('error', err.message || 'Failed to delete brand')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#f26e21]" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`flex items-center gap-3 px-5 py-3 text-sm font-medium rounded-xl ${toast.type === 'success'
                            ? 'bg-green-50 text-green-700 border border-green-100'
                            : 'bg-red-50 text-red-700 border border-red-100'
                            }`}
                    >
                        {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Brand Management</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {brands.length} brand{brands.length !== 1 ? 's' : ''} · Brands appear in the product form dropdown
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-3 py-2 rounded-lg text-xs text-orange-700">
                    <Tag size={14} />
                    Brands persist independently of products
                </div>
            </div>

            {/* Add Brand Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <label className="block text-sm font-semibold text-gray-700 mb-4">Add New Brand</label>

                {/* Logo upload area */}
                <div className="mb-4">
                    <div
                        onClick={() => newLogoRef.current?.click()}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all
                            ${newBrandPreview ? 'border-[#f26e21] bg-orange-50' : 'border-gray-200 hover:border-[#f26e21] hover:bg-orange-50'}`}
                    >
                        {newBrandPreview ? (
                            <>
                                <img
                                    src={newBrandPreview}
                                    alt="Logo preview"
                                    className="w-14 h-14 object-contain rounded-lg bg-white border border-gray-200 flex-shrink-0 p-1"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[#f26e21] truncate">{newBrandLogo?.name}</p>
                                    <p className="text-xs text-gray-400">Click to change logo</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setNewBrandLogo(null)
                                        setNewBrandPreview(null)
                                        if (newLogoRef.current) newLogoRef.current.value = ''
                                    }}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                                >
                                    <X size={16} />
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <ImageIcon size={24} className="text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Upload brand logo <span className="text-gray-400 text-xs font-normal">(optional)</span></p>
                                    <p className="text-xs text-gray-400">JPEG, PNG, WebP, SVG — max 100MB</p>
                                </div>
                                <Upload size={18} className="text-gray-400 ml-auto flex-shrink-0" />
                            </>
                        )}
                    </div>
                    <input
                        ref={newLogoRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                        onChange={handleNewLogoSelect}
                        className="hidden"
                    />
                </div>

                {/* Name + Add button */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newBrandName}
                        onChange={(e) => setNewBrandName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddBrand() }}
                        placeholder="e.g. Samsung, Apple, Sony"
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f26e21] focus:border-transparent"
                    />
                    <button
                        onClick={handleAddBrand}
                        disabled={addingBrand || !newBrandName.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#f26e21] to-[#C45A00] text-white rounded-lg text-sm font-semibold hover:from-[#C45A00] hover:to-[#A34800] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {addingBrand ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                        {addingBrand ? 'Adding...' : 'Add Brand'}
                    </button>
                </div>
            </div>

            {/* Brands List */}
            {brands.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                    <Tag size={56} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-lg text-gray-500 font-medium">No brands yet</p>
                    <p className="text-sm text-gray-400 mt-1">Add your first brand above</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {brands.map((brand) => {
                        const isRenaming = renamingId === brand._id
                        const isUpdatingLogo = updatingLogoFor === brand._id

                        return (
                            <motion.div
                                key={brand._id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-xl border border-gray-200 p-4 group hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Logo */}
                                    <div
                                        className="relative flex-shrink-0 w-14 h-14 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center cursor-pointer overflow-hidden hover:border-[#f26e21] transition-colors"
                                        title="Click to update logo"
                                        onClick={() => {
                                            const inp = document.createElement('input')
                                            inp.type = 'file'
                                            inp.accept = 'image/jpeg,image/jpg,image/png,image/webp,image/svg+xml'
                                            inp.onchange = (e) => {
                                                const file = e.target.files?.[0]
                                                if (file) handleUpdateLogo(brand, file)
                                            }
                                            inp.click()
                                        }}
                                    >
                                        {isUpdatingLogo ? (
                                            <Loader2 size={22} className="animate-spin text-[#f26e21]" />
                                        ) : brand.logo ? (
                                            <>
                                                <img
                                                    src={brand.logo}
                                                    alt={brand.name}
                                                    className="w-full h-full object-contain p-2"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                    <Upload size={14} className="text-white" />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <Tag size={24} className="text-gray-400" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                    <Upload size={14} className="text-gray-600" />
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Name */}
                                    <div className="flex-1 min-w-0">
                                        {isRenaming ? (
                                            <input
                                                autoFocus
                                                type="text"
                                                value={renamingValue}
                                                onChange={(e) => setRenamingValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleRename(brand)
                                                    if (e.key === 'Escape') setRenamingId(null)
                                                }}
                                                className="w-full px-2 py-1 border border-[#f26e21] rounded-lg text-sm font-semibold focus:outline-none"
                                            />
                                        ) : (
                                            <p className="font-semibold text-gray-900 text-sm truncate">{brand.name}</p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            Logo size: {brand.logoScale || 100}%
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {isRenaming ? (
                                            <>
                                                <button
                                                    onClick={() => handleRename(brand)}
                                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                >
                                                    <Check size={15} />
                                                </button>
                                                <button
                                                    onClick={() => setRenamingId(null)}
                                                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                                                >
                                                    <X size={15} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                {brand.logo && (
                                                    <button
                                                        onClick={() => { setScaleEditing(brand._id); setScaleValue(brand.logoScale || 100); setOffsetX(brand.logoOffsetX || 0); setOffsetY(brand.logoOffsetY || 0) }}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Resize & position logo"
                                                    >
                                                        <Maximize2 size={15} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => { setRenamingId(brand._id); setRenamingValue(brand.name) }}
                                                    className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                    title="Rename brand"
                                                >
                                                    <Edit2 size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(brand)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete brand"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Scale + Position Editor — expandable */}
                                {scaleEditing === brand._id && brand.logo && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="mt-4 pt-4 border-t border-gray-100"
                                    >
                                        <p className="text-xs font-semibold text-gray-600 mb-3">Homepage Preview</p>
                                        {/* Preview — exact same aspect-ratio & overflow as storefront */}
                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 flex items-center justify-center">
                                            <div
                                                className="relative flex items-center justify-center overflow-hidden"
                                                style={{ width: '150px', aspectRatio: '5/2', outline: '2px dashed #f26e21', borderRadius: '6px' }}
                                            >
                                                <div className="w-full h-full px-3 flex items-center justify-center overflow-hidden">
                                                    <img
                                                        src={brand.logo}
                                                        alt={brand.name}
                                                        className="max-w-full max-h-full object-contain transition-all duration-200"
                                                        style={{
                                                            transform: `scale(${scaleValue / 100}) translate(${offsetX}px, ${offsetY}px)`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Size slider */}
                                        <div className="mb-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[11px] font-semibold text-gray-500">Size</span>
                                                <span className="text-[11px] font-bold text-[#f26e21]">{scaleValue}%</span>
                                            </div>
                                            <input
                                                type="range" min={50} max={200} step={5}
                                                value={scaleValue}
                                                onChange={(e) => setScaleValue(Number(e.target.value))}
                                                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                                style={{ background: `linear-gradient(to right, #f26e21 ${((scaleValue - 50) / 150) * 100}%, #e5e7eb ${((scaleValue - 50) / 150) * 100}%)` }}
                                            />
                                        </div>

                                        {/* X Position slider */}
                                        <div className="mb-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[11px] font-semibold text-gray-500">Horizontal</span>
                                                <span className="text-[11px] font-bold text-gray-600">{offsetX}px</span>
                                            </div>
                                            <input
                                                type="range" min={-50} max={50} step={1}
                                                value={offsetX}
                                                onChange={(e) => setOffsetX(Number(e.target.value))}
                                                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                                style={{ background: `linear-gradient(to right, #e5e7eb ${((offsetX + 50) / 100) * 100 - 1}%, #6366f1 ${((offsetX + 50) / 100) * 100 - 1}%, #6366f1 ${((offsetX + 50) / 100) * 100 + 1}%, #e5e7eb ${((offsetX + 50) / 100) * 100 + 1}%)` }}
                                            />
                                        </div>

                                        {/* Y Position slider */}
                                        <div className="mb-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[11px] font-semibold text-gray-500">Vertical</span>
                                                <span className="text-[11px] font-bold text-gray-600">{offsetY}px</span>
                                            </div>
                                            <input
                                                type="range" min={-50} max={50} step={1}
                                                value={offsetY}
                                                onChange={(e) => setOffsetY(Number(e.target.value))}
                                                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                                style={{ background: `linear-gradient(to right, #e5e7eb ${((offsetY + 50) / 100) * 100 - 1}%, #6366f1 ${((offsetY + 50) / 100) * 100 - 1}%, #6366f1 ${((offsetY + 50) / 100) * 100 + 1}%, #e5e7eb ${((offsetY + 50) / 100) * 100 + 1}%)` }}
                                            />
                                        </div>

                                        {/* Reset + Save / Cancel */}
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() => { setScaleValue(100); setOffsetX(0); setOffsetY(0) }}
                                                className="px-3 py-2 text-gray-500 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                Reset
                                            </button>
                                            <button
                                                onClick={() => handleSaveScale(brand)}
                                                disabled={savingScale}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#f26e21] text-white text-xs font-semibold rounded-lg hover:bg-[#e05e15] transition-colors disabled:opacity-50"
                                            >
                                                {savingScale ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                                {savingScale ? 'Saving...' : 'Save'}
                                            </button>
                                            <button
                                                onClick={() => setScaleEditing(null)}
                                                className="px-3 py-2 text-gray-500 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
