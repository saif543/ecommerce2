"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Trash2, Minus, Plus, ArrowLeft, MapPin, Truck, CheckCircle, ChevronDown, X, Loader2 } from "lucide-react";
import { useCart } from "@/context/CartContext";

const dhakaAreas = [
  "Dhanmondi", "Gulshan", "Banani", "Uttara", "Mirpur", "Mohammadpur", "Tejgaon",
  "Motijheel", "Paltan", "Wari", "Jatrabari", "Demra", "Badda", "Rampura",
  "Khilgaon", "Bashundhara", "Baridhara", "Cantonment", "Kafrul", "Pallabi",
  "Shahbag", "Farmgate", "Karwan Bazar", "Kawran Bazar", "Lalmatia", "Kalabagan",
  "Elephant Road", "New Market", "Azimpur", "Lalbagh", "Keraniganj", "Savar",
  "Tongi", "Gazipur Sadar", "Narayanganj Sadar", "Siddhirganj",
];

const districts = [
  "Bagerhat", "Bandarban", "Barguna", "Barisal", "Bhola", "Bogra", "Brahmanbaria",
  "Chandpur", "Chapainawabganj", "Chattogram", "Chuadanga", "Comilla", "Cox's Bazar",
  "Dinajpur", "Faridpur", "Feni", "Gaibandha", "Gazipur", "Gopalganj", "Habiganj",
  "Jamalpur", "Jessore", "Jhalokathi", "Jhenaidah", "Joypurhat", "Khagrachari",
  "Khulna", "Kishoreganj", "Kurigram", "Kushtia", "Lakshmipur", "Lalmonirhat",
  "Madaripur", "Magura", "Manikganj", "Meherpur", "Moulvibazar", "Munshiganj",
  "Mymensingh", "Naogaon", "Narail", "Narayanganj", "Narsingdi", "Natore",
  "Nawabganj", "Netrokona", "Nilphamari", "Noakhali", "Pabna", "Panchagarh",
  "Patuakhali", "Pirojpur", "Rajbari", "Rajshahi", "Rangamati", "Rangpur",
  "Satkhira", "Shariatpur", "Sherpur", "Sirajganj", "Sunamganj", "Sylhet",
  "Tangail", "Thakurgaon",
];

const SHIPPING_INSIDE_DHAKA = 60;
const SHIPPING_OUTSIDE_DHAKA = 120;

export default function CartPage() {
  const { cart, removeFromCart, updateQty, clearCart } = useCart();
  const searchParams = useSearchParams();
  const [dbProducts, setDbProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [knownIds, setKnownIds] = useState(new Set());
  const buyNowId = searchParams.get("buyNowId");
  const [showCheckout, setShowCheckout] = useState(searchParams.get("checkout") === "true");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderedCount, setOrderedCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [shippingZone, setShippingZone] = useState("inside"); // "inside" | "outside"
  const [area, setArea] = useState("");
  const [district, setDistrict] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetch("/api/product?limit=200")
      .then((r) => r.json())
      .then((data) => {
        setDbProducts(data.products || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch products for cart:", err);
        setLoading(false);
      });
  }, []);

  const cartItems = cart
    .map((item) => {
      const p = dbProducts.find((prod) => String(prod._id || prod.id) === String(item.id));
      if (!p) return null;
      const regularPrice = p.price || 0;
      const salePrice = (p.discount && p.discount > 0 && p.discount < regularPrice) ? p.discount : regularPrice;

      return {
        id: String(p._id || p.id),
        name: p.name,
        price: salePrice,
        originalPrice: regularPrice,
        brand: p.customFields?.brand || p.brand || p.category || "",
        image: p.images && p.images.length > 0 ? p.images[0].url : (p.image || "/placeholder.png"),
        qty: item.qty
      };
    })
    .filter(Boolean);

  // Auto-select logic: if Buy Now mode, select only that item; otherwise select new items
  const cartIds = cartItems.map((i) => i.id);
  const newIds = cartIds.filter((id) => !knownIds.has(id));
  if (newIds.length > 0) {
    setKnownIds((prev) => {
      const next = new Set(prev);
      newIds.forEach((id) => next.add(id));
      return next;
    });
    if (buyNowId) {
      // Buy Now mode: only select the buy-now item
      setSelectedIds(new Set([buyNowId]));
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        newIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = cartItems.length > 0 && cartItems.every((i) => selectedIds.has(i.id));
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cartItems.map((i) => i.id)));
    }
  };

  const selectedItems = cartItems.filter((i) => selectedIds.has(i.id));
  const subtotal = selectedItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalSaved = selectedItems.reduce(
    (sum, item) => sum + (item.originalPrice - item.price) * item.qty,
    0
  );
  const shippingCost = shippingZone === "inside" ? SHIPPING_INSIDE_DHAKA : SHIPPING_OUTSIDE_DHAKA;
  const total = subtotal + shippingCost;

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!phone.trim()) errs.phone = "Phone number is required";
    else if (!/^01[3-9]\d{8}$/.test(phone.trim())) errs.phone = "Enter a valid BD phone number (01XXXXXXXXX)";
    if (!streetAddress.trim()) errs.streetAddress = "Street address is required";
    if (shippingZone === "inside" && !area) errs.area = "Please select your area";
    if (shippingZone === "outside" && !district) errs.district = "Please select your district";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const orderPayload = {
        deliveryAddress: {
          fullName: name,
          email: email,
          phone: phone,
          region: "Bangladesh",
          shippingZone: shippingZone,
          area: shippingZone === "inside" ? area : district,
          streetAddress: streetAddress
        },
        paymentMethod: "cash_on_delivery",
        items: selectedItems.map(item => ({
          productId: item.id,
          name: item.name,
          brand: item.brand,
          price: item.price,
          originalPrice: item.originalPrice,
          quantity: item.qty,
          image: item.image
        }))
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to place order");

      setOrderedCount(selectedItems.length);
      selectedItems.forEach((item) => removeFromCart(item.id));
      setOrderPlaced(true);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderPlaced) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-12">
        <div className="text-center py-20">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle size={48} className="text-green-600" />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-semibold text-text-primary mb-3">Order Confirmed!</h1>
          <p className="text-text-secondary mb-2 max-w-md mx-auto">
            Thank you, <span className="font-semibold text-text-primary">{name}</span>! Your order of {orderedCount} item{orderedCount !== 1 ? "s" : ""} has been placed successfully.
          </p>
          <p className="text-text-secondary mb-1 text-sm">Payment Method: <span className="font-semibold text-text-primary">Cash on Delivery</span></p>
          <p className="text-text-secondary mb-8 text-sm">We'll contact you at <span className="font-semibold text-text-primary">{phone}</span> to confirm.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-purple-dark hover:bg-purple-mid text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold text-text-primary mb-2">
          {showCheckout ? "Checkout" : "Shopping Cart"}
        </h1>
        <p className="text-text-secondary text-sm">
          {cartItems.length > 0
            ? showCheckout
              ? "Fill in your details to confirm your order"
              : `${cartItems.length} item${cartItems.length !== 1 ? "s" : ""} in your cart`
            : "Your cart is empty"}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-32">
          <Loader2 className="animate-spin text-purple-mid" size={40} />
        </div>
      ) : cartItems.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <ShoppingCart size={32} className="text-text-muted" />
          </div>
          <p className="text-text-secondary mb-6">
            You haven't added anything to your cart yet.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-purple-dark hover:bg-purple-mid text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            <ArrowLeft size={15} />
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Side */}
          <div className="flex-1">
            {!showCheckout ? (
              <>
                {/* Cart Items */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 accent-purple-mid rounded cursor-pointer"
                      />
                      <span className="text-sm font-semibold text-text-primary">
                        Select All ({selectedIds.size}/{cartItems.length})
                      </span>
                    </label>
                    <button
                      onClick={clearCart}
                      className="text-sm font-semibold text-red-500 hover:text-red-600 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>

                  <AnimatePresence>
                    {cartItems.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="border-b border-gray-50 last:border-b-0"
                      >
                        <div className={`flex items-center gap-4 p-4 sm:p-5 transition-colors ${selectedIds.has(item.id) ? "" : "opacity-60"}`}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            className="w-4 h-4 accent-purple-mid rounded cursor-pointer flex-shrink-0"
                          />
                          <Link href={`/product/${item.id}`} className="flex-shrink-0">
                            <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-offwhite rounded-lg overflow-hidden">
                              <Image src={item.image} alt={item.name} fill className="object-cover" sizes="96px" />
                            </div>
                          </Link>

                          <div className="flex-1 min-w-0">
                            <Link href={`/product/${item.id}`}>
                              <p className="text-[10px] sm:text-[11px] text-purple-mid font-semibold uppercase tracking-wider mb-0.5">
                                {item.brand}
                              </p>
                              <h3 className="text-sm sm:text-base font-semibold text-text-primary mb-1 leading-snug line-clamp-1 hover:text-purple-dark transition-colors">
                                {item.name}
                              </h3>
                            </Link>
                            <div className="flex items-baseline gap-2 mb-2">
                              <span className="text-sm sm:text-base font-bold text-orange-600">Tk {item.price.toFixed(2)}</span>
                              <span className="text-[10px] sm:text-xs text-text-muted line-through">Tk {item.originalPrice.toFixed(2)}</span>
                            </div>

                            {/* Mobile qty */}
                            <div className="flex items-center gap-3 sm:hidden">
                              <div className="flex items-center border border-gray-200 rounded-md">
                                <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-purple-mid transition-colors">
                                  <Minus size={14} />
                                </button>
                                <span className="w-8 text-center text-xs font-semibold">{item.qty}</span>
                                <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-purple-mid transition-colors">
                                  <Plus size={14} />
                                </button>
                              </div>
                              <button onClick={() => removeFromCart(item.id)} className="p-1.5 text-red-400 hover:text-red-600 transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Desktop qty */}
                          <div className="hidden sm:flex items-center border border-gray-200 rounded-lg">
                            <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-purple-mid transition-colors">
                              <Minus size={14} />
                            </button>
                            <span className="w-10 text-center text-sm font-semibold">{item.qty}</span>
                            <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-purple-mid transition-colors">
                              <Plus size={14} />
                            </button>
                          </div>

                          {/* Desktop total + remove */}
                          <div className="hidden sm:flex flex-col items-end gap-2">
                            <span className="text-base font-bold text-text-primary">Tk {(item.price * item.qty).toFixed(2)}</span>
                            <button onClick={() => removeFromCart(item.id)} className="p-1.5 rounded-md border border-red-200 hover:bg-red-50 transition-colors">
                              <Trash2 size={14} className="text-red-400" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <Link href="/" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-purple-mid transition-colors mt-5">
                  <ArrowLeft size={16} />
                  Continue Shopping
                </Link>
              </>
            ) : (
              <>
                {/* Checkout Form */}
                <button
                  onClick={() => setShowCheckout(false)}
                  className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-purple-mid transition-colors mb-5"
                >
                  <ArrowLeft size={16} />
                  Back to Cart
                </button>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-7">
                  {/* Payment badge */}
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-7">
                    <Truck size={20} className="text-green-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">Cash on Delivery</p>
                      <p className="text-xs text-green-600">Pay when your order arrives at your doorstep</p>
                    </div>
                  </div>

                  {/* Personal Info */}
                  <h3 className="text-base font-bold text-text-primary mb-4">Personal Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                        placeholder="Enter your full name"
                        className={`w-full border rounded-lg px-4 py-3 text-sm outline-none transition-colors ${errors.name ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-purple-mid"}`}
                      />
                      {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">
                        Email <span className="text-text-muted text-xs">(optional)</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-purple-mid transition-colors"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-text-primary mb-1.5">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="flex">
                        <span className="flex items-center px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-sm text-text-muted font-medium">+880</span>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 11)); setErrors((p) => ({ ...p, phone: undefined })); }}
                          placeholder="01XXXXXXXXX"
                          className={`flex-1 border rounded-r-lg px-4 py-3 text-sm outline-none transition-colors ${errors.phone ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-purple-mid"}`}
                        />
                      </div>
                      {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                    </div>
                  </div>

                  {/* Shipping Zone */}
                  <h3 className="text-base font-bold text-text-primary mb-4">Delivery Address</h3>

                  <div className="mb-5">
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Region
                    </label>
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-text-primary">
                      <MapPin size={16} className="text-purple-mid" />
                      Bangladesh
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Shipping Zone <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => { setShippingZone("inside"); setDistrict(""); setErrors((p) => ({ ...p, area: undefined, district: undefined })); }}
                        className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all ${shippingZone === "inside"
                          ? "border-purple-mid bg-purple-soft/30"
                          : "border-gray-200 hover:border-gray-300"
                          }`}
                      >
                        <Truck size={20} className={shippingZone === "inside" ? "text-purple-mid" : "text-text-muted"} />
                        <span className={`text-sm font-semibold ${shippingZone === "inside" ? "text-purple-dark" : "text-text-primary"}`}>Inside Dhaka</span>
                        <span className={`text-xs font-bold ${shippingZone === "inside" ? "text-purple-mid" : "text-text-muted"}`}>Tk {SHIPPING_INSIDE_DHAKA}</span>
                      </button>
                      <button
                        onClick={() => { setShippingZone("outside"); setArea(""); setErrors((p) => ({ ...p, area: undefined, district: undefined })); }}
                        className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all ${shippingZone === "outside"
                          ? "border-purple-mid bg-purple-soft/30"
                          : "border-gray-200 hover:border-gray-300"
                          }`}
                      >
                        <Truck size={20} className={shippingZone === "outside" ? "text-purple-mid" : "text-text-muted"} />
                        <span className={`text-sm font-semibold ${shippingZone === "outside" ? "text-purple-dark" : "text-text-primary"}`}>Outside Dhaka</span>
                        <span className={`text-xs font-bold ${shippingZone === "outside" ? "text-purple-mid" : "text-text-muted"}`}>Tk {SHIPPING_OUTSIDE_DHAKA}</span>
                      </button>
                    </div>
                  </div>

                  {/* Location Dropdown */}
                  {shippingZone === "inside" ? (
                    <div className="mb-5">
                      <label className="block text-sm font-medium text-text-primary mb-1.5">
                        Area / Town <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={area}
                          onChange={(e) => { setArea(e.target.value); setErrors((p) => ({ ...p, area: undefined })); }}
                          className={`w-full appearance-none border rounded-lg px-4 py-3 text-sm outline-none transition-colors pr-10 ${errors.area ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-purple-mid"
                            } ${!area ? "text-text-muted" : "text-text-primary"}`}
                        >
                          <option value="">Select your area</option>
                          {dhakaAreas.map((a) => (
                            <option key={a} value={a}>{a}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                      </div>
                      {errors.area && <p className="text-xs text-red-500 mt-1">{errors.area}</p>}
                    </div>
                  ) : (
                    <div className="mb-5">
                      <label className="block text-sm font-medium text-text-primary mb-1.5">
                        District <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={district}
                          onChange={(e) => { setDistrict(e.target.value); setErrors((p) => ({ ...p, district: undefined })); }}
                          className={`w-full appearance-none border rounded-lg px-4 py-3 text-sm outline-none transition-colors pr-10 ${errors.district ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-purple-mid"
                            } ${!district ? "text-text-muted" : "text-text-primary"}`}
                        >
                          <option value="">Select your district</option>
                          {districts.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                      </div>
                      {errors.district && <p className="text-xs text-red-500 mt-1">{errors.district}</p>}
                    </div>
                  )}

                  {/* Street Address */}
                  <div className="mb-7">
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={streetAddress}
                      onChange={(e) => { setStreetAddress(e.target.value); setErrors((p) => ({ ...p, streetAddress: undefined })); }}
                      placeholder="House no, Road, Block, Area details..."
                      rows={3}
                      className={`w-full border rounded-lg px-4 py-3 text-sm outline-none transition-colors resize-none ${errors.streetAddress ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-purple-mid"
                        }`}
                    />
                    {errors.streetAddress && <p className="text-xs text-red-500 mt-1">{errors.streetAddress}</p>}
                  </div>

                  {/* Order Items Summary */}
                  <h3 className="text-base font-bold text-text-primary mb-3">Order Items ({selectedItems.length})</h3>
                  <div className="space-y-3 mb-5">
                    {selectedItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="relative w-12 h-12 bg-offwhite rounded-lg overflow-hidden flex-shrink-0">
                          <Image src={item.image} alt={item.name} fill className="object-cover" sizes="48px" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary line-clamp-1">{item.name}</p>
                          <p className="text-xs text-text-muted">Qty: {item.qty}</p>
                        </div>
                        <span className="text-sm font-semibold text-text-primary flex-shrink-0">
                          Tk {(item.price * item.qty).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:w-[380px]">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h2 className="text-lg font-bold text-text-primary mb-5">Order Summary</h2>

              <div className="space-y-3 mb-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Subtotal ({selectedItems.length} of {cartItems.length} items)</span>
                  <span className="font-semibold text-text-primary">Tk {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Total Saved</span>
                  <span className="font-semibold text-green-600">- Tk {totalSaved.toFixed(0)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">
                    Shipping {showCheckout && <span className="text-xs">({shippingZone === "inside" ? "Inside Dhaka" : "Outside Dhaka"})</span>}
                  </span>
                  <span className="font-semibold text-text-primary">Tk {shippingCost}</span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-text-primary">Total</span>
                  <span className="text-xl font-bold text-orange-600">Tk {total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment method badge */}
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5 mb-5">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs font-semibold text-text-secondary">Cash on Delivery</span>
              </div>

              {!showCheckout ? (
                <>
                  {selectedItems.length === 0 && cartItems.length > 0 && (
                    <p className="text-xs text-orange-600 font-medium text-center mb-3">Select items to checkout</p>
                  )}
                  <button
                    onClick={() => setShowCheckout(true)}
                    disabled={selectedItems.length === 0}
                    className={`w-full text-sm font-semibold py-4 rounded-xl transition-colors mb-3 ${selectedItems.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-purple-dark hover:bg-purple-mid text-white"
                      }`}
                  >
                    Proceed to Checkout ({selectedItems.length})
                  </button>
                </>
              ) : (
                <button
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting}
                  className={`w-full text-white text-sm font-semibold py-4 rounded-xl transition-colors mb-3 flex items-center justify-center gap-2 ${isSubmitting ? "bg-green-700/70 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                    }`}
                >
                  {isSubmitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <CheckCircle size={18} />
                  )}
                  {isSubmitting ? "Placing Order..." : `Confirm Order — Tk ${total.toFixed(2)}`}
                </button>
              )}

              <p className="text-[11px] text-text-muted text-center">
                {showCheckout ? "You will pay upon delivery. No advance payment needed." : "Free shipping inside Dhaka for orders above Tk 5,000."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
