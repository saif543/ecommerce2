'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function PromoBannerManager({ getToken }) {
    const [form, setForm] = useState({
        badge: '',
        title: '',
        highlight: '',
        description: '',
        primaryButtonText: '',
        primaryButtonLink: '',
        secondaryButtonText: '',
        secondaryButtonLink: '',
        active: true,
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState(null)

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
            const res = await fetch('/api/promo-banner')
            if (res.ok) {
                const data = await res.json()
                if (data.banner) {
                    setForm({
                        badge: data.banner.badge || '',
                        title: data.banner.title || '',
                        highlight: data.banner.highlight || '',
                        description: data.banner.description || '',
                        primaryButtonText: data.banner.primaryButtonText || '',
                        primaryButtonLink: data.banner.primaryButtonLink || '',
                        secondaryButtonText: data.banner.secondaryButtonText || '',
                        secondaryButtonLink: data.banner.secondaryButtonLink || '',
                        active: data.banner.active ?? true,
                    })
                }
            }
        } catch (err) {
            console.error('Failed to fetch promo banner:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!form.title.trim()) {
            showToast('error', 'Title is required')
            return
        }
        setSaving(true)
        try {
            const token = await getToken()
            const res = await fetch('/api/promo-banner', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Save failed')
            showToast('success', 'Promo banner saved successfully')
        } catch (err) {
            showToast('error', err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-[#f26e21]" size={28} />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {toast.message}
                </div>
            )}

            {/* Preview */}
            <div className="bg-[#111111] rounded-xl p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 left-1/4 w-32 h-32 bg-[#f26e21]/10 rounded-full blur-[60px] pointer-events-none" />
                <p className="text-[10px] uppercase tracking-wider text-[#f26e21] font-semibold mb-1">
                    {form.badge || 'Badge text'}
                </p>
                <h3 className="text-lg font-bold mb-1">
                    {form.title || 'Title'}{' '}
                    <span className="text-[#f26e21]">{form.highlight || 'Highlight'}</span>
                </h3>
                <p className="text-white/40 text-xs mb-3">
                    {form.description || 'Description text'}
                </p>
                <div className="flex items-center gap-2">
                    {form.primaryButtonText && (
                        <span className="px-3 py-1.5 bg-[#f26e21] text-white text-xs font-semibold rounded-full">
                            {form.primaryButtonText}
                        </span>
                    )}
                    {form.secondaryButtonText && (
                        <span className="px-3 py-1.5 border border-white/20 text-white text-xs font-semibold rounded-full">
                            {form.secondaryButtonText}
                        </span>
                    )}
                </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Promo Banner Content</h3>
                    <button
                        onClick={() => handleChange('active', !form.active)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${form.active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}
                    >
                        {form.active ? <Eye size={14} /> : <EyeOff size={14} />}
                        {form.active ? 'Active' : 'Hidden'}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Badge Text</label>
                        <input
                            type="text"
                            value={form.badge}
                            onChange={e => handleChange('badge', e.target.value)}
                            placeholder="e.g. Limited Time"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f26e21]/20 focus:border-[#f26e21] outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => handleChange('title', e.target.value)}
                            placeholder="e.g. Upgrade Your Tech"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f26e21]/20 focus:border-[#f26e21] outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Highlight Text <span className="text-gray-400">(orange)</span></label>
                        <input
                            type="text"
                            value={form.highlight}
                            onChange={e => handleChange('highlight', e.target.value)}
                            placeholder="e.g. Save Up to 40%"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f26e21]/20 focus:border-[#f26e21] outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <input
                            type="text"
                            value={form.description}
                            onChange={e => handleChange('description', e.target.value)}
                            placeholder="e.g. Premium gadgets at unbeatable prices."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f26e21]/20 focus:border-[#f26e21] outline-none"
                        />
                    </div>
                </div>

                <hr className="border-gray-100" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Primary Button Text</label>
                        <input
                            type="text"
                            value={form.primaryButtonText}
                            onChange={e => handleChange('primaryButtonText', e.target.value)}
                            placeholder="e.g. Shop Now"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f26e21]/20 focus:border-[#f26e21] outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Primary Button Link</label>
                        <input
                            type="text"
                            value={form.primaryButtonLink}
                            onChange={e => handleChange('primaryButtonLink', e.target.value)}
                            placeholder="e.g. /products"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f26e21]/20 focus:border-[#f26e21] outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Button Text</label>
                        <input
                            type="text"
                            value={form.secondaryButtonText}
                            onChange={e => handleChange('secondaryButtonText', e.target.value)}
                            placeholder="e.g. View Trending"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f26e21]/20 focus:border-[#f26e21] outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Button Link</label>
                        <input
                            type="text"
                            value={form.secondaryButtonLink}
                            onChange={e => handleChange('secondaryButtonLink', e.target.value)}
                            placeholder="e.g. /trending"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f26e21]/20 focus:border-[#f26e21] outline-none"
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#f26e21] text-white text-sm font-semibold rounded-lg hover:bg-[#e05e15] disabled:opacity-50 transition-colors"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? 'Saving...' : 'Save Banner'}
                    </button>
                </div>
            </div>
        </div>
    )
}
