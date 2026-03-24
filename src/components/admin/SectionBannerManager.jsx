'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

const SECTIONS = [
    {
        key: 'most-loved',
        label: 'Most Loved Products Banner',
        description: 'Displayed above the "Most Loved Products" section on the homepage.',
        fallbackGradient: 'linear-gradient(135deg, #111111 0%, #1a1a1a 40%, #222222 100%)',
    },
    {
        key: 'new-arrivals',
        label: 'New Arrivals Banner',
        description: 'Displayed above the "New Arrivals" section on the homepage.',
        fallbackGradient: 'linear-gradient(135deg, #0f0f0f 0%, #1a2a1a 40%, #2d6a4f 100%)',
    },
    {
        key: 'headphones',
        label: 'Headphones Banner',
        description: 'Displayed above the "Headphones" section on the homepage.',
        fallbackGradient: 'linear-gradient(135deg, #222222 0%, #1a1a1a 40%, #111111 100%)',
    },
]

function SectionBanner({ section, getToken }) {
    const [banner, setBanner] = useState(null)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [preview, setPreview] = useState(null)
    const [selectedFile, setSelectedFile] = useState(null)
    const [toast, setToast] = useState(null)
    const fileRef = useRef(null)

    const showToast = (type, message) => {
        setToast({ type, message })
        setTimeout(() => setToast(null), 4000)
    }

    useEffect(() => {
        fetchBanner()
    }, [])

    const fetchBanner = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/section-banner?section=${encodeURIComponent(section.key)}`)
            if (res.ok) {
                const data = await res.json()
                setBanner(data.banner || null)
            }
        } catch (err) {
            console.error('Failed to fetch banner:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setSelectedFile(file)
        const reader = new FileReader()
        reader.onload = (ev) => setPreview(ev.target.result)
        reader.readAsDataURL(file)
    }

    const handleUpload = async () => {
        if (!selectedFile) return
        setUploading(true)
        try {
            const token = await getToken()
            const formData = new FormData()
            formData.append('section', section.key)
            formData.append('image', selectedFile)

            const res = await fetch('/api/section-banner', {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Upload failed')

            setBanner(data.banner)
            setPreview(null)
            setSelectedFile(null)
            if (fileRef.current) fileRef.current.value = ''
            showToast('success', 'Banner uploaded successfully!')
        } catch (err) {
            showToast('error', err.message || 'Upload failed')
        } finally {
            setUploading(false)
        }
    }

    const handleDelete = async () => {
        if (!banner) return
        if (!window.confirm(`Delete the banner image for "${section.label}"?`)) return
        setDeleting(true)
        try {
            const token = await getToken()
            const res = await fetch(`/api/section-banner?section=${encodeURIComponent(section.key)}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Delete failed')

            setBanner(null)
            showToast('success', 'Banner removed. Gradient fallback is now active.')
        } catch (err) {
            showToast('error', err.message || 'Delete failed')
        } finally {
            setDeleting(false)
        }
    }

    const handleCancel = () => {
        setPreview(null)
        setSelectedFile(null)
        if (fileRef.current) fileRef.current.value = ''
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6 last:mb-0">
            {/* Toast */}
            {toast && (
                <div className={`flex items-center gap-3 px-5 py-3 text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-700 border-b border-green-100' : 'bg-red-50 text-red-700 border-b border-red-100'}`}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {toast.message}
                </div>
            )}

            <div className="px-6 py-5 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-900">{section.label}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>
            </div>

            {/* Current Banner Preview */}
            <div className="px-6 py-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Current Banner</p>

                {loading ? (
                    <div className="flex items-center justify-center h-32 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <Loader2 size={22} className="animate-spin text-gray-400" />
                    </div>
                ) : banner?.image ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200 group">
                        <img
                            src={banner.image}
                            alt={section.label}
                            className="w-full h-24 min-[480px]:h-28 min-[640px]:h-32 min-[768px]:h-36 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-lg disabled:opacity-60"
                            >
                                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                Remove Banner
                            </button>
                        </div>
                    </div>
                ) : (
                    <div
                        className="w-full h-24 min-[480px]:h-28 min-[640px]:h-32 rounded-xl flex items-center justify-center border border-dashed border-gray-300"
                        style={{ background: section.fallbackGradient }}
                    >
                        <div className="bg-black/40 text-white px-4 py-2 rounded-lg text-xs font-medium backdrop-blur-sm">
                            Gradient Fallback (Active)
                        </div>
                    </div>
                )}
            </div>

            {/* Upload New */}
            <div className="px-6 pb-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    {banner?.image ? 'Replace Banner' : 'Upload Banner Image'}
                </p>

                {preview ? (
                    <div className="space-y-3">
                        <div className="relative rounded-xl overflow-hidden border border-[#F47B20]/40">
                            <img src={preview} alt="Preview" className="w-full h-24 min-[480px]:h-28 min-[640px]:h-32 object-cover" />
                            <div className="absolute top-2 left-2 bg-[#F47B20] text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                                Preview
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">{selectedFile?.name} ({(selectedFile?.size / 1024 / 1024).toFixed(2)} MB)</p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="flex items-center gap-2 bg-[#F47B20] hover:bg-[#C45A00] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60 flex-1 justify-center"
                            >
                                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                {uploading ? 'Uploading...' : 'Upload Banner'}
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={uploading}
                                className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#F47B20] hover:bg-orange-50 transition-all group">
                        <ImageIcon size={24} className="text-gray-300 group-hover:text-[#F47B20] transition-colors mb-2" />
                        <span className="text-xs font-medium text-gray-400 group-hover:text-[#F47B20] transition-colors">
                            Click to select image
                        </span>
                        <span className="text-[10px] text-gray-300 mt-0.5">Recommended: 1440×160px or wider. Max 100MB.</span>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                    </label>
                )}
            </div>
        </div>
    )
}

export default function SectionBannerManager({ getToken }) {
    return (
        <div className="max-w-3xl">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Section Banners</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Upload banner images for homepage product sections. If no image is set, the gradient fallback is shown automatically.
                </p>
            </div>
            {SECTIONS.map((section) => (
                <SectionBanner key={section.key} section={section} getToken={getToken} />
            ))}
        </div>
    )
}
