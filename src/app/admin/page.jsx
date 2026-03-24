'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    LogOut,
    Image as ImageIcon,
    Bell,
    Home,
    Layers,
    Tag,
    Ticket
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import AdminGuard from '@/components/admin/AdminGuard'
import SliderManager from '@/components/admin/SliderManager'
import ProductManager from '@/components/admin/ProductManager'
import OrderManager from '@/components/admin/OrderManager'
import SectionBannerManager from '@/components/admin/SectionBannerManager'
import CategoryBannerManager from '@/components/admin/CategoryBannerManager'
import BrandManager from '@/components/admin/BrandManager'
import CouponManager from '@/components/admin/CouponManager'

function AdminDashboard() {
    const router = useRouter()
    const { user, loading: authLoading, getToken, signOut } = useAuth()
    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('adminActiveTab') || 'dashboard'
        }
        return 'dashboard'
    })
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        activeSlides: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!authLoading && user) {
            fetchDashboardData()
        }
    }, [user, authLoading])

    // Persist active tab to localStorage
    useEffect(() => {
        localStorage.setItem('adminActiveTab', activeTab)
    }, [activeTab])

    const fetchDashboardData = async () => {
        setLoading(true)
        try {
            const token = await getToken()

            // Fetch slides to get active count
            const slidesRes = await fetch('/api/slider?includeInactive=true', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (slidesRes.ok) {
                const data = await slidesRes.json()
                setStats(prev => ({
                    ...prev,
                    activeSlides: data.slides?.filter(s => s.isActive).length || 0
                }))
            }

            // Fetch products count
            const productsRes = await fetch('/api/product?limit=1', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (productsRes.ok) {
                const data = await productsRes.json()
                setStats(prev => ({
                    ...prev,
                    totalProducts: data.pagination?.total || 0
                }))
            }

            // Fetch orders count
            const ordersRes = await fetch('/api/orders?getAllOrders=true', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (ordersRes.ok) {
                const data = await ordersRes.json()
                const orders = data.orders || []
                setStats(prev => ({
                    ...prev,
                    totalOrders: orders.length,
                    totalRevenue: orders.reduce((sum, order) => sum + (order.pricing?.total || order.total || 0), 0)
                }))
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await signOut()
        router.push('/login')
    }

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F47B20]"></div>
            </div>
        )
    }

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'products', label: 'Products', icon: Package },
        { id: 'brands', label: 'Brands', icon: Tag },
        { id: 'sliders', label: 'Sliders', icon: ImageIcon },
        { id: 'banners', label: 'Banners', icon: Layers },
        { id: 'coupons', label: 'Coupons', icon: Ticket },
        { id: 'orders', label: 'Orders', icon: ShoppingCart },
    ]

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-BD', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 0
        }).format(amount)
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-20 bg-gray-900 text-white flex flex-col">
                {/* Logo */}
                <div className="p-6 border-b border-gray-800 flex justify-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#F47B20] to-[#C45A00] rounded-lg flex items-center justify-center text-white font-bold text-xl">
                        N
                    </div>
                </div>

                {/* Home Button */}
                <div className="px-4 pt-4">
                    <Link href="/">
                        <button className="w-full flex items-center justify-center px-4 py-3 rounded-lg transition-all bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white">
                            <Home size={20} />
                        </button>
                    </Link>
                </div>

                {/* Menu Items */}
                <nav className="flex-1 px-4 py-6 space-y-1">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            title={item.label}
                            className={`w-full flex items-center justify-center px-4 py-3 rounded-lg transition-all ${activeTab === item.id
                                ? 'bg-[#F47B20] text-white shadow-lg'
                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                }`}
                        >
                            <item.icon size={20} />
                        </button>
                    ))}
                </nav>

                {/* User Section */}
                <div className="p-4 border-t border-gray-800">
                    <div className="flex items-center justify-center">
                        <div className="w-10 h-10 bg-[#F47B20] rounded-full flex items-center justify-center text-white font-semibold">
                            {user?.email?.[0]?.toUpperCase() || 'A'}
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="mt-3 w-full flex items-center justify-center px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="px-8 py-4 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 capitalize">{activeTab}</h1>
                            <p className="text-sm text-gray-500">Manage your {activeTab} here</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
                                <Bell size={20} className="text-gray-600" />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-[#F47B20] rounded-full"></span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="p-8">
                    {/* Dashboard */}
                    {activeTab === 'dashboard' && (
                        <div>
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                            <Package className="text-orange-600" size={24} />
                                        </div>
                                        <span className="text-sm text-gray-500">Total</span>
                                    </div>
                                    <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.totalProducts}</h3>
                                    <p className="text-sm text-gray-600">Products</p>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                            <ShoppingCart className="text-green-600" size={24} />
                                        </div>
                                        <span className="text-sm text-gray-500">This month</span>
                                    </div>
                                    <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.totalOrders}</h3>
                                    <p className="text-sm text-gray-600">Orders</p>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                            <ShoppingCart className="text-[#F47B20]" size={24} />
                                        </div>
                                        <span className="text-sm text-gray-500">Total</span>
                                    </div>
                                    <h3 className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(stats.totalRevenue)}</h3>
                                    <p className="text-sm text-gray-600">Revenue</p>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <ImageIcon className="text-purple-600" size={24} />
                                        </div>
                                        <span className="text-sm text-gray-500">Active</span>
                                    </div>
                                    <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.activeSlides}</h3>
                                    <p className="text-sm text-gray-600">Hero Slides</p>
                                </motion.div>
                            </div>

                            {/* Quick Actions */}
                            <div className="bg-white rounded-xl p-6 border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <button
                                        onClick={() => setActiveTab('products')}
                                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#F47B20] hover:bg-orange-50 transition-all text-left"
                                    >
                                        <Package className="text-[#F47B20] mb-2" size={24} />
                                        <p className="font-medium text-gray-900">Add Product</p>
                                        <p className="text-xs text-gray-500 mt-1">Create new listing</p>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('sliders')}
                                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#F47B20] hover:bg-orange-50 transition-all text-left"
                                    >
                                        <ImageIcon className="text-[#F47B20] mb-2" size={24} />
                                        <p className="font-medium text-gray-900">Add Slider</p>
                                        <p className="text-xs text-gray-500 mt-1">Upload hero image</p>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('orders')}
                                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#F47B20] hover:bg-orange-50 transition-all text-left"
                                    >
                                        <ShoppingCart className="text-[#F47B20] mb-2" size={24} />
                                        <p className="font-medium text-gray-900">View Orders</p>
                                        <p className="text-xs text-gray-500 mt-1">Manage purchases</p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sliders Tab */}
                    {activeTab === 'sliders' && (
                        <SliderManager getToken={getToken} />
                    )}

                    {/* Products Tab */}
                    {activeTab === 'products' && (
                        <ProductManager getToken={getToken} />
                    )}

                    {/* Brands Tab */}
                    {activeTab === 'brands' && (
                        <BrandManager getToken={getToken} />
                    )}

                    {/* Banners Tab */}
                    {activeTab === 'banners' && (
                        <div className="space-y-10">
                            <SectionBannerManager getToken={getToken} />
                            <div className="border-t border-gray-200 pt-10">
                                <CategoryBannerManager getToken={getToken} />
                            </div>
                        </div>
                    )}

                    {/* Coupons Tab */}
                    {activeTab === 'coupons' && (
                        <CouponManager getToken={getToken} />
                    )}

                    {/* Orders Tab */}
                    {activeTab === 'orders' && (
                        <OrderManager getToken={getToken} />
                    )}
                </div>
            </main>
        </div>
    )
}

// Wrap with AdminGuard
export default function AdminDashboardPage() {
    return (
        <AdminGuard>
            <AdminDashboard />
        </AdminGuard>
    )
}
