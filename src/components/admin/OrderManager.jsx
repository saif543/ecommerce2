'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Swal from 'sweetalert2'
import {
    Search,
    Filter,
    Eye,
    Package,
    MapPin,
    Clock,
    DollarSign,
    User,
    ChevronDown,
    ChevronUp,
    Copy,
    Check
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

const MySwal = Swal

export default function OrderManager({ getToken }) {
    const [loading, setLoading] = useState(true)
    const [orders, setOrders] = useState([])
    const [filteredOrders, setFilteredOrders] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [updatingStatus, setUpdatingStatus] = useState(null)
    const [isEditingDetails, setIsEditingDetails] = useState(false)
    const [copied, setCopied] = useState(false)
    const [editedDetails, setEditedDetails] = useState({
        userName: '', userEmail: '', userPhone: '', deliveryAddress: {}
    })

    useEffect(() => {
        fetchOrders()
    }, [])

    const fetchOrders = async () => {
        try {
            const token = await getToken()
            const response = await fetch('/api/orders?getAllOrders=true', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setOrders(data.orders || [])
                setFilteredOrders(data.orders || [])
            }
        } catch (error) {
            console.error('Error fetching orders:', error)
            setOrders([])
            setFilteredOrders([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        applyFilters()
    }, [searchTerm, filterStatus, orders])

    const applyFilters = () => {
        let filtered = [...orders]

        if (searchTerm) {
            filtered = filtered.filter(order =>
                (order.orderNumber || order._id).toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.userName || order.deliveryAddress?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.userEmail || order.deliveryAddress?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.userPhone || order.deliveryAddress?.phone || '').toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        if (filterStatus !== 'all') {
            filtered = filtered.filter(order => order.status === filterStatus)
        }

        setFilteredOrders(filtered)
    }

    const handleStatusChange = async (orderId, newStatus) => {
        setUpdatingStatus(orderId)
        try {
            const token = await getToken()
            const response = await fetch('/api/orders', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    id: orderId,
                    status: newStatus
                })
            })

            const data = await response.json()
            if (response.ok) {
                MySwal.fire({
                    title: 'Success!',
                    text: `Order status updated to ${newStatus}`,
                    icon: 'success',
                    confirmButtonColor: '#F47B20'
                })
                // Refresh list to show updated status
                fetchOrders()

                // If modal is open for this order, close it or update it
                if (selectedOrder && selectedOrder._id === orderId) {
                    setShowDetailModal(false)
                }
            } else {
                MySwal.fire('Error', data.error || 'Failed to update status', 'error')
            }
        } catch (error) {
            console.error('Error updating status:', error)
            MySwal.fire('Error', 'An unexpected error occurred.', 'error')
        } finally {
            setUpdatingStatus(null)
        }
    }

    const getStatusColor = (status) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            processing: 'bg-orange-100 text-orange-800 border-orange-200',
            shipped: 'bg-purple-100 text-purple-800 border-purple-200',
            delivered: 'bg-green-100 text-green-800 border-green-200',
            cancelled: 'bg-red-100 text-red-800 border-red-200',
            refunded: 'bg-gray-100 text-gray-800 border-gray-200'
        }
        return colors[status] || colors.pending
    }

    const viewOrderDetails = (order) => {
        setSelectedOrder(order)
        setEditedDetails({
            userName: order.userName || order.deliveryAddress?.fullName || '',
            userEmail: order.userEmail || order.deliveryAddress?.email || '',
            userPhone: order.userPhone || order.deliveryAddress?.phone || '',
            deliveryAddress: {
                streetAddress: order.deliveryAddress?.streetAddress || '',
                area: order.deliveryAddress?.area || '',
                shippingZone: order.deliveryAddress?.shippingZone || 'inside',
                region: order.deliveryAddress?.region || 'Bangladesh'
            }
        })
        setIsEditingDetails(false)
        setShowDetailModal(true)
    }

    const handleSaveDetails = async () => {
        try {
            setUpdatingStatus(selectedOrder._id)
            const token = await getToken()
            const response = await fetch('/api/orders', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    id: selectedOrder._id,
                    ...editedDetails
                })
            })

            const data = await response.json()
            if (response.ok) {
                MySwal.fire({
                    title: 'Success!',
                    text: 'Order details updated successfully',
                    icon: 'success',
                    confirmButtonColor: '#F47B20'
                })
                fetchOrders()
                setSelectedOrder(data.order)
                setIsEditingDetails(false)
            } else {
                MySwal.fire('Error', data.error || 'Failed to update details', 'error')
            }
        } catch (error) {
            console.error('Error updating details:', error)
            MySwal.fire('Error', 'An unexpected error occurred.', 'error')
        } finally {
            setUpdatingStatus(null)
        }
    }

    const handleCopyCourierInfo = () => {
        if (!selectedOrder) return;

        const name = selectedOrder.userName || selectedOrder.deliveryAddress?.fullName || 'Guest User';
        const phone = selectedOrder.userPhone || selectedOrder.deliveryAddress?.phone || 'Not Provided';
        const address = [
            selectedOrder.deliveryAddress?.streetAddress || '',
            selectedOrder.deliveryAddress?.area || ''
        ].filter(Boolean).join(', ');

        const zone = selectedOrder.deliveryAddress?.shippingZone === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka';

        const textToCopy = `Name: ${name}\nPhone: ${phone}\nAddress: ${address}, ${zone}`;

        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            MySwal.fire('Error', 'Failed to copy to clipboard', 'error');
        });
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#F47B20] mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading orders...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Orders Management</h2>
                    <p className="text-gray-500 text-sm mt-1">View, track, and manage customer orders.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by ID, name, email, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F47B20]/50 focus:bg-white transition-all"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Filter className="text-gray-400" size={18} />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full md:w-48 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F47B20]/50 focus:bg-white transition-all font-medium text-gray-700"
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            {/* Tabular Orders List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Order ID & Date</th>
                                <th className="px-6 py-4 font-semibold">Customer</th>
                                <th className="px-6 py-4 font-semibold">Contact</th>
                                <th className="px-6 py-4 font-semibold">Items</th>
                                <th className="px-6 py-4 font-semibold">Amount</th>
                                <th className="px-6 py-4 font-semibold text-center">Status</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <Package className="text-gray-300 mb-2" size={40} />
                                            <p className="text-gray-500 font-medium">No orders found matching your criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        key={order._id}
                                        className="hover:bg-orange-50/30 transition-colors group cursor-pointer"
                                        onClick={() => viewOrderDetails(order)}
                                    >
                                        {/* Order ID & Date */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                                    <Package className="text-[#F47B20]" size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 text-sm">{order.orderNumber || order._id.substring(order._id.length - 6).toUpperCase()}</p>
                                                    <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                                        <Clock size={12} className="mr-1" />
                                                        {formatDate(order.createdAt)}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Customer */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <p className="text-sm font-medium text-gray-900">{order.userName || order.deliveryAddress?.fullName || 'Guest'}</p>
                                            <p className="text-xs text-gray-500 flex items-center mt-0.5">
                                                <MapPin size={12} className="mr-1" />
                                                {order.deliveryAddress?.shippingZone === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka'}
                                            </p>
                                        </td>

                                        {/* Contact */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <p className="text-sm text-gray-700">{order.userPhone || order.deliveryAddress?.phone || 'N/A'}</p>
                                            <p className="text-xs text-gray-500 truncate max-w-[150px]" title={order.userEmail || order.deliveryAddress?.email}>
                                                {order.userEmail || order.deliveryAddress?.email || 'No email provided'}
                                            </p>
                                        </td>

                                        {/* Items count */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                {order.items?.length || 0} {order.items?.length === 1 ? 'Item' : 'Items'}
                                            </span>
                                        </td>

                                        {/* Amount */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <p className="text-sm font-bold text-gray-900">{formatCurrency(order.totalAmount || 0)}</p>
                                            <p className="text-xs text-gray-500 uppercase">{order.paymentMethod?.replace(/_/g, ' ') || 'COD'}</p>
                                        </td>

                                        {/* Status Dropdown */}
                                        <td className="px-6 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                                            {updatingStatus === order._id ? (
                                                <div className="flex justify-center items-center gap-2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#F47B20]"></div>
                                                </div>
                                            ) : (
                                                <select
                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border outline-none cursor-pointer appearance-none text-center inline-block min-w-[110px] ${getStatusColor(order.status)}`}
                                                    value={order.status}
                                                    onChange={(e) => handleStatusChange(order._id, e.target.value)}
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="processing">Processing</option>
                                                    <option value="shipped">Shipped</option>
                                                    <option value="delivered">Delivered</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); viewOrderDetails(order); }}
                                                className="text-[#F47B20] hover:text-[#C45A00] bg-orange-50 hover:bg-orange-100 p-2 rounded-lg transition-colors inline-flex items-center justify-center"
                                                title="View Details"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            <AnimatePresence>
                {showDetailModal && selectedOrder && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 lg:p-12 overflow-y-auto"
                        onClick={() => setShowDetailModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 30 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-gray-50 rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden m-auto relative"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal Header Premium */}
                            <div className="bg-white px-6 md:px-10 py-5 border-b border-gray-100 flex-shrink-0 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                                    <h2 className="text-lg md:text-xl font-black text-gray-900 border-r border-gray-200 pr-3 md:pr-4">Order #{selectedOrder.orderNumber || selectedOrder._id.substring(selectedOrder._id.length - 6).toUpperCase()}</h2>
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] md:text-[11px] uppercase tracking-wider font-extrabold ${getStatusColor(selectedOrder.status)}`}>
                                        {selectedOrder.status}
                                    </span>
                                    <div className="hidden sm:flex items-center text-xs text-gray-500 font-medium ml-2">
                                        <Clock size={14} className="mr-1.5 opacity-70" />
                                        {formatDate(selectedOrder.createdAt)}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="p-2.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all duration-200 group flex-shrink-0"
                                >
                                    <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 md:p-8 lg:p-10 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">

                                {/* LEFT COLUMN (7 cols) */}
                                <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6 md:gap-8">

                                    {/* Products Ordered List */}
                                    <div className="bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
                                        <div className="px-6 md:px-8 py-5 border-b border-gray-50 bg-white">
                                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                                <Package className="text-[#F47B20]" size={20} /> Items Ordered
                                                <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">{selectedOrder.items?.length || 0}</span>
                                            </h3>
                                        </div>
                                        <div className="p-6 md:p-8 space-y-5">
                                            {selectedOrder.items?.map((item, index) => (
                                                <div key={index} className="flex gap-4 md:gap-6 items-center group pb-5 border-b border-gray-50 last:border-0 last:pb-0">
                                                    <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm relative">
                                                        {item.image ? (
                                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                                <Package size={28} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 py-1">
                                                        <h4 className="text-sm md:text-base font-bold text-gray-900 leading-tight mb-2 pr-4">{item.name}</h4>
                                                        <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
                                                            <span className="bg-gray-100 px-2.5 py-1 rounded-md text-gray-600">Qty: {item.quantity || item.qty}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex flex-col items-end gap-1">
                                                        <p className="text-xs text-gray-400 font-medium">@ {formatCurrency(item.price)}</p>
                                                        <p className="text-base md:text-lg font-black text-gray-900">{formatCurrency(item.price * (item.quantity || item.qty))}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Payment Section */}
                                    <div className="bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
                                        <div className="px-6 md:px-8 py-5 border-b border-gray-50 bg-white">
                                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                                <DollarSign className="text-[#F47B20]" size={20} /> Payment Summary
                                            </h3>
                                        </div>
                                        <div className="p-6 md:p-8 space-y-4">
                                            <div className="flex justify-between items-center text-sm md:text-base">
                                                <span className="text-gray-500 font-medium">Subtotal</span>
                                                <span className="font-bold text-gray-900">{formatCurrency(selectedOrder.subtotal || selectedOrder.items?.reduce((acc, item) => acc + (item.price * (item.quantity || item.qty)), 0) || 0)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm md:text-base">
                                                <span className="text-gray-500 font-medium">Delivery Fee <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded ml-1">({selectedOrder.deliveryAddress?.shippingZone === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka'})</span></span>
                                                <span className="font-bold text-gray-900">{formatCurrency(selectedOrder.shippingCost || 0)}</span>
                                            </div>
                                            <div className="pt-6 mt-2 border-t border-dashed border-gray-200 flex justify-between items-end">
                                                <div>
                                                    <span className="text-xs text-gray-500 font-bold uppercase tracking-widest block mb-2">Total Paid</span>
                                                    <span className="inline-block px-2.5 py-1 bg-[#F47B20]/10 text-[#F47B20] rounded ring-1 ring-[#F47B20]/20 text-[10px] md:text-xs font-bold uppercase tracking-wider">
                                                        {selectedOrder.paymentMethod?.replace(/_/g, ' ') || 'Cash on Delivery'}
                                                    </span>
                                                </div>
                                                <span className="text-3xl md:text-4xl font-black text-[#F47B20] tracking-tight">{formatCurrency(selectedOrder.totalAmount || 0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN (5 cols) */}
                                <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 md:gap-8">

                                    {/* Combined Customer & Shipping Card */}
                                    <div className="bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden relative">
                                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#F47B20] to-[#C45A00]"></div>
                                        <div className="px-6 pt-7 pb-5 border-b border-gray-50 flex justify-between items-center bg-white">
                                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                                <User className="text-[#F47B20]" size={20} /> Customer & Address
                                            </h3>
                                            {!isEditingDetails ? (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={handleCopyCourierInfo}
                                                        className="flex items-center justify-center gap-1.5 text-xs text-gray-600 font-bold bg-white hover:bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 transition-all shadow-sm active:scale-95"
                                                        title="Copy for Steadfast / Courier"
                                                    >
                                                        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                                        {copied ? <span className="text-green-500">Copied</span> : <span className="hidden xl:inline">Copy</span>}
                                                    </button>
                                                    <button
                                                        onClick={() => setIsEditingDetails(true)}
                                                        className="text-xs text-[#F47B20] bg-orange-50 hover:bg-orange-100 font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm ring-1 ring-[#F47B20]/20 active:scale-95"
                                                    >
                                                        Edit
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setIsEditingDetails(false)}
                                                        className="text-xs text-gray-500 font-bold px-2 hover:text-gray-700"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleSaveDetails}
                                                        disabled={updatingStatus === selectedOrder._id}
                                                        className="text-xs bg-[#F47B20] text-white px-4 py-1.5 rounded-lg font-bold hover:bg-[#C45A00] shadow-md shadow-[#F47B20]/20 disabled:opacity-50 transition-all active:scale-95"
                                                    >
                                                        {updatingStatus === selectedOrder._id ? 'Saving...' : 'Save'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-6 md:p-8 bg-white">
                                            {!isEditingDetails ? (
                                                <div className="space-y-8 animate-in fade-in duration-300">
                                                    <div>
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#F47B20] mb-4">Contact Info</h4>
                                                        <div className="space-y-4">
                                                            <div>
                                                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Full Name</span>
                                                                <span className="text-sm md:text-base font-semibold text-gray-900 block">{selectedOrder.userName || selectedOrder.deliveryAddress?.fullName || 'Guest User'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Phone Number</span>
                                                                <span className="text-sm md:text-base font-semibold text-gray-900 block">{selectedOrder.userPhone || selectedOrder.deliveryAddress?.phone || 'N/A'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Email Address</span>
                                                                <span className="text-sm md:text-base font-medium text-gray-700 block break-all">{selectedOrder.userEmail || selectedOrder.deliveryAddress?.email || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="border-t border-gray-100 pt-6">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#F47B20] mb-4">Delivery Address</h4>
                                                        <div className="bg-orange-50/30 rounded-xl p-5 border border-orange-100/50">
                                                            <p className="text-sm font-bold text-gray-900 mb-2 leading-relaxed">
                                                                {selectedOrder.deliveryAddress?.streetAddress || 'No Street Address Provided'}
                                                            </p>
                                                            <p className="text-sm text-gray-600 font-medium leading-relaxed">
                                                                {selectedOrder.deliveryAddress?.area || ''}<br />
                                                                <span className="inline-block mt-1 font-bold text-gray-900">{selectedOrder.deliveryAddress?.shippingZone === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka'}</span><br />
                                                                {selectedOrder.deliveryAddress?.region || 'Bangladesh'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {selectedOrder.notes && (
                                                        <div className="border-t border-gray-100 pt-6">
                                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 block">Customer Notes</h4>
                                                            <div className="bg-yellow-50/50 border border-yellow-100 p-4 rounded-xl relative">
                                                                <div className="absolute top-2 right-3 text-yellow-300 pointer-events-none opacity-50 text-4xl leading-none font-serif">"</div>
                                                                <p className="text-sm text-gray-700 italic font-medium relative z-10 leading-relaxed max-w-[90%]">{selectedOrder.notes}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                                                    <div>
                                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Full Name</label>
                                                        <input type="text" value={editedDetails.userName} onChange={(e) => setEditedDetails({ ...editedDetails, userName: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-[#F47B20]/20 focus:border-[#F47B20] outline-none transition-all placeholder:font-normal" placeholder="Customer Name" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Phone Number</label>
                                                        <input type="text" value={editedDetails.userPhone} onChange={(e) => setEditedDetails({ ...editedDetails, userPhone: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-[#F47B20]/20 focus:border-[#F47B20] outline-none transition-all placeholder:font-normal" placeholder="+8801XXXXXXXXX" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Email</label>
                                                        <input type="email" value={editedDetails.userEmail} onChange={(e) => setEditedDetails({ ...editedDetails, userEmail: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-[#F47B20]/20 focus:border-[#F47B20] outline-none transition-all placeholder:font-normal" placeholder="name@example.com" />
                                                    </div>

                                                    <div className="pt-6 mt-2 border-t border-gray-100 space-y-5">
                                                        <div>
                                                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Street Address</label>
                                                            <textarea value={editedDetails.deliveryAddress.streetAddress} onChange={(e) => setEditedDetails({ ...editedDetails, deliveryAddress: { ...editedDetails.deliveryAddress, streetAddress: e.target.value } })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-[#F47B20]/20 focus:border-[#F47B20] outline-none transition-all min-h-[90px] resize-none" placeholder="House/Flat No, Road, Block, etc." />
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                            <div>
                                                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Area / City</label>
                                                                <input type="text" value={editedDetails.deliveryAddress.area} onChange={(e) => setEditedDetails({ ...editedDetails, deliveryAddress: { ...editedDetails.deliveryAddress, area: e.target.value } })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-[#F47B20]/20 focus:border-[#F47B20] outline-none transition-all" placeholder="Mirpur, Gulshan, etc." />
                                                            </div>
                                                            <div>
                                                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Shipping Zone</label>
                                                                <select value={editedDetails.deliveryAddress.shippingZone} onChange={(e) => setEditedDetails({ ...editedDetails, deliveryAddress: { ...editedDetails.deliveryAddress, shippingZone: e.target.value } })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#F47B20]/20 focus:border-[#F47B20] outline-none transition-all cursor-pointer appearance-none">
                                                                    <option value="inside">Inside Dhaka</option>
                                                                    <option value="outside">Outside Dhaka</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Admin Status Quick Action */}
                                    <div className="bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden relative">
                                        <div className="p-6 md:p-8">
                                            <div className="flex justify-between items-center mb-4">
                                                <label className="text-[11px] font-black uppercase tracking-widest text-[#F47B20] flex items-center gap-2 m-0 p-0 leading-none">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#F47B20] animate-pulse relative top-[0.5px]"></div>
                                                    Update Order Status
                                                </label>
                                            </div>
                                            <div className="relative">
                                                <select
                                                    className={`w-full px-5 py-4 rounded-xl text-base font-black border-2 outline-none cursor-pointer appearance-none transition-all duration-200 focus:bg-white focus:border-[#F47B20] hover:border-gray-300 shadow-sm ${getStatusColor(selectedOrder.status)}`}
                                                    value={selectedOrder.status}
                                                    onChange={(e) => handleStatusChange(selectedOrder._id, e.target.value)}
                                                    disabled={updatingStatus === selectedOrder._id}
                                                >
                                                    <option value="pending" className="text-gray-900 font-bold bg-white drop-shadow-sm">🟡 Pending</option>
                                                    <option value="processing" className="text-gray-900 font-bold bg-white drop-shadow-sm">🔵 Processing</option>
                                                    <option value="shipped" className="text-gray-900 font-bold bg-white drop-shadow-sm">🟣 Shipped</option>
                                                    <option value="delivered" className="text-gray-900 font-bold bg-white drop-shadow-sm">🟢 Delivered</option>
                                                    <option value="cancelled" className="text-gray-900 font-bold bg-white drop-shadow-sm">🔴 Cancelled</option>
                                                </select>
                                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                                    <ChevronDown size={20} strokeWidth={3} />
                                                </div>
                                            </div>
                                            {selectedOrder.status === 'pending' && <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mt-4 text-center text-balance">Changing to Shipped triggers stock deduction</p>}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
