'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Swal from 'sweetalert2'
import {
    Plus,
    Trash2,
    ChevronDown,
    ChevronRight,
    FolderOpen,
    Folder,
    Edit2,
    Check,
    X,
    Layers,
    Upload,
    Image as ImageIcon,
} from 'lucide-react'

const MySwal = Swal

export default function CategoryManager({ getToken }) {
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedCats, setExpandedCats] = useState({})

    // New category input
    const [newCatName, setNewCatName] = useState('')
    const [newCatImage, setNewCatImage] = useState(null)       // File
    const [newCatPreview, setNewCatPreview] = useState(null)   // Object URL
    const [addingCat, setAddingCat] = useState(false)
    const newCatFileRef = useRef(null)

    // New subcategory input (per category)
    const [newSubInputs, setNewSubInputs] = useState({}) // { catId: '' }
    const [addingSubFor, setAddingSubFor] = useState(null) // catId

    // Inline rename
    const [renamingCatId, setRenamingCatId] = useState(null)
    const [renamingCatValue, setRenamingCatValue] = useState('')
    const [renamingSubId, setRenamingSubId] = useState(null) // "catId::subId"
    const [renamingSubValue, setRenamingSubValue] = useState('')

    // Image update per category
    const [updatingImageFor, setUpdatingImageFor] = useState(null) // catId
    const imgUpdateRef = useRef(null)

    useEffect(() => {
        fetchCategories()
    }, [])

    const fetchCategories = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/category')
            const data = await res.json()
            setCategories(data.categories || [])
        } catch (err) {
            console.error('Error fetching categories:', err)
        } finally {
            setLoading(false)
        }
    }

    const toggleExpand = (catId) => {
        setExpandedCats(prev => ({ ...prev, [catId]: !prev[catId] }))
    }

    // ── Handle new category image selection ──
    const handleNewCatImageSelect = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if (!allowed.includes(file.type)) {
            MySwal.fire({ icon: 'error', title: 'Invalid File', text: 'Only JPEG, PNG, WebP allowed', confirmButtonColor: '#f26e21' })
            return
        }
        setNewCatImage(file)
        setNewCatPreview(URL.createObjectURL(file))
    }

    // ── Create Category (FormData with required image) ──
    const handleAddCategory = async () => {
        const name = newCatName.trim()
        if (!name) return
        if (!newCatImage) {
            MySwal.fire({ icon: 'warning', title: 'Image Required', text: 'Please select an image for this category', confirmButtonColor: '#f26e21' })
            return
        }
        setAddingCat(true)
        try {
            const token = await getToken()
            const fd = new FormData()
            fd.append('name', name)
            fd.append('image', newCatImage)

            const res = await fetch('/api/category', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: fd,
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to create category')
            setNewCatName('')
            setNewCatImage(null)
            setNewCatPreview(null)
            if (newCatFileRef.current) newCatFileRef.current.value = ''
            // Auto-expand newly created category
            if (data.category) {
                setExpandedCats(prev => ({ ...prev, [data.category._id]: true }))
            }
            fetchCategories()
        } catch (err) {
            MySwal.fire({ icon: 'error', title: 'Error', text: err.message, confirmButtonColor: '#f26e21' })
        } finally {
            setAddingCat(false)
        }
    }

    // ── Update category image ──
    const handleUpdateCategoryImage = async (cat, file) => {
        if (!file) return
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if (!allowed.includes(file.type)) {
            MySwal.fire({ icon: 'error', title: 'Invalid File', text: 'Only JPEG, PNG, WebP allowed', confirmButtonColor: '#f26e21' })
            return
        }
        setUpdatingImageFor(cat._id)
        try {
            const token = await getToken()
            const fd = new FormData()
            fd.append('id', cat._id)
            fd.append('image', file)

            const res = await fetch('/api/category', {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
                body: fd,
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to update image')
            MySwal.fire({ icon: 'success', title: 'Image updated!', timer: 1200, showConfirmButton: false })
            fetchCategories()
        } catch (err) {
            MySwal.fire({ icon: 'error', title: 'Error', text: err.message, confirmButtonColor: '#f26e21' })
        } finally {
            setUpdatingImageFor(null)
        }
    }

    // ── Add Subcategory ──
    const handleAddSubcategory = async (cat) => {
        const subName = (newSubInputs[cat._id] || '').trim()
        if (!subName) return
        try {
            const token = await getToken()
            const res = await fetch('/api/category', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action: 'add-subcategory', categoryId: cat._id, subcategoryName: subName }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to add subcategory')
            setNewSubInputs(prev => ({ ...prev, [cat._id]: '' }))
            setAddingSubFor(null)
            fetchCategories()
        } catch (err) {
            MySwal.fire({ icon: 'error', title: 'Error', text: err.message, confirmButtonColor: '#f26e21' })
        }
    }

    // ── Rename Category ──
    const handleRenameCategory = async (cat) => {
        const name = renamingCatValue.trim()
        if (!name || name === cat.name) { setRenamingCatId(null); return }
        try {
            const token = await getToken()
            const res = await fetch('/api/category', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ id: cat._id, name }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to rename')
            setRenamingCatId(null)
            fetchCategories()
        } catch (err) {
            MySwal.fire({ icon: 'error', title: 'Error', text: err.message, confirmButtonColor: '#f26e21' })
        }
    }

    // ── Rename Subcategory ──
    const handleRenameSubcategory = async (cat, sub) => {
        const name = renamingSubValue.trim()
        if (!name || name === sub.name) { setRenamingSubId(null); return }
        try {
            const token = await getToken()
            const res = await fetch('/api/category', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ id: cat._id, subcategoryId: sub._id, name }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to rename subcategory')
            setRenamingSubId(null)
            fetchCategories()
        } catch (err) {
            MySwal.fire({ icon: 'error', title: 'Error', text: err.message, confirmButtonColor: '#f26e21' })
        }
    }

    // ── Delete Category (with subcategory warning) ──
    const handleDeleteCategory = async (cat) => {
        const subcatList = (cat.subcategories || []).map(s => `• ${s.name}`).join('\n')
        const subcatCount = cat.subcategories?.length || 0

        const warningText = subcatCount > 0
            ? `Deleting "${cat.name}" will also permanently delete these ${subcatCount} subcategories:\n\n${subcatList}\n\nThis cannot be undone.`
            : `"${cat.name}" will be permanently deleted. This cannot be undone.`

        const result = await MySwal.fire({
            title: `Delete "${cat.name}"?`,
            text: warningText,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, delete everything',
            cancelButtonText: 'Cancel',
        })
        if (!result.isConfirmed) return

        try {
            const token = await getToken()
            const res = await fetch(`/api/category?id=${cat._id}&force=true`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || `Server error ${res.status}`)
            }
            MySwal.fire({ icon: 'success', title: 'Deleted!', text: `"${cat.name}" and all its subcategories have been deleted`, timer: 1800, showConfirmButton: false })
            fetchCategories()
        } catch (err) {
            MySwal.fire({ icon: 'error', title: 'Error', text: err.message, confirmButtonColor: '#f26e21' })
        }
    }

    // ── Delete Subcategory ──
    const handleDeleteSubcategory = async (cat, sub) => {
        const result = await MySwal.fire({
            title: `Delete subcategory "${sub.name}"?`,
            text: `This will remove "${sub.name}" from the "${cat.name}" category. Products using this subcategory will not be affected.`,
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
            const res = await fetch(`/api/category?id=${cat._id}&subcategoryId=${sub._id}&force=true`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || `Server error ${res.status}`)
            }
            MySwal.fire({ icon: 'success', title: 'Deleted!', text: `"${sub.name}" removed`, timer: 1200, showConfirmButton: false })
            fetchCategories()
        } catch (err) {
            MySwal.fire({ icon: 'error', title: 'Error', text: err.message, confirmButtonColor: '#f26e21' })
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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Category Management</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'} · {categories.reduce((n, c) => n + (c.subcategories?.length || 0), 0)} subcategories
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-3 py-2 rounded-lg text-xs text-orange-700">
                    <Layers size={14} />
                    Categories persist independently of products
                </div>
            </div>

            {/* Add Category Row */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Add New Category</label>

                {/* Image upload area */}
                <div className="mb-3">
                    <div
                        onClick={() => newCatFileRef.current?.click()}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors
                            ${newCatPreview ? 'border-[#f26e21] bg-orange-50' : 'border-gray-300 hover:border-[#f26e21] hover:bg-orange-50'}`}
                    >
                        {newCatPreview ? (
                            <>
                                <img src={newCatPreview} alt="Preview" className="w-14 h-14 object-cover rounded-lg flex-shrink-0 shadow" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[#f26e21] truncate">{newCatImage?.name}</p>
                                    <p className="text-xs text-gray-400">Click to change image</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setNewCatImage(null); setNewCatPreview(null); if (newCatFileRef.current) newCatFileRef.current.value = '' }}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                                >
                                    <X size={16} />
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <ImageIcon size={24} className="text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Upload category image <span className="text-red-500">*</span></p>
                                    <p className="text-xs text-gray-400">JPEG, PNG, WebP — required</p>
                                </div>
                                <Upload size={18} className="text-gray-400 ml-auto flex-shrink-0" />
                            </>
                        )}
                    </div>
                    <input
                        ref={newCatFileRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleNewCatImageSelect}
                        className="hidden"
                    />
                </div>

                {/* Name + Add button */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory() }}
                        placeholder="e.g. Smartphones, Laptops, Accessories"
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f26e21] focus:border-transparent"
                    />
                    <button
                        onClick={handleAddCategory}
                        disabled={addingCat || !newCatName.trim() || !newCatImage}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#f26e21] to-[#C45A00] text-white rounded-lg text-sm font-medium hover:from-[#C45A00] hover:to-[#A34800] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={16} />
                        {addingCat ? 'Adding...' : 'Add Category'}
                    </button>
                </div>
            </div>

            {/* Categories List */}
            {categories.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                    <FolderOpen size={56} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-lg text-gray-500 font-medium">No categories yet</p>
                    <p className="text-sm text-gray-400 mt-1">Add your first category above</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {categories.map((cat) => {
                        const isExpanded = expandedCats[cat._id]
                        const isRenamingThis = renamingCatId === cat._id
                        const subCount = cat.subcategories?.length || 0
                        const isUpdatingImg = updatingImageFor === cat._id

                        return (
                            <motion.div
                                key={cat._id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                            >
                                {/* Category Row */}
                                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
                                    <button
                                        onClick={() => toggleExpand(cat._id)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {isExpanded
                                            ? <ChevronDown size={18} />
                                            : <ChevronRight size={18} />}
                                    </button>

                                    {/* Category thumbnail */}
                                    <div className="relative flex-shrink-0">
                                        {cat.image ? (
                                            <img
                                                src={cat.image}
                                                alt={cat.name}
                                                className="w-10 h-10 object-cover rounded-lg border border-gray-200"
                                            />
                                        ) : (
                                            isExpanded
                                                ? <FolderOpen size={18} className="text-[#f26e21]" />
                                                : <Folder size={18} className="text-gray-400" />
                                        )}
                                        {/* Hidden file input for image update */}
                                        <input
                                            ref={imgUpdateRef}
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/webp"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) handleUpdateCategoryImage(cat, file)
                                                e.target.value = ''
                                            }}
                                        />
                                    </div>

                                    {/* Name / Rename input */}
                                    {isRenamingThis ? (
                                        <input
                                            autoFocus
                                            type="text"
                                            value={renamingCatValue}
                                            onChange={(e) => setRenamingCatValue(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleRenameCategory(cat)
                                                if (e.key === 'Escape') setRenamingCatId(null)
                                            }}
                                            className="flex-1 px-2 py-1 border border-[#f26e21] rounded text-sm font-semibold focus:outline-none"
                                        />
                                    ) : (
                                        <span className="flex-1 font-semibold text-gray-900 text-sm">{cat.name}</span>
                                    )}

                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full flex-shrink-0">
                                        {subCount} sub
                                    </span>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1">
                                        {/* Update image button */}
                                        <button
                                            onClick={() => {
                                                // Create a fresh hidden file input click for this specific cat
                                                const inp = document.createElement('input')
                                                inp.type = 'file'
                                                inp.accept = 'image/jpeg,image/jpg,image/png,image/webp'
                                                inp.onchange = (e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) handleUpdateCategoryImage(cat, file)
                                                }
                                                inp.click()
                                            }}
                                            disabled={isUpdatingImg}
                                            className="p-1.5 text-orange-500 hover:bg-orange-50 rounded transition-colors disabled:opacity-40"
                                            title="Update category image"
                                        >
                                            {isUpdatingImg
                                                ? <div className="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                                                : <ImageIcon size={15} />
                                            }
                                        </button>

                                        {isRenamingThis ? (
                                            <>
                                                <button onClick={() => handleRenameCategory(cat)} className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors">
                                                    <Check size={15} />
                                                </button>
                                                <button onClick={() => setRenamingCatId(null)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors">
                                                    <X size={15} />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => { setRenamingCatId(cat._id); setRenamingCatValue(cat.name) }}
                                                className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                                title="Rename category"
                                            >
                                                <Edit2 size={15} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteCategory(cat)}
                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                            title="Delete category"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>

                                {/* Subcategories (expanded) */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 py-3 space-y-2">
                                                {(cat.subcategories || []).length === 0 ? (
                                                    <p className="text-xs text-gray-400 italic pl-6">No subcategories yet</p>
                                                ) : (
                                                    (cat.subcategories || []).map((sub) => {
                                                        const subKey = `${cat._id}::${sub._id}`
                                                        const isRenamingSub = renamingSubId === subKey

                                                        return (
                                                            <div key={sub._id} className="group flex items-center gap-2 pl-6">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />

                                                                {isRenamingSub ? (
                                                                    <input
                                                                        autoFocus
                                                                        type="text"
                                                                        value={renamingSubValue}
                                                                        onChange={(e) => setRenamingSubValue(e.target.value)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') handleRenameSubcategory(cat, sub)
                                                                            if (e.key === 'Escape') setRenamingSubId(null)
                                                                        }}
                                                                        className="flex-1 px-2 py-0.5 border border-[#f26e21] rounded text-sm focus:outline-none"
                                                                    />
                                                                ) : (
                                                                    <span className="flex-1 text-sm text-gray-700">{sub.name}</span>
                                                                )}

                                                                <div className="flex items-center gap-1">
                                                                    {isRenamingSub ? (
                                                                        <>
                                                                            <button onClick={() => handleRenameSubcategory(cat, sub)} className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors">
                                                                                <Check size={13} />
                                                                            </button>
                                                                            <button onClick={() => setRenamingSubId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors">
                                                                                <X size={13} />
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => { setRenamingSubId(subKey); setRenamingSubValue(sub.name) }}
                                                                            className="p-1 text-orange-500 hover:bg-orange-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                                            title="Rename"
                                                                        >
                                                                            <Edit2 size={13} />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleDeleteSubcategory(cat, sub)}
                                                                        className="p-1 text-red-400 hover:bg-red-50 rounded transition-colors"
                                                                        title="Delete subcategory"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )
                                                    })
                                                )}

                                                {/* Add Subcategory Row */}
                                                {addingSubFor === cat._id ? (
                                                    <div className="flex items-center gap-2 pl-6 pt-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#f26e21] flex-shrink-0" />
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            value={newSubInputs[cat._id] || ''}
                                                            onChange={(e) => setNewSubInputs(prev => ({ ...prev, [cat._id]: e.target.value }))}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleAddSubcategory(cat)
                                                                if (e.key === 'Escape') setAddingSubFor(null)
                                                            }}
                                                            placeholder="Subcategory name..."
                                                            className="flex-1 px-2 py-1 border border-[#f26e21] rounded text-sm focus:outline-none"
                                                        />
                                                        <button onClick={() => handleAddSubcategory(cat)} className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors">
                                                            <Check size={14} />
                                                        </button>
                                                        <button onClick={() => setAddingSubFor(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => { setAddingSubFor(cat._id); setNewSubInputs(prev => ({ ...prev, [cat._id]: '' })) }}
                                                        className="flex items-center gap-1.5 pl-6 text-sm text-[#f26e21] hover:underline mt-1"
                                                    >
                                                        <Plus size={13} />
                                                        Add subcategory
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
