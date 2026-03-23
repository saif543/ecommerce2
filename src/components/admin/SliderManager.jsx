'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Swal from 'sweetalert2'
import {
    Upload,
    Save,
    Trash2,
    X,
    Image as ImageIcon,
    ToggleLeft,
    ToggleRight,
    Plus,
    Edit2,
    ArrowUp,
    ArrowDown,
} from 'lucide-react'

const MySwal = Swal

// ── Default form state ─────────────────────────────────────
const DEFAULT_FORM = {
    id: '',
    link: '',
    isActive: true,
}

// ── Main Component ────────────────────────────────────────────
export default function SliderManagement({ getToken }) {
    const [loading, setLoading] = useState(true)
    const [slides, setSlides] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [editingSlide, setEditingSlide] = useState(null)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)

    const [formData, setFormData] = useState({ ...DEFAULT_FORM })
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const fileInputRef = useRef(null)

    useEffect(() => {
        fetchSlides()
    }, [])

    const fetchSlides = async () => {
        try {
            setLoading(true)
            const token = await getToken()
            const headers = token ? { Authorization: `Bearer ${token}` } : {}
            const response = await fetch('/api/slider?includeInactive=true', { headers })
            const result = await response.json()
            if (result.success) setSlides(result.slides || [])
        } catch (error) {
            console.error('Error fetching slides:', error)
            MySwal.fire({ icon: 'error', title: 'Error', text: 'Failed to load slides', confirmButtonColor: '#3F72AF' })
        } finally {
            setLoading(false)
        }
    }

    const openCreateModal = () => {
        setEditingSlide(null)
        setFormData({ ...DEFAULT_FORM, id: `slide-${Date.now()}` })
        setImageFile(null)
        setImagePreview(null)
        setShowModal(true)
    }

    const openEditModal = (slide) => {
        setEditingSlide(slide)
        setFormData({
            id: slide.id,
            link: slide.link || '',
            isActive: slide.isActive !== false,
        })
        setImagePreview(typeof slide.image === 'string' ? slide.image : (slide.image?.url || null))
        setImageFile(null)
        setShowModal(true)
    }

    const handleImageSelect = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
        if (!allowedTypes.includes(file.type)) {
            MySwal.fire({ icon: 'error', title: 'Invalid File Type', text: 'Only JPEG, PNG, WebP are allowed', confirmButtonColor: '#3F72AF' })
            return
        }
        if (file.size > 100 * 1024 * 1024) {
            MySwal.fire({ icon: 'error', title: 'File Too Large', text: 'Maximum file size is 100MB', confirmButtonColor: '#3F72AF' })
            return
        }
        setImageFile(file)
        setImagePreview(URL.createObjectURL(file))
    }

    const set = (key, val) => setFormData(prev => ({ ...prev, [key]: val }))

    const handleSaveSlide = async (e) => {
        e.preventDefault()
        if (!editingSlide && !imageFile) {
            MySwal.fire({ icon: 'warning', title: 'Image Required', text: 'Please select an image for the slide', confirmButtonColor: '#3F72AF' })
            return
        }
        setSaving(true)
        try {
            const token = await getToken()
            if (!token) throw new Error('Authentication required')

            const slideData = {
                action: editingSlide ? 'update' : 'create',
                slideData: { ...formData },
            }
            if (editingSlide) slideData.id = editingSlide.id

            const response = await fetch('/api/slider', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(slideData),
            })

            const data = await response.json()
            if (!data.success) throw new Error(data.error || 'Failed to save slide')

            if (imageFile) {
                setUploading(true)
                const formDataImg = new FormData()
                formDataImg.append('image', imageFile)
                formDataImg.append('slideId', formData.id)
                const uploadResponse = await fetch('/api/slider', {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formDataImg,
                })
                const uploadData = await uploadResponse.json()
                if (!uploadData.success) throw new Error(uploadData.error || 'Failed to upload image')
                setUploading(false)
            }

            MySwal.fire({
                icon: 'success', title: 'Success!',
                text: `Slide ${editingSlide ? 'updated' : 'created'} successfully`,
                timer: 1500, showConfirmButton: false, confirmButtonColor: '#3F72AF',
            })
            setShowModal(false)
            setTimeout(() => fetchSlides(), 500)
        } catch (error) {
            console.error('Error saving slide:', error)
            MySwal.fire({ icon: 'error', title: 'Error', text: error.message || 'Failed to save slide', confirmButtonColor: '#3F72AF' })
        } finally {
            setSaving(false)
            setUploading(false)
        }
    }

    const handleDeleteSlide = async (slideId) => {
        const result = await MySwal.fire({
            title: 'Permanently Delete Slide?',
            text: 'This will remove the slide and its image from Cloudinary. This cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, permanently delete',
            cancelButtonText: 'Cancel',
        })
        if (!result.isConfirmed) return
        try {
            const token = await getToken()
            if (!token) throw new Error('Authentication required')
            const response = await fetch(`/api/slider?id=${slideId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data.error || `Server error ${response.status}`)
            }
            MySwal.fire({ icon: 'success', title: 'Deleted!', text: 'Slide permanently deleted', timer: 1500, showConfirmButton: false, confirmButtonColor: '#3F72AF' })
            fetchSlides()
        } catch (error) {
            MySwal.fire({ icon: 'error', title: 'Error', text: error.message || 'Failed to delete slide', confirmButtonColor: '#3F72AF' })
        }
    }

    const handleToggleActive = async (slide) => {
        try {
            const token = await getToken()
            if (!token) throw new Error('Authentication required')
            const response = await fetch(`/api/slider?id=${slide.id}&action=toggle`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            const data = await response.json()
            if (data.success) {
                MySwal.fire({
                    icon: 'success',
                    title: slide.isActive ? 'Deactivated!' : 'Activated!',
                    text: `Slide ${slide.isActive ? 'deactivated' : 'activated'}`,
                    timer: 1500, showConfirmButton: false, confirmButtonColor: '#3F72AF',
                })
                fetchSlides()
            }
        } catch (error) {
            MySwal.fire({ icon: 'error', title: 'Error', text: 'Failed to update slide status', confirmButtonColor: '#3F72AF' })
        }
    }

    const handleReorder = async (index, direction) => {
        const newOrder = [...slides]
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= newOrder.length) return
            ;[newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]]
        const updatedSlides = newOrder.map((s, idx) => ({ ...s, order: idx }))
        setSlides(updatedSlides)
        try {
            const token = await getToken()
            if (!token) throw new Error('Authentication required')
            const reorderData = {
                action: 'reorder',
                slides: newOrder.map((s, idx) => ({ id: s.id, order: idx })),
            }
            const response = await fetch('/api/slider', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(reorderData),
            })
            if (!response.ok) throw new Error('Reorder failed')
        } catch (error) {
            console.error('Error reordering:', error)
            fetchSlides()
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#3F72AF] mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading slides...</p>
                </div>
            </div>
        )
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Hero Sliders</h2>
                    <p className="text-gray-600 mt-1">Manage homepage slider images and links</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#3F72AF] to-[#2D5F8A] text-white rounded-lg hover:from-[#2D5F8A] hover:to-[#1E4D6D] transition-all shadow-md"
                >
                    <Plus size={18} />
                    Add Slide
                </button>
            </div>

            {/* Slides List */}
            {slides.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                    <ImageIcon size={64} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-xl text-gray-500 font-medium">No slides yet</p>
                    <button
                        onClick={openCreateModal}
                        className="mt-4 px-6 py-2 bg-[#3F72AF] text-white rounded-lg hover:bg-[#2D5F8A] transition-colors"
                    >
                        Create Your First Slide
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {slides.map((slide, index) => {
                        const imgSrc = typeof slide.image === 'string' ? slide.image : (slide.image?.url || null)
                        return (
                            <motion.div
                                key={slide.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
                            >
                                <div className="p-4">
                                    <div className="flex gap-4">
                                        {/* Thumbnail */}
                                        <div className="flex-shrink-0 w-44">
                                            {imgSrc ? (
                                                <img src={imgSrc} alt="Slide" className="w-full h-28 object-cover rounded-lg border border-gray-200" />
                                            ) : (
                                                <div className="w-full h-28 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                                                    <ImageIcon size={32} className="text-gray-400" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                                                        Slide #{index + 1}
                                                    </h3>
                                                    {slide.link ? (
                                                        <a
                                                            href={slide.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm text-[#3F72AF] hover:underline truncate block"
                                                        >
                                                            {slide.link}
                                                        </a>
                                                    ) : (
                                                        <p className="text-sm text-gray-400 italic">No link set</p>
                                                    )}
                                                </div>
                                                <span className={`ml-3 px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${slide.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {slide.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => openEditModal(slide)}
                                                className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors text-sm flex items-center gap-1"
                                            >
                                                <Edit2 size={14} /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleToggleActive(slide)}
                                                className={`px-3 py-1.5 rounded transition-colors text-sm flex items-center gap-1 ${slide.isActive ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                                            >
                                                {slide.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                                {slide.isActive ? 'Hide' : 'Show'}
                                            </button>
                                            <button
                                                onClick={() => handleReorder(index, 'up')}
                                                disabled={index === 0}
                                                className="p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ArrowUp size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleReorder(index, 'down')}
                                                disabled={index === slides.length - 1}
                                                className="p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ArrowDown size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSlide(slide.id)}
                                                className="px-3 py-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors text-sm flex items-center gap-1"
                                            >
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
            )}

            {/* ── Create/Edit Modal ── */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.97, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.97, opacity: 0, y: 10 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-[#3F72AF] to-[#2D5F8A] text-white p-5 flex items-center justify-between">
                                <h2 className="text-xl font-bold">
                                    {editingSlide ? '✏️ Edit Slider' : '✨ Create New Slider'}
                                </h2>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                    <X size={22} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveSlide} className="p-6 space-y-5">

                                {/* Image Upload */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-2">
                                        🖼️ Slider Image {!editingSlide && <span className="text-red-500">*</span>}
                                    </label>
                                    <div
                                        className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer hover:border-[#3F72AF] hover:bg-blue-50 transition-all"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {imagePreview ? (
                                            <div className="space-y-3">
                                                <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg shadow" />
                                                <div className="flex gap-2 justify-center">
                                                    <button type="button" onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                                                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                                                        Change Image
                                                    </button>
                                                    <button type="button" onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(null) }}
                                                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700">
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-8 space-y-2">
                                                <Upload size={36} className="mx-auto text-gray-400" />
                                                <p className="font-semibold text-gray-600 text-sm">Click to upload image</p>
                                                <p className="text-xs text-gray-400">PNG, JPG, WebP — up to 100MB</p>
                                            </div>
                                        )}
                                        <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageSelect} className="hidden" />
                                    </div>
                                </div>

                                {/* Link */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-2">
                                        🔗 Slide Link <span className="font-normal text-gray-400 text-xs">(clicking the slider goes here)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.link}
                                        onChange={e => set('link', e.target.value)}
                                        placeholder="https://example.com/products (optional)"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3F72AF]"
                                    />
                                </div>

                                {/* Active toggle */}
                                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={formData.isActive}
                                        onChange={e => set('isActive', e.target.checked)}
                                        className="w-5 h-5 rounded cursor-pointer accent-[#3F72AF]"
                                    />
                                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                                        Publish immediately when saved
                                    </label>
                                </div>

                                {/* Save / Cancel */}
                                <div className="flex gap-3 pt-2 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving || uploading}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#3F72AF] to-[#2D5F8A] text-white rounded-lg font-semibold hover:from-[#2D5F8A] hover:to-[#1E4D6D] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                                    >
                                        <Save size={18} />
                                        {saving ? 'Saving...' : uploading ? 'Uploading image...' : editingSlide ? 'Update Slider' : 'Create Slider'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
