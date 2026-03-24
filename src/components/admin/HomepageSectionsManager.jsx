'use client'

import { useState, useEffect } from 'react'
import {
    Plus, Trash2, Save, ChevronUp, ChevronDown, Eye, EyeOff,
    GripVertical, Loader2, CheckCircle2, AlertCircle, Video, LayoutList
} from 'lucide-react'
import Swal from 'sweetalert2'

const FLAG_OPTIONS = [
    { value: 'isLovedProduct=true', label: 'Most Loved Products' },
    { value: 'isNewArrival=true', label: 'New Arrivals' },
    { value: 'isTrending=true', label: 'Trending Products' },
]

const BG_OPTIONS = [
    { value: 'bg-white', label: 'White' },
    { value: 'bg-offwhite', label: 'Off White' },
]

function Toast({ toast }) {
    if (!toast) return null
    return (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium mb-4 ${toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {toast.message}
        </div>
    )
}

function SectionCard({ section, index, total, onUpdate, onDelete, onMove, categories }) {
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState(null)
    const [form, setForm] = useState({ ...section })

    const showToast = (type, message) => {
        setToast({ type, message })
        setTimeout(() => setToast(null), 4000)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await onUpdate(form)
            setEditing(false)
            showToast('success', 'Section saved!')
        } catch (err) {
            showToast('error', err.message || 'Save failed')
        } finally {
            setSaving(false)
        }
    }

    const handleToggle = async () => {
        try {
            await onUpdate({ ...section, isActive: !section.isActive })
        } catch (err) {
            showToast('error', 'Toggle failed')
        }
    }

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

    return (
        <div className={`bg-white rounded-xl border ${section.isActive ? 'border-gray-200' : 'border-gray-100 opacity-60'} overflow-hidden mb-4`}>
            <Toast toast={toast} />
            {/* Header row */}
            <div className="px-5 py-4 flex items-center gap-3">
                <GripVertical size={16} className="text-gray-300 flex-shrink-0" />
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => onMove(index, -1)} disabled={index === 0} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"><ChevronUp size={14} /></button>
                    <button onClick={() => onMove(index, 1)} disabled={index === total - 1} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"><ChevronDown size={14} /></button>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{section.title}</p>
                    <p className="text-xs text-gray-400 truncate">{section.filterType === 'flag' ? `Flag: ${section.filterValue}` : `Category: ${section.filterValue}`} · {section.productLimit} products</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={handleToggle} title={section.isActive ? 'Hide' : 'Show'} className="p-1.5 rounded hover:bg-gray-100">
                        {section.isActive ? <Eye size={16} className="text-green-600" /> : <EyeOff size={16} className="text-gray-400" />}
                    </button>
                    <button onClick={() => setEditing(e => !e)} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 font-medium">
                        {editing ? 'Cancel' : 'Edit'}
                    </button>
                    <button onClick={() => onDelete(section.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500">
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            {/* Edit panel */}
            {editing && (
                <div className="border-t border-gray-100 px-5 py-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Section Title</label>
                            <input value={form.title} onChange={e => set('title', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f26e21]" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Subtitle</label>
                            <input value={form.subtitle} onChange={e => set('subtitle', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f26e21]" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Filter Type</label>
                            <select value={form.filterType} onChange={e => set('filterType', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f26e21]">
                                <option value="flag">Flag (Most Loved / New Arrival / Trending)</option>
                                <option value="category">Category</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                {form.filterType === 'flag' ? 'Select Flag' : 'Category Name'}
                            </label>
                            {form.filterType === 'flag' ? (
                                <select value={form.filterValue} onChange={e => set('filterValue', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f26e21]">
                                    {FLAG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            ) : (
                                <select value={form.filterValue} onChange={e => set('filterValue', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f26e21]">
                                    <option value="">-- Select Category --</option>
                                    {categories.map(c => <option key={c._id || c.name} value={c.name}>{c.name}</option>)}
                                </select>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Product Limit (4–20)</label>
                            <input type="number" min={4} max={20} value={form.productLimit} onChange={e => set('productLimit', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f26e21]" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Background</label>
                            <select value={form.bg} onChange={e => set('bg', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f26e21]">
                                {BG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 bg-[#f26e21] hover:bg-[#C45A00] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60">
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        {saving ? 'Saving...' : 'Save Section'}
                    </button>
                </div>
            )}
        </div>
    )
}

export default function HomepageSectionsManager({ getToken }) {
    const [sections, setSections] = useState([])
    const [video, setVideo] = useState({ youtubeUrl: '', title: 'Watch & Explore', subtitle: 'See our products in action', isActive: true })
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [addingSection, setAddingSection] = useState(false)
    const [savingVideo, setSavingVideo] = useState(false)
    const [videoToast, setVideoToast] = useState(null)

    const showVideoToast = (type, message) => {
        setVideoToast({ type, message })
        setTimeout(() => setVideoToast(null), 4000)
    }

    useEffect(() => {
        Promise.all([
            fetch('/api/homepage-sections').then(r => r.json()),
            fetch('/api/category').then(r => r.json()),
        ]).then(([sectionData, catData]) => {
            setSections(sectionData.sections || [])
            if (sectionData.video) setVideo(sectionData.video)
            setCategories(catData.categories || [])
        }).catch(console.error).finally(() => setLoading(false))
    }, [])

    const saveSection = async (sectionData) => {
        const token = await getToken()
        const res = await fetch('/api/homepage-sections', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(sectionData),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Save failed')
        setSections(prev => {
            const idx = prev.findIndex(s => s.id === data.section.id)
            if (idx === -1) return [...prev, data.section]
            const updated = [...prev]
            updated[idx] = data.section
            return updated
        })
        return data.section
    }

    const deleteSection = async (id) => {
        const confirm = await Swal.fire({
            title: 'Delete Section?',
            text: 'This will permanently remove this section from the homepage.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, delete it',
        })
        if (!confirm.isConfirmed) return
        const token = await getToken()
        const res = await fetch(`/api/homepage-sections?id=${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete section', confirmButtonColor: '#f26e21' })
        setSections(prev => prev.filter(s => s.id !== id))
    }

    const moveSection = async (index, dir) => {
        const newSections = [...sections]
        const target = index + dir
        if (target < 0 || target >= newSections.length) return
        ;[newSections[index], newSections[target]] = [newSections[target], newSections[index]]
        // Reassign order
        const token = await getToken()
        const updated = newSections.map((s, i) => ({ ...s, order: i }))
        setSections(updated)
        await Promise.all(updated.map(s =>
            fetch('/api/homepage-sections', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ id: s.id, order: s.order }),
            })
        ))
    }

    const addNewSection = async () => {
        setAddingSection(true)
        try {
            const newSection = await saveSection({
                title: 'New Section',
                subtitle: 'Explore our collection',
                filterType: 'flag',
                filterValue: 'isLovedProduct=true',
                productLimit: 8,
                bg: 'bg-white',
                sectionBannerKey: '',
                bannerGradient: 'linear-gradient(135deg, #111111 0%, #1a1a1a 40%, #222222 100%)',
                isActive: false,
                order: sections.length,
            })
            setSections(prev => [...prev.filter(s => s.id !== newSection.id), newSection])
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, confirmButtonColor: '#f26e21' })
        } finally {
            setAddingSection(false)
        }
    }

    const saveVideoConfig = async () => {
        setSavingVideo(true)
        try {
            const token = await getToken()
            const res = await fetch('/api/homepage-sections', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ type: 'video', ...video }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Save failed')
            setVideo(data.video)
            showVideoToast('success', 'Video settings saved!')
        } catch (err) {
            showVideoToast('error', err.message || 'Save failed')
        } finally {
            setSavingVideo(false)
        }
    }

    if (loading) return (
        <div className="flex justify-center items-center h-48">
            <Loader2 className="animate-spin text-[#f26e21]" size={32} />
        </div>
    )

    return (
        <div className="max-w-3xl space-y-10">
            {/* ── Product Sections ── */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <LayoutList size={20} className="text-[#f26e21]" /> Homepage Product Sections
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Add, reorder, edit, or hide the product sections displayed on the homepage.
                        </p>
                    </div>
                    <button onClick={addNewSection} disabled={addingSection}
                        className="flex items-center gap-2 bg-[#f26e21] hover:bg-[#C45A00] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60 flex-shrink-0">
                        {addingSection ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                        Add Section
                    </button>
                </div>

                {sections.length === 0 ? (
                    <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-10 text-center">
                        <LayoutList size={28} className="text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">No sections configured. Click <strong>Add Section</strong> to begin.</p>
                    </div>
                ) : (
                    sections.map((section, i) => (
                        <SectionCard
                            key={section.id}
                            section={section}
                            index={i}
                            total={sections.length}
                            onUpdate={saveSection}
                            onDelete={deleteSection}
                            onMove={moveSection}
                            categories={categories}
                        />
                    ))
                )}
            </div>

            {/* ── Video Section ── */}
            <div className="border-t border-gray-200 pt-10">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Video size={20} className="text-[#f26e21]" /> Watch & Explore — Video Section
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Set a YouTube video that plays inline on the homepage. Paste any YouTube URL or share link.
                    </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <Toast toast={videoToast} />

                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Video Section</label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-xs text-gray-500">{video.isActive ? 'Visible' : 'Hidden'}</span>
                            <div
                                onClick={() => setVideo(v => ({ ...v, isActive: !v.isActive }))}
                                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${video.isActive ? 'bg-[#f26e21]' : 'bg-gray-200'}`}
                            >
                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${video.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                        </label>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">YouTube URL</label>
                        <input
                            type="url"
                            value={video.youtubeUrl}
                            onChange={e => setVideo(v => ({ ...v, youtubeUrl: e.target.value }))}
                            placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f26e21]"
                        />
                        <p className="text-xs text-gray-400 mt-1">Supports youtube.com/watch?v=, youtu.be/, and youtube.com/embed/ formats.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Section Title</label>
                            <input
                                value={video.title}
                                onChange={e => setVideo(v => ({ ...v, title: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f26e21]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Subtitle</label>
                            <input
                                value={video.subtitle}
                                onChange={e => setVideo(v => ({ ...v, subtitle: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f26e21]"
                            />
                        </div>
                    </div>

                    <button onClick={saveVideoConfig} disabled={savingVideo}
                        className="flex items-center gap-2 bg-[#f26e21] hover:bg-[#C45A00] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60">
                        {savingVideo ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        {savingVideo ? 'Saving...' : 'Save Video Settings'}
                    </button>
                </div>
            </div>
        </div>
    )
}
