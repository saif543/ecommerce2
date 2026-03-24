'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Swal from 'sweetalert2'
import {
    Plus,
    Search,
    Filter,
    Edit2,
    Trash2,
    Eye,
    X,
    Upload,
    Save,
    Image as ImageIcon,
    Package,
    DollarSign,
    Tag,
    BarChart3,
    AlertCircle,
    ChevronUp,
    ChevronDown,
    GripVertical,
    FileText
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import CategoryManager from '@/components/admin/CategoryManager'

const MySwal = Swal

export default function ProductManager({ getToken }) {
    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState([])
    const [filteredProducts, setFilteredProducts] = useState([])
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 })
    const [showModal, setShowModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)
    const [saving, setSaving] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [selectedProducts, setSelectedProducts] = useState([])
    const [categories, setCategories] = useState([])  // loaded from /api/category
    const [brands, setBrands] = useState([])            // loaded from /api/brand
    const [newCategoryName, setNewCategoryName] = useState('')
    const [newSubcategoryName, setNewSubcategoryName] = useState('')
    const [subTab, setSubTab] = useState('products') // 'products' | 'categories'

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        brand: '',
        category: { main: '', sub: '' },
        sku: '',
        condition: 'new',
        pricing: {
            regularPrice: 0,
            salePrice: 0,      // sale price offered to customer → saved as 'discount' in DB
            costPerItem: 0     // what admin paid → saved as 'originalPrice' in DB
        },
        inventory: {
            totalStock: 0,
            lowStockThreshold: 10,
            trackInventory: true
        },
        images: [],
        status: 'draft',
        isNewArrival: false,
        isLovedProduct: false,
        isTrending: false,
        features: [],
        specifications: {},
        customFields: {}
    })

    // Description sections: each has { id, title, body, imageUrl, imagePublicId, _localFile, _localPreview }
    const [descSections, setDescSections] = useState([])
    const descImageRefs = useRef({}) // keyed by section id

    // Features helpers
    const [newFeature, setNewFeature] = useState('')

    // Specifications helpers — flat array of { key, value } pairs (no sections)
    const [specPairs, setSpecPairs] = useState([{ key: '', value: '' }])

    // Custom fields helpers
    const [customFieldKey, setCustomFieldKey] = useState('')
    const [customFieldValue, setCustomFieldValue] = useState('')

    // Build flat specifications object for API: { "Brand": "Samsung", "Model": "Galaxy" }
    const buildSpecificationsObject = (pairs) => {
        const result = {}
        for (const pair of pairs) {
            if (pair.key && pair.key.trim()) result[pair.key.trim()] = pair.value
        }
        return result
    }

    // Parse DB spec object → flat pairs array for editing
    const parseSpecPairs = (specs) => {
        if (!specs || typeof specs !== 'object') return [{ key: '', value: '' }]
        const entries = Object.entries(specs).flatMap(([k, v]) => {
            if (typeof v === 'object' && !Array.isArray(v)) {
                // Flatten nested section objects into flat pairs
                return Object.entries(v).map(([sk, sv]) => ({ key: sk, value: String(sv) }))
            }
            return [{ key: k, value: String(v) }]
        })
        return entries.length > 0 ? entries : [{ key: '', value: '' }]
    }

    const [imageFiles, setImageFiles] = useState([])
    const [imagePreviews, setImagePreviews] = useState([])
    const fileInputRef = useRef(null)
    const [showCustomCategory, setShowCustomCategory] = useState(false)
    const [showCustomSubcategory, setShowCustomSubcategory] = useState(false)

    // Get subcategories for the selected main category (from API data)
    const getAllSubcategories = (mainCategoryName) => {
        if (!mainCategoryName) return []
        const cat = categories.find(c => c.name === mainCategoryName)
        return cat ? (cat.subcategories || []) : []
    }

    useEffect(() => {
        fetchProducts()
        fetchCategories()
        fetchBrands()
    }, [pagination.page])

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/category')
            const data = await res.json()
            if (data.categories) setCategories(data.categories)
        } catch (err) {
            console.error('Failed to load categories:', err)
        }
    }

    const fetchBrands = async () => {
        try {
            const res = await fetch('/api/brand')
            const data = await res.json()
            if (data.brands) setBrands(data.brands)
        } catch (err) {
            console.error('Failed to load brands:', err)
        }
    }

    useEffect(() => {
        applyFilters()
    }, [searchTerm, filterStatus, products])

    const fetchProducts = async () => {
        try {
            setLoading(true)
            const token = await getToken()

            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit
            })

            if (filterStatus !== 'all') {
                params.append('status', filterStatus)
            }

            const response = await fetch(`/api/product?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            const result = await response.json()

            if (result.success) {
                setProducts(result.products || [])
                setPagination(result.pagination)
            }
        } catch (error) {
            console.error('Error fetching products:', error)
            MySwal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load products',
                confirmButtonColor: '#F47B20',
            })
        } finally {
            setLoading(false)
        }
    }

    const applyFilters = () => {
        let filtered = [...products]

        if (searchTerm) {
            filtered = filtered.filter(product =>
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        if (filterStatus !== 'all') {
            filtered = filtered.filter(product => product.status === filterStatus)
        }

        setFilteredProducts(filtered)
    }

    const openCreateModal = async () => {
        // Always fetch fresh categories and brands from DB before opening modal
        await Promise.all([fetchCategories(), fetchBrands()])
        setEditingProduct(null)
        setFormData({
            name: '',
            slug: '',
            description: '',
            brand: '',
            category: { main: '', sub: '' },
            sku: '',
            condition: 'new',
            pricing: { regularPrice: 0, salePrice: 0, costPerItem: 0 },
            inventory: { totalStock: 0, lowStockThreshold: 10, trackInventory: true },
            images: [],
            status: 'draft',
            isNewArrival: false,
            isLovedProduct: false,
            isTrending: false,
            features: [],
            specifications: {},
            customFields: {}
        })
        setDescSections([])
        setImageFiles([])
        setImagePreviews([])
        setSpecPairs([{ key: '', value: '' }])
        setNewFeature('')
        setNewCategoryName('')
        setNewSubcategoryName('')
        setCustomFieldKey('')
        setCustomFieldValue('')
        setShowCustomCategory(false)
        setShowCustomSubcategory(false)
        setShowModal(true)
    }

    const openEditModal = async (product) => {
        // Always fetch fresh categories and brands from DB before opening
        await Promise.all([fetchCategories(), fetchBrands()])
        setEditingProduct(product)
        const parsedSpecs = parseSpecPairs(product.specifications)
        setFormData({
            name: product.name || '',
            slug: product.slug || '',
            description: product.description || '',
            brand: product.brand || '',
            category: typeof product.category === 'string'
                ? { main: product.category, sub: product.subcategory || '' }
                : (product.category || { main: '', sub: '' }),
            sku: product.sku || '',
            condition: product.condition || 'new',
            pricing: {
                regularPrice: product.price || 0,
                salePrice: product.discount || 0,      // discount field = sale price
                costPerItem: product.originalPrice || 0  // originalPrice field = cost per item
            },
            inventory: product.inventory || {
                totalStock: product.stockQty || 0,
                lowStockThreshold: 10,
                trackInventory: true
            },
            images: product.images || [],
            status: product.status || (product.isActive ? 'active' : 'draft'),
            isNewArrival: product.isNewArrival || false,
            isLovedProduct: product.isLovedProduct || false,
            isTrending: product.isTrending || false,
            features: product.features || [],
            specifications: product.specifications || {},
            customFields: product.customFields || {}
        })
        // Populate description sections from saved product
        const savedDesc = Array.isArray(product.descriptions) ? product.descriptions : []
        setDescSections(savedDesc.map(s => ({ ...s, _localFile: null, _localPreview: null })))
        setSpecPairs(parsedSpecs)
        setNewFeature('')
        setNewCategoryName('')
        setNewSubcategoryName('')
        setCustomFieldKey('')
        setCustomFieldValue('')
        setImagePreviews(product.images?.map(img => img.url) || [])
        setImageFiles([])
        setShowCustomCategory(false)
        setShowCustomSubcategory(false)
        setShowModal(true)
    }

    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        const newFiles = [...imageFiles, ...files].slice(0, 20)
        setImageFiles(newFiles)

        const newPreviews = newFiles.map(file => URL.createObjectURL(file))
        setImagePreviews([...formData.images.map(img => img.url), ...newPreviews].slice(0, 20))
    }

    const removeImage = (index) => {
        const newPreviews = [...imagePreviews]
        newPreviews.splice(index, 1)
        setImagePreviews(newPreviews)

        if (index < formData.images.length) {
            const newImages = [...formData.images]
            newImages.splice(index, 1)
            setFormData({ ...formData, images: newImages })
        } else {
            const fileIndex = index - formData.images.length
            const newFiles = [...imageFiles]
            newFiles.splice(fileIndex, 1)
            setImageFiles(newFiles)
        }
    }

    // Persist a new category name to DB (upsert-style: create if doesn't exist)
    const saveNewCategoryToDb = async (token, categoryName, subcategoryName) => {
        try {
            // Check if category already exists in loaded list
            const existing = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase())
            if (!existing) {
                // Create new category
                const res = await fetch('/api/category', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ name: categoryName })
                })
                const data = await res.json()
                if (data.category && subcategoryName) {
                    // Add subcategory to the newly created category
                    await fetch('/api/category', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ action: 'add-subcategory', categoryId: data.category._id, subcategoryName })
                    })
                }
            } else if (subcategoryName) {
                // Category exists — add subcategory if it doesn't exist
                const subExists = (existing.subcategories || []).some(s => s.name.toLowerCase() === subcategoryName.toLowerCase())
                if (!subExists) {
                    await fetch('/api/category', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ action: 'add-subcategory', categoryId: existing._id, subcategoryName })
                    })
                }
            }
            // Refresh categories list
            fetchCategories()
        } catch (err) {
            console.error('Failed to save category to DB:', err)
        }
    }

    const handleSaveProduct = async (e) => {
        e.preventDefault()

        if (!formData.name || !formData.pricing.regularPrice) {
            MySwal.fire({
                icon: 'warning',
                title: 'Missing Fields',
                text: 'Please fill in product name and price',
                confirmButtonColor: '#F47B20',
            })
            return
        }

        setSaving(true)

        try {
            const token = await getToken()
            if (!token) throw new Error('Authentication required')

            const categoryMain = formData.category.main || ''
            const categorySub = formData.category.sub || ''

            // Persist new category/subcategory to DB so it shows in future dropdowns
            if (categoryMain) {
                await saveNewCategoryToDb(token, categoryMain, categorySub)
            }

            // Build flat spec object from flat pairs (no sections)
            const builtSpecs = buildSpecificationsObject(specPairs)

            const stockQty = parseInt(formData.inventory.totalStock, 10) || 0
            // Determine stock status from quantity
            const stockStatus = stockQty === 0 ? 'out_of_stock' : stockQty <= formData.inventory.lowStockThreshold ? 'limited' : 'in_stock'

            // Capture pending typed values if user forgot to click "Add"
            const finalFeatures = [...formData.features]
            if (newFeature.trim()) finalFeatures.push(newFeature.trim())

            const finalCustomFields = { ...formData.customFields }
            if (customFieldKey.trim()) {
                finalCustomFields[customFieldKey.trim()] = customFieldValue
            }

            // Build descriptions array (strip local-only fields before sending)
            const cleanDescriptions = descSections
                .filter(s => s.title?.trim() || s.body?.trim())
                .map(({ id, title, body, imageUrl, imagePublicId }) => ({
                    id: id || crypto.randomUUID(),
                    title: title || '',
                    body: body || '',
                    imageUrl: imageUrl || null,
                    imagePublicId: imagePublicId || null,
                }))

            const productData = {
                name: formData.name,
                slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
                description: formData.description,
                brand: formData.brand || '',
                category: categoryMain,
                subcategory: categorySub,
                sku: formData.sku,
                condition: formData.condition || 'new',
                // Pricing mapping:
                //   price        = regular selling price
                //   originalPrice = cost per item (what admin paid)
                //   discount     = sale price offered to customer
                price: formData.pricing.regularPrice || 0,
                originalPrice: formData.pricing.costPerItem || 0,
                discount: formData.pricing.salePrice || 0,
                stockQty,
                stock: stockStatus,
                inventory: { ...formData.inventory, totalStock: stockQty },
                isActive: formData.status === 'active',
                status: formData.status,
                isNewArrival: formData.isNewArrival,
                isLovedProduct: formData.isLovedProduct,
                isTrending: formData.isTrending,
                features: finalFeatures,
                specifications: builtSpecs,
                customFields: finalCustomFields,
                descriptions: cleanDescriptions,
            }

            // Helper to upload description section images after product is saved
            const uploadDescriptionImages = async (productId) => {
                const sectionsWithNewImages = descSections.filter(s => s._localFile)
                for (const section of sectionsWithNewImages) {
                    try {
                        const fd = new FormData()
                        fd.append('productId', productId)
                        fd.append('sectionId', section.id)
                        fd.append('image', section._localFile)
                        const res = await fetch('/api/product?action=upload-description-image', {
                            method: 'PUT',
                            headers: { Authorization: `Bearer ${token}` },
                            body: fd,
                        })
                        if (!res.ok) console.error('Failed to upload description image for section', section.id)
                    } catch (err) {
                        console.error('Error uploading description image:', err)
                    }
                }
            }

            const uploadImages = async (productId) => {
                if (imageFiles.length === 0) return
                const imageFormData = new FormData()
                imageFormData.append('productId', productId)
                imageFiles.forEach(file => {
                    imageFormData.append('files', file)
                })
                await fetch('/api/product?action=upload-images', {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}` },
                    body: imageFormData,
                })
            }

            if (editingProduct) {
                // 1. Save text fields first (so descriptions array with section IDs is stored)
                const response = await fetch('/api/product', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ ...productData, id: editingProduct._id }),
                })
                const data = await response.json()
                if (!data.success) throw new Error(data.error || 'Failed to update product')

                // 2. Upload product gallery images + description section images in parallel
                await Promise.all([
                    uploadImages(editingProduct._id),
                    uploadDescriptionImages(editingProduct._id),
                ])
            } else {
                // For create: create product first, then upload images with returned _id
                const response = await fetch('/api/product', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(productData),
                })
                const data = await response.json()
                if (!data.success) throw new Error(data.error || 'Failed to create product')

                // Upload product images + description section images using the new product's _id
                if (data.product?._id) {
                    await uploadImages(data.product._id)
                    await uploadDescriptionImages(data.product._id)
                }
            }

            MySwal.fire({
                icon: 'success',
                title: 'Success!',
                text: `Product ${editingProduct ? 'updated' : 'created'} successfully`,
                timer: 1500,
                showConfirmButton: false,
                confirmButtonColor: '#F47B20',
            })

            setShowModal(false)
            fetchProducts()
        } catch (error) {
            console.error('Error saving product:', error)
            MySwal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Failed to save product',
                confirmButtonColor: '#F47B20',
            })
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteProduct = async (productId) => {
        const result = await MySwal.fire({
            title: 'Permanently Delete Product?',
            text: 'This will remove the product and all its images from the database. This cannot be undone.',
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
            // hard=true → removes from DB and deletes Cloudinary images
            const response = await fetch(`/api/product?id=${productId}&hard=true`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data.error || `Server error ${response.status}`)
            }

            MySwal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Product permanently deleted',
                timer: 1500,
                showConfirmButton: false,
                confirmButtonColor: '#F47B20',
            })
            fetchProducts()
        } catch (error) {
            console.error('Error deleting product:', error)
            MySwal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Failed to delete product',
                confirmButtonColor: '#F47B20',
            })
        }
    }

    const handleBulkStatusUpdate = async (status) => {
        if (selectedProducts.length === 0) return

        try {
            const token = await getToken()
            const response = await fetch('/api/product', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: 'updateStatus',
                    ids: selectedProducts,
                    status
                }),
            })

            const data = await response.json()

            if (data.success) {
                MySwal.fire({
                    icon: 'success',
                    title: 'Updated!',
                    text: `${selectedProducts.length} products updated`,
                    timer: 1500,
                    showConfirmButton: false,
                    confirmButtonColor: '#F47B20',
                })
                setSelectedProducts([])
                fetchProducts()
            }
        } catch (error) {
            console.error('Error updating products:', error)
            MySwal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to update products',
                confirmButtonColor: '#F47B20',
            })
        }
    }

    const getStatusBadge = (status) => {
        const badges = {
            active: { bg: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
            draft: { bg: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
            archived: { bg: 'bg-red-100 text-red-700', dot: 'bg-red-500' }
        }
        return badges[status] || badges.draft
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#F47B20] mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading products...</p>
                </div>
            </div>
        )
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Products</h2>
                    <p className="text-gray-600 mt-1">{pagination.total} total products</p>
                </div>
                {subTab === 'products' && (
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#F47B20] to-[#C45A00] text-white rounded-lg hover:from-[#C45A00] hover:to-[#A34800] transition-all shadow-md"
                    >
                        <Plus size={18} />
                        Add Product
                    </button>
                )}
            </div>

            {/* Sub-tab switcher */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 w-fit">
                <button
                    onClick={() => setSubTab('products')}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${subTab === 'products'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Products
                </button>
                <button
                    onClick={() => setSubTab('categories')}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${subTab === 'categories'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Categories
                </button>
            </div>

            {/* Categories sub-tab */}
            {subTab === 'categories' && <CategoryManager getToken={getToken} />}

            {/* Products sub-tab content */}
            {subTab === 'products' && (<>

                {/* Filters & Search */}
                <div className="flex flex-wrap gap-4 mb-6">
                    <div className="flex-1 min-w-[300px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F47B20]"
                            />
                        </div>
                    </div>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F47B20]"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="archived">Archived</option>
                    </select>

                    {selectedProducts.length > 0 && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleBulkStatusUpdate('active')}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Activate ({selectedProducts.length})
                            </button>
                            <button
                                onClick={() => handleBulkStatusUpdate('archived')}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Archive ({selectedProducts.length})
                            </button>
                        </div>
                    )}
                </div>

                {/* Products Table */}
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                        <Package size={64} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-xl text-gray-500 font-medium">No products found</p>
                        <button
                            onClick={openCreateModal}
                            className="mt-4 px-6 py-2 bg-[#F47B20] text-white rounded-lg hover:bg-[#C45A00] transition-colors"
                        >
                            Create Your First Product
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedProducts.length === filteredProducts.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedProducts(filteredProducts.map(p => p._id))
                                                } else {
                                                    setSelectedProducts([])
                                                }
                                            }}
                                            className="rounded"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Product</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">SKU</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Stock</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Price</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredProducts.map((product) => (
                                    <tr key={product._id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedProducts.includes(product._id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedProducts([...selectedProducts, product._id])
                                                    } else {
                                                        setSelectedProducts(selectedProducts.filter(id => id !== product._id))
                                                    }
                                                }}
                                                className="rounded"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {product.images?.[0]?.url ? (
                                                    <img
                                                        src={product.images[0].url}
                                                        alt={product.name}
                                                        className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                                                        <ImageIcon size={20} className="text-gray-400" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-gray-900">{product.name}</p>
                                                    <p className="text-sm text-gray-500">{product.category?.main}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{product.sku || '-'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-sm ${product.inventory?.totalStock > product.inventory?.lowStockThreshold
                                                ? 'text-green-700'
                                                : 'text-red-700'
                                                }`}>
                                                {product.inventory?.totalStock || 0}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                            {formatCurrency(product.pricing?.salePrice || 0)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadge(product.status || 'draft').bg}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${getStatusBadge(product.status || 'draft').dot}`}></span>
                                                {(product.status || 'draft').charAt(0).toUpperCase() + (product.status || 'draft').slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(product)}
                                                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProduct(product._id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                        <p className="text-sm text-gray-600">
                            Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={pagination.page === 1}
                                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                disabled={pagination.page === pagination.pages}
                                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {/* Create/Edit Modal */}
                <AnimatePresence>
                    {showModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
                            onClick={() => setShowModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                onClick={e => e.stopPropagation()}
                                className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto my-8"
                            >
                                {/* Modal Header */}
                                <div className="sticky top-0 bg-gradient-to-r from-[#F47B20] to-[#C45A00] text-white p-6 flex items-center justify-between z-10">
                                    <h2 className="text-2xl font-bold">
                                        {editingProduct ? 'Edit Product' : 'Create New Product'}
                                    </h2>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                {/* Modal Content */}
                                <form onSubmit={handleSaveProduct} className="p-6 space-y-6">
                                    {/* Images */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Product Images (Up to 20)
                                        </label>
                                        <div className="grid grid-cols-5 gap-4">
                                            {imagePreviews.map((preview, index) => (
                                                <div key={index} className="relative group">
                                                    <img
                                                        src={preview}
                                                        alt={`Preview ${index + 1}`}
                                                        className="w-full h-24 object-cover rounded-lg border border-gray-200"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(index)}
                                                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                            {imagePreviews.length < 20 && (
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-[#F47B20] hover:bg-orange-50 transition-all"
                                                >
                                                    <Upload size={24} className="text-gray-400" />
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageSelect}
                                            className="hidden"
                                        />
                                    </div>

                                    {/* Name & SKU */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Product Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F47B20]"
                                                placeholder="Enter product name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                SKU
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.sku}
                                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F47B20]"
                                                placeholder="Product SKU"
                                            />
                                        </div>
                                    </div>

                                    {/* ── Page Descriptions (dynamic sections) ── */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700">
                                                    Page Descriptions
                                                </label>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    Each section renders as: Heading → Image (optional) → Body text. Displayed in order on the product page.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newId = crypto.randomUUID()
                                                    setDescSections(prev => [...prev, { id: newId, title: '', body: '', imageUrl: null, imagePublicId: null, _localFile: null, _localPreview: null }])
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-[#F47B20] text-white rounded-lg text-sm font-semibold hover:bg-[#C45A00] transition-colors flex-shrink-0"
                                            >
                                                <Plus size={14} /> Add Section
                                            </button>
                                        </div>

                                        {descSections.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-200 rounded-xl text-center bg-gray-50">
                                                <FileText size={36} className="text-gray-300 mb-2" />
                                                <p className="text-sm text-gray-500 font-medium">No description sections yet</p>
                                                <p className="text-xs text-gray-400 mt-1">Click "Add Section" to create your first description block</p>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            {descSections.map((section, idx) => (
                                                <div key={section.id} className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                                                    {/* Section header row */}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-bold text-gray-400 tracking-wide uppercase">
                                                            Section {idx + 1}
                                                        </span>
                                                        <div className="flex items-center gap-1 ml-auto">
                                                            <button
                                                                type="button"
                                                                disabled={idx === 0}
                                                                onClick={() => {
                                                                    const s = [...descSections]
                                                                    ;[s[idx - 1], s[idx]] = [s[idx], s[idx - 1]]
                                                                    setDescSections(s)
                                                                }}
                                                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30 transition-colors"
                                                                title="Move up"
                                                            >
                                                                <ChevronUp size={14} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={idx === descSections.length - 1}
                                                                onClick={() => {
                                                                    const s = [...descSections]
                                                                    ;[s[idx], s[idx + 1]] = [s[idx + 1], s[idx]]
                                                                    setDescSections(s)
                                                                }}
                                                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30 transition-colors"
                                                                title="Move down"
                                                            >
                                                                <ChevronDown size={14} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setDescSections(prev => prev.filter(s => s.id !== section.id))}
                                                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                title="Remove section"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Title */}
                                                    <input
                                                        type="text"
                                                        value={section.title}
                                                        onChange={(e) => {
                                                            const s = [...descSections]
                                                            s[idx] = { ...s[idx], title: e.target.value }
                                                            setDescSections(s)
                                                        }}
                                                        placeholder="Section heading (optional) — e.g. Why Buy from Us?"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#F47B20] bg-white"
                                                    />

                                                    {/* Body */}
                                                    <textarea
                                                        value={section.body}
                                                        onChange={(e) => {
                                                            const s = [...descSections]
                                                            s[idx] = { ...s[idx], body: e.target.value }
                                                            setDescSections(s)
                                                        }}
                                                        rows={6}
                                                        placeholder={"Write the content for this section.\n\nEach new line will be shown as a separate paragraph.\n\nExample:\nGuaranteed Lowest Price: We promise you the best value...\n\nDazzle Care+ (1-Year Replacement Guarantee): Go beyond repair..."}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F47B20] resize-y bg-white"
                                                    />

                                                    {/* Image upload area for this section */}
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-500 mb-2">Section Image <span className="font-normal text-gray-400">(optional)</span></p>

                                                        {section._localPreview || section.imageUrl ? (
                                                            <div className="relative inline-block group">
                                                                <img
                                                                    src={section._localPreview || section.imageUrl}
                                                                    alt="Section preview"
                                                                    className="h-32 w-auto max-w-full rounded-lg border border-gray-200 object-contain bg-white"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={async () => {
                                                                        // If saved server image, delete via API
                                                                        if (section.imageUrl && section.imagePublicId && editingProduct) {
                                                                            try {
                                                                                const token = await getToken()
                                                                                await fetch('/api/product?action=delete-description-image', {
                                                                                    method: 'PUT',
                                                                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                                                    body: JSON.stringify({ productId: editingProduct._id, sectionId: section.id, publicId: section.imagePublicId }),
                                                                                })
                                                                            } catch (e) { console.error('Failed to delete description image:', e) }
                                                                        }
                                                                        const s = [...descSections]
                                                                        s[idx] = { ...s[idx], imageUrl: null, imagePublicId: null, _localFile: null, _localPreview: null }
                                                                        setDescSections(s)
                                                                    }}
                                                                    className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full shadow opacity-90 hover:opacity-100"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    // Create a hidden file input and click it
                                                                    const inp = document.createElement('input')
                                                                    inp.type = 'file'
                                                                    inp.accept = 'image/*'
                                                                    inp.onchange = (e) => {
                                                                        const file = e.target.files?.[0]
                                                                        if (!file) return
                                                                        const sId = section.id
                                                                        const previewUrl = URL.createObjectURL(file)
                                                                        setDescSections(prev => prev.map(s =>
                                                                            s.id === sId
                                                                                ? { ...s, _localFile: file, _localPreview: previewUrl }
                                                                                : s
                                                                        ))
                                                                    }
                                                                    inp.click()
                                                                }}
                                                                className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-[#F47B20] hover:text-[#F47B20] hover:bg-orange-50 transition-all"
                                                            >
                                                                <Upload size={14} /> Click to upload an image for this section
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Pricing */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Regular Price *
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.pricing.regularPrice}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    pricing: { ...formData.pricing, regularPrice: parseFloat(e.target.value) || 0 }
                                                })}
                                                required
                                                step="0.01"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F47B20]"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Sale Price <span className="text-xs font-normal text-gray-400">(offered to customer)</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.pricing.salePrice}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    pricing: { ...formData.pricing, salePrice: parseFloat(e.target.value) || 0 }
                                                })}
                                                step="0.01"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F47B20]"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Cost Per Item <span className="text-xs font-normal text-gray-400">(what you paid)</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.pricing.costPerItem}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    pricing: { ...formData.pricing, costPerItem: parseFloat(e.target.value) || 0 }
                                                })}
                                                step="0.01"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F47B20]"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    {/* Inventory */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Stock Quantity
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.inventory.totalStock}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    inventory: { ...formData.inventory, totalStock: parseInt(e.target.value) || 0 }
                                                })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F47B20]"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Low Stock Threshold
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.inventory.lowStockThreshold}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    inventory: { ...formData.inventory, lowStockThreshold: parseInt(e.target.value) || 0 }
                                                })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F47B20]"
                                                placeholder="10"
                                            />
                                        </div>

                                        {/* Condition */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Condition</label>
                                            <select
                                                value={formData.condition}
                                                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F47B20]"
                                            >
                                                <option value="new">New</option>
                                                <option value="refurbished">Refurbished</option>
                                                <option value="open_box">Open Box</option>
                                                <option value="used">Used</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Brand */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Brand</label>
                                        <select
                                            value={formData.brand}
                                            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F47B20]"
                                        >
                                            <option value="">— No brand —</option>
                                            {brands.map((b) => (
                                                <option key={b._id} value={b.name}>{b.name}</option>
                                            ))}
                                        </select>
                                        {brands.length === 0 && (
                                            <p className="text-xs text-gray-400 mt-1">No brands yet — add them in the Brands tab.</p>
                                        )}
                                    </div>

                                    {/* Category & Subcategory */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                                            <select
                                                value={showCustomCategory ? '__custom__' : formData.category.main}
                                                onChange={(e) => {
                                                    if (e.target.value === '__custom__') {
                                                        setShowCustomCategory(true)
                                                        setFormData({ ...formData, category: { main: '', sub: '' } })
                                                    } else {
                                                        setShowCustomCategory(false)
                                                        setFormData({ ...formData, category: { ...formData.category, main: e.target.value, sub: '' } })
                                                    }
                                                }}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F47B20]"
                                            >
                                                <option value="">Select a category</option>
                                                {categories.map((cat) => (
                                                    <option key={cat._id} value={cat.name}>{cat.name}</option>
                                                ))}
                                                <option value="__custom__">+ Add New Category</option>
                                            </select>
                                            {showCustomCategory && (
                                                <div className="flex gap-2 mt-2">
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        value={newCategoryName}
                                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Escape' && setShowCustomCategory(false)}
                                                        className="flex-1 px-3 py-2 border border-[#F47B20] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F47B20]"
                                                        placeholder="New category name"
                                                    />
                                                    <button type="button" onClick={async () => {
                                                        const name = newCategoryName.trim()
                                                        if (!name) return
                                                        try {
                                                            const token = await getToken()
                                                            const res = await fetch('/api/category', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                                body: JSON.stringify({ name }),
                                                            })
                                                            await res.json()
                                                        } catch (e) { /* non-blocking */ }
                                                        setFormData({ ...formData, category: { ...formData.category, main: name, sub: '' } })
                                                        setShowCustomCategory(false)
                                                        setNewCategoryName('')
                                                        await fetchCategories() // refresh dropdown immediately
                                                    }} className="px-3 py-2 bg-[#F47B20] text-white rounded-lg text-sm">Save</button>
                                                    <button type="button" onClick={() => setShowCustomCategory(false)} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm">Cancel</button>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Subcategory</label>
                                            <select
                                                value={showCustomSubcategory ? '__custom__' : formData.category.sub}
                                                onChange={(e) => {
                                                    if (e.target.value === '__custom__') {
                                                        setShowCustomSubcategory(true)
                                                        setFormData({ ...formData, category: { ...formData.category, sub: '' } })
                                                    } else {
                                                        setShowCustomSubcategory(false)
                                                        setFormData({ ...formData, category: { ...formData.category, sub: e.target.value } })
                                                    }
                                                }}
                                                disabled={!formData.category.main}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F47B20] disabled:opacity-50"
                                            >
                                                <option value="">Select subcategory</option>
                                                {getAllSubcategories(formData.category.main).map((sub, index) => (
                                                    <option key={sub._id || index} value={sub.name}>{sub.name}</option>
                                                ))}
                                                <option value="__custom__">+ Add New Subcategory</option>
                                            </select>
                                            {showCustomSubcategory && (
                                                <div className="flex gap-2 mt-2">
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        value={newSubcategoryName}
                                                        onChange={(e) => setNewSubcategoryName(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Escape' && setShowCustomSubcategory(false)}
                                                        className="flex-1 px-3 py-2 border border-[#F47B20] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F47B20]"
                                                        placeholder="New subcategory name"
                                                    />
                                                    <button type="button" onClick={async () => {
                                                        const subName = newSubcategoryName.trim()
                                                        if (!subName) return
                                                        const mainCat = formData.category.main
                                                        // Save subcategory to DB if parent category exists
                                                        if (mainCat) {
                                                            try {
                                                                const token = await getToken()
                                                                // Find parent category id
                                                                const parentCat = categories.find(c => c.name.toLowerCase() === mainCat.toLowerCase())
                                                                if (parentCat) {
                                                                    await fetch('/api/category', {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                                        body: JSON.stringify({ action: 'add-subcategory', categoryId: parentCat._id, subcategoryName: subName }),
                                                                    })
                                                                } else {
                                                                    // Parent category doesn't exist yet — create it first then add sub
                                                                    const res = await fetch('/api/category', {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                                        body: JSON.stringify({ name: mainCat }),
                                                                    })
                                                                    const d = await res.json()
                                                                    if (d.category?._id) {
                                                                        await fetch('/api/category', {
                                                                            method: 'POST',
                                                                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                                            body: JSON.stringify({ action: 'add-subcategory', categoryId: d.category._id, subcategoryName: subName }),
                                                                        })
                                                                    }
                                                                }
                                                            } catch (e) { /* non-blocking */ }
                                                        }
                                                        setFormData({ ...formData, category: { ...formData.category, sub: subName } })
                                                        setShowCustomSubcategory(false)
                                                        setNewSubcategoryName('')
                                                        await fetchCategories() // refresh so subcategory appears next time
                                                    }} className="px-3 py-2 bg-[#F47B20] text-white rounded-lg text-sm">Save</button>
                                                    <button type="button" onClick={() => setShowCustomSubcategory(false)} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm">Cancel</button>
                                                </div>
                                            )}
                                        </div>

                                    </div>

                                    {/* Status & Booleans */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Status
                                            </label>
                                            <select
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F47B20]"
                                            >
                                                <option value="draft">Draft</option>
                                                <option value="active">Active</option>
                                                <option value="archived">Archived</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-3 justify-end pb-1">
                                            <label className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.isNewArrival}
                                                    onChange={(e) => setFormData({ ...formData, isNewArrival: e.target.checked })}
                                                    className="w-5 h-5 rounded"
                                                />
                                                <span className="text-sm font-medium text-gray-700">New Arrival</span>
                                            </label>
                                            <label className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg border border-pink-200 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.isLovedProduct}
                                                    onChange={(e) => setFormData({ ...formData, isLovedProduct: e.target.checked })}
                                                    className="w-5 h-5 rounded"
                                                />
                                                <span className="text-sm font-medium text-gray-700">Loved Product</span>
                                            </label>
                                            <label className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.isTrending}
                                                    onChange={(e) => setFormData({ ...formData, isTrending: e.target.checked })}
                                                    className="w-5 h-5 rounded"
                                                />
                                                <span className="text-sm font-medium text-gray-700">Trending Product</span>
                                            </label>
                                        </div>
                                    </div>


                                    {/* Features Array */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Features</label>
                                        <div className="space-y-2 mb-3">
                                            {formData.features.map((feat, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <span className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">{feat}</span>
                                                    <button type="button" onClick={() => {
                                                        const f = [...formData.features]
                                                        f.splice(idx, 1)
                                                        setFormData({ ...formData, features: f })
                                                    }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">✕</button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newFeature}
                                                onChange={(e) => setNewFeature(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') { e.preventDefault(); if (newFeature.trim()) { setFormData({ ...formData, features: [...formData.features, newFeature.trim()] }); setNewFeature('') } }
                                                }}
                                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F47B20] text-sm"
                                                placeholder="Type a feature and press Add"
                                            />
                                            <button type="button" onClick={() => { if (newFeature.trim()) { setFormData({ ...formData, features: [...formData.features, newFeature.trim()] }); setNewFeature('') } }}
                                                className="px-4 py-2 bg-[#F47B20] text-white rounded-lg hover:bg-[#C45A00] transition-colors text-sm font-medium">Add</button>
                                        </div>
                                    </div>

                                    {/* Specifications - Flat Key/Value Table */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Specifications</label>
                                        <p className="text-xs text-gray-400 mb-3">Left column = Heading (e.g. Brand, Display), Right column = Value (e.g. Samsung, 6.9 inches)</p>
                                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 w-2/5">Heading</th>
                                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Value</th>
                                                        <th className="w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {specPairs.map((pair, idx) => (
                                                        <tr key={idx} className="border-t border-gray-100">
                                                            <td className="px-2 py-1.5">
                                                                <input
                                                                    type="text"
                                                                    value={pair.key}
                                                                    onChange={(e) => { const p = [...specPairs]; p[idx] = { ...p[idx], key: e.target.value }; setSpecPairs(p) }}
                                                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#F47B20]"
                                                                    placeholder="e.g. Brand"
                                                                />
                                                            </td>
                                                            <td className="px-2 py-1.5">
                                                                <input
                                                                    type="text"
                                                                    value={pair.value}
                                                                    onChange={(e) => { const p = [...specPairs]; p[idx] = { ...p[idx], value: e.target.value }; setSpecPairs(p) }}
                                                                    className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#F47B20]"
                                                                    placeholder="e.g. Samsung"
                                                                />
                                                            </td>
                                                            <td className="px-2 py-1.5 text-center">
                                                                {specPairs.length > 1 && (
                                                                    <button type="button" onClick={() => { const p = [...specPairs]; p.splice(idx, 1); setSpecPairs(p) }}
                                                                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">✕</button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <button type="button" onClick={() => setSpecPairs([...specPairs, { key: '', value: '' }])}
                                            className="mt-2 text-sm text-[#F47B20] hover:underline flex items-center gap-1">
                                            + Add Row
                                        </button>
                                    </div>

                                    {/* Custom Fields */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Custom Fields</label>
                                        <p className="text-xs text-gray-500 mb-3">Add any additional field you need (e.g. Sensors, Connectivity).</p>
                                        <div className="space-y-2 mb-3">
                                            {Object.entries(formData.customFields).map(([k, v]) => (
                                                <div key={k} className="flex items-center gap-2">
                                                    <span className="w-1/3 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm font-medium text-orange-800">{k}</span>
                                                    <span className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">{v}</span>
                                                    <button type="button" onClick={() => { const cf = { ...formData.customFields }; delete cf[k]; setFormData({ ...formData, customFields: cf }) }}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">✕</button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input type="text" value={customFieldKey} onChange={(e) => setCustomFieldKey(e.target.value)}
                                                className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F47B20] text-sm" placeholder="Field name" />
                                            <input type="text" value={customFieldValue} onChange={(e) => setCustomFieldValue(e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F47B20] text-sm" placeholder="Field value" />
                                            <button type="button" onClick={() => { if (customFieldKey.trim()) { setFormData({ ...formData, customFields: { ...formData.customFields, [customFieldKey.trim()]: customFieldValue } }); setCustomFieldKey(''); setCustomFieldValue('') } }}
                                                className="px-4 py-2 bg-[#F47B20] text-white rounded-lg hover:bg-[#C45A00] text-sm font-medium">Add</button>
                                        </div>
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex gap-3 pt-6 border-t border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowModal(false);
                                                setShowCustomCategory(false);
                                                setShowCustomSubcategory(false);
                                            }}
                                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#F47B20] to-[#C45A00] text-white rounded-lg font-semibold hover:from-[#C45A00] hover:to-[#A34800] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                                        >
                                            <Save size={18} />
                                            {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </>
            )}
        </div>
    )
}
