'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2, FolderOpen } from 'lucide-react'

export default function CategoryBannerManager({ getToken }) {
    const [categories, setCategories] = useState([])
    const [banners, setBanners] = useState({}) // { categoryName: bannerDoc }
    const [loadingCats, setLoadingCats] = useState(true)
    const [loadingBanners, setLoadingBanners] = useState(true)

    // UI state per category
    const [previews, setPreviews] = useState({}) // { cat: dataUrl }
    const [selectedFiles, setSelectedFiles] = useState({}) // { cat: File }
    const [uploading, setUploading] = useState({}) // { cat: bool }
    const [deleting, setDeleting] = useState({}) // { cat: bool }
    const [toast, setToast] = useState(null)
    const fileRefs = useRef({})

    const showToast = (type, message) => {
        setToast({ type, message })
        setTimeout(() => setToast(null), 4000)
    }

    // Load all categories
    useEffect(() => {
        setLoadingCats(true)
        fetch('/api/category')
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then((data) => setCategories(data.categories || []))
            .catch(() => showToast('error', 'Failed to load categories'))
            .finally(() => setLoadingCats(false))
    }, [])

    // Load all existing banners
    useEffect(() => {
        setLoadingBanners(true)
        fetch('/api/category-banner')
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then((data) => {
                const map = {}
                for (const b of data.banners || []) map[b.category] = b
                setBanners(map)
            })
            .catch(() => showToast('error', 'Failed to load banners'))
            .finally(() => setLoadingBanners(false))
    }, [])

    const handleFileSelect = (catName, e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setSelectedFiles((prev) => ({ ...prev, [catName]: file }))
        const reader = new FileReader()
        reader.onload = (ev) => setPreviews((prev) => ({ ...prev, [catName]: ev.target.result }))
        reader.readAsDataURL(file)
    }

    const handleUpload = async (catName) => {
        const file = selectedFiles[catName]
        if (!file) return
        setUploading((prev) => ({ ...prev, [catName]: true }))
        try {
            const token = await getToken()
            const formData = new FormData()
            formData.append('category', catName)
            formData.append('image', file)

            const res = await fetch('/api/category-banner', {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Upload failed')

            setBanners((prev) => ({ ...prev, [catName]: data.banner }))
            setPreviews((prev) => { const n = { ...prev }; delete n[catName]; return n })
            setSelectedFiles((prev) => { const n = { ...prev }; delete n[catName]; return n })
            if (fileRefs.current[catName]) fileRefs.current[catName].value = ''
            showToast('success', `Banner for "${catName}" uploaded!`)
        } catch (err) {
            showToast('error', err.message || 'Upload failed')
        } finally {
            setUploading((prev) => ({ ...prev, [catName]: false }))
        }
    }

    const handleDelete = async (catName) => {
        if (!window.confirm(`Remove banner for "${catName}"?`)) return
        setDeleting((prev) => ({ ...prev, [catName]: true }))
        try {
            const token = await getToken()
            const res = await fetch(`/api/category-banner?category=${encodeURIComponent(catName)}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Delete failed')

            setBanners((prev) => { const n = { ...prev }; delete n[catName]; return n })
            showToast('success', `Banner for "${catName}" removed.`)
        } catch (err) {
            showToast('error', err.message || 'Delete failed')
        } finally {
            setDeleting((prev) => ({ ...prev, [catName]: false }))
        }
    }

    const handleCancel = (catName) => {
        setPreviews((prev) => { const n = { ...prev }; delete n[catName]; return n })
        setSelectedFiles((prev) => { const n = { ...prev }; delete n[catName]; return n })
        if (fileRefs.current[catName]) fileRefs.current[catName].value = ''
    }

    return (
        <div className="max-w-3xl">
            {/* Toast */}
            {toast && (
                <div className={`flex items-center gap-3 px-5 py-3 text-sm font-medium rounded-xl mb-4 ${toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {toast.message}
                </div>
            )}

            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Category Hero Banners</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Upload a hero banner image for each category. This replaces the gradient in the Products page banner. If no image is set, the gradient fallback is used.
                </p>
            </div>

            {loadingCats || loadingBanners ? (
                <div className="flex items-center justify-center h-40">
                    <Loader2 className="animate-spin text-gray-400" size={28} />
                </div>
            ) : categories.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <FolderOpen size={36} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No categories found.</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {categories.map((cat) => {
                        const catName = cat.name
                        const banner = banners[catName]
                        const preview = previews[catName]
                        const file = selectedFiles[catName]
                        const isUploading = uploading[catName]
                        const isDeleting = deleting[catName]

                        return (
                            <div key={cat._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900">{catName}</h3>
                                        {banner ? (
                                            <span className="text-[11px] text-green-600 font-medium">✓ Banner set</span>
                                        ) : (
                                            <span className="text-[11px] text-gray-400">Gradient fallback active</span>
                                        )}
                                    </div>
                                    {banner && (
                                        <button
                                            onClick={() => handleDelete(catName)}
                                            disabled={isDeleting}
                                            className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                            Remove
                                        </button>
                                    )}
                                </div>

                                <div className="px-6 py-4 space-y-3">
                                    {/* Current banner */}
                                    {banner?.image && !preview && (
                                        <div>
                                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Current</p>
                                            <img
                                                src={banner.image}
                                                alt={catName}
                                                className="w-full h-[106px] min-[640px]:h-[141px] object-cover rounded-lg border border-gray-100"
                                            />
                                        </div>
                                    )}

                                    {/* Preview of selected file */}
                                    {preview && (
                                        <div>
                                            <p className="text-[11px] font-semibold text-orange-500 uppercase tracking-wide mb-2">Preview (not uploaded yet)</p>
                                            <div className="relative rounded-lg overflow-hidden border border-[#F47B20]/40">
                                                <img src={preview} alt="preview" className="w-full h-[106px] min-[640px]:h-[141px] object-cover" />
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-1">{file?.name} ({(file?.size / 1024 / 1024).toFixed(2)} MB)</p>
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    onClick={() => handleUpload(catName)}
                                                    disabled={isUploading}
                                                    className="flex items-center gap-1.5 bg-[#F47B20] hover:bg-[#C45A00] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
                                                >
                                                    {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                                                    {isUploading ? 'Uploading...' : 'Upload Banner'}
                                                </button>
                                                <button
                                                    onClick={() => handleCancel(catName)}
                                                    disabled={isUploading}
                                                    className="text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* File selector */}
                                    {!preview && (
                                        <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-[#F47B20] hover:bg-orange-50 transition-all group">
                                            <ImageIcon size={18} className="text-gray-300 group-hover:text-[#F47B20] flex-shrink-0 transition-colors" />
                                            <div>
                                                <p className="text-xs font-medium text-gray-400 group-hover:text-[#F47B20] transition-colors">
                                                    {banner ? 'Replace banner image' : 'Select banner image'}
                                                </p>
                                                <p className="text-[10px] text-gray-300">Recommended: 1440×160px or wider. Max 100MB.</p>
                                            </div>
                                            <input
                                                ref={(el) => { fileRefs.current[catName] = el }}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleFileSelect(catName, e)}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
