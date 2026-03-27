"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, Trash2, Minus, Plus, ArrowLeft, MapPin, Truck, CheckCircle,
  ChevronDown, ChevronRight, X, Loader2, Tag, AlertCircle, Shield, Package,
  CreditCard, Clock, Star, Heart,
} from "lucide-react";
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

function formatPrice(n) {
  return Math.round(n).toLocaleString("en-IN");
}

/* ── Step indicator for cart → checkout flow ── */
function StepIndicator({ step }) {
  const steps = [
    { label: "Cart", icon: ShoppingBag },
    { label: "Checkout", icon: CreditCard },
    { label: "Confirm", icon: CheckCircle },
  ];
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8 sm:mb-10">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const active = i <= step;
        const current = i === step;
        return (
          <div key={s.label} className="flex items-center gap-1 sm:gap-2">
            {i > 0 && (
              <div className={`w-8 sm:w-14 h-[2px] rounded-full transition-colors ${i <= step ? "bg-purple-mid" : "bg-gray-200"}`} />
            )}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${current ? "bg-[#f26e21] text-white shadow-lg shadow-[#f26e21]/20" : active ? "bg-purple-mid text-white" : "bg-gray-100 text-text-muted"}`}>
                <Icon size={15} />
              </div>
              <span className={`text-xs sm:text-sm font-semibold hidden min-[480px]:inline ${current ? "text-purple-dark" : active ? "text-purple-mid" : "text-text-muted"}`}>
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

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

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [shippingZone, setShippingZone] = useState("inside");
  const [area, setArea] = useState("");
  const [district, setDistrict] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetch("/api/product?limit=200")
      .then((r) => r.json())
      .then((data) => {
        const prods = data.products || [];
        setDbProducts(prods.length > 0 ? prods : []);
        setLoading(false);
      })
      .catch(() => {
        setDbProducts([]);
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
        category: p.category || "",
        subcategory: p.subcategory || "",
        image: p.images && p.images.length > 0 ? p.images[0].url : (p.image || "/placeholder.png"),
        qty: item.qty
      };
    })
    .filter(Boolean);

  const cartIds = cartItems.map((i) => i.id);
  const newIds = cartIds.filter((id) => !knownIds.has(id));
  if (newIds.length > 0) {
    setKnownIds((prev) => {
      const next = new Set(prev);
      newIds.forEach((id) => next.add(id));
      return next;
    });
    if (buyNowId) {
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
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(cartItems.map((i) => i.id)));
  };

  const selectedItems = cartItems.filter((i) => selectedIds.has(i.id));
  const subtotal = selectedItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalSaved = selectedItems.reduce((sum, item) => sum + (item.originalPrice - item.price) * item.qty, 0);
  const shippingCost = shippingZone === "inside" ? SHIPPING_INSIDE_DHAKA : SHIPPING_OUTSIDE_DHAKA;

  const couponDiscount = (() => {
    if (!appliedCoupon) return 0;
    const c = appliedCoupon;
    let eligibleTotal = 0;
    if (c.scope === "all") {
      eligibleTotal = subtotal;
    } else if (c.scope === "category" && c.categories?.length > 0) {
      eligibleTotal = selectedItems.filter(i => c.categories.includes(i.category)).reduce((sum, i) => sum + i.price * i.qty, 0);
    } else if (c.scope === "subcategory" && c.subcategories?.length > 0) {
      eligibleTotal = selectedItems.filter(i => c.categories?.includes(i.category) && c.subcategories.includes(i.subcategory)).reduce((sum, i) => sum + i.price * i.qty, 0);
    } else if (c.scope === "product" && c.productIds?.length > 0) {
      eligibleTotal = selectedItems.filter(i => c.productIds.includes(String(i.id))).reduce((sum, i) => sum + i.price * i.qty, 0);
    }
    if (eligibleTotal <= 0 || eligibleTotal < (c.minOrderAmount || 0)) return 0;
    let disc = 0;
    if (c.discountType === "percent") {
      disc = (eligibleTotal * c.discountValue) / 100;
      if (c.maxDiscountAmount > 0) disc = Math.min(disc, c.maxDiscountAmount);
    } else {
      disc = Math.min(c.discountValue, eligibleTotal);
    }
    return Math.min(parseFloat(disc.toFixed(2)), subtotal);
  })();

  const total = Math.max(0, subtotal + shippingCost - couponDiscount);

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const itemsForValidation = selectedItems.map(i => ({ productId: i.id, price: i.price, quantity: i.qty, category: i.category || "", subcategory: i.subcategory || "" }));
      const params = new URLSearchParams({ code, total: subtotal.toString(), items: encodeURIComponent(JSON.stringify(itemsForValidation)) });
      const res = await fetch(`/api/coupon?${params}`);
      const data = await res.json();
      if (res.ok && data.valid) { setAppliedCoupon(data.coupon); setCouponInput(""); setCouponError(""); }
      else { setCouponError(data.reason || "Invalid coupon code"); setAppliedCoupon(null); }
    } catch { setCouponError("Failed to validate coupon."); } finally { setCouponLoading(false); }
  };

  const removeCoupon = () => { setAppliedCoupon(null); setCouponInput(""); setCouponError(""); };

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
        deliveryAddress: { fullName: name, email, phone, region: "Bangladesh", shippingZone, area: shippingZone === "inside" ? area : district, streetAddress },
        paymentMethod: "cash_on_delivery",
        couponCode: appliedCoupon?.code || "",
        items: selectedItems.map(item => ({ productId: item.id, name: item.name, brand: item.brand, price: item.price, originalPrice: item.originalPrice, quantity: item.qty, image: item.image, category: item.category || "", subcategory: item.subcategory || "" }))
      };
      try {
        const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(orderPayload) });
        await res.json();
      } catch {}
      setOrderedCount(selectedItems.length);
      selectedItems.forEach((item) => removeFromCart(item.id));
      setAppliedCoupon(null);
      setCouponInput("");
      setOrderPlaced(true);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ═══════════════════ ORDER CONFIRMED ═══════════════════ */
  if (orderPlaced) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center max-w-md w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-28 h-28 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-green-500/25"
          >
            <CheckCircle size={52} className="text-white" strokeWidth={1.5} />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-3xl md:text-4xl font-bold text-text-primary mb-3"
          >
            Order Placed!
          </motion.h1>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <p className="text-text-secondary mb-6 max-w-sm mx-auto leading-relaxed">
              Thank you, <span className="font-semibold text-text-primary">{name}</span>! Your order of{" "}
              <span className="font-semibold text-text-primary">{orderedCount} item{orderedCount !== 1 ? "s" : ""}</span> has been confirmed.
            </p>
            <div className="bg-gray-50 rounded-2xl p-5 mb-8 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Payment</span>
                <span className="font-semibold text-text-primary">Cash on Delivery</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Contact</span>
                <span className="font-semibold text-text-primary">{phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Total</span>
                <span className="font-bold text-purple-mid">Tk {formatPrice(total)}</span>
              </div>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-[#f26e21] hover:bg-[#e05e15] text-white text-sm font-semibold px-8 py-3.5 rounded-full transition-colors"
            >
              Continue Shopping
              <ChevronRight size={16} />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  /* ═══════════════════ MAIN CART PAGE ═══════════════════ */
  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2"
      >
        <div className="flex items-center gap-2 text-xs text-text-muted mb-4">
          <Link href="/" className="hover:text-purple-mid transition-colors">Home</Link>
          <ChevronRight size={12} />
          <span className="text-text-primary font-medium">{showCheckout ? "Checkout" : "Cart"}</span>
        </div>
      </motion.div>

      {/* Step Indicator */}
      <StepIndicator step={orderPlaced ? 2 : showCheckout ? 1 : 0} />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="animate-spin text-purple-mid" size={36} />
          <p className="text-sm text-text-muted">Loading your cart...</p>
        </div>
      ) : cartItems.length === 0 ? (
        /* ── Empty State ── */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 sm:py-24"
        >
          <div className="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-6">
            <ShoppingBag size={36} className="text-text-muted -rotate-6" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Your cart is empty</h2>
          <p className="text-text-secondary text-sm mb-8 max-w-xs mx-auto">
            Looks like you haven't added anything to your cart yet. Let's fix that!
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#f26e21] hover:bg-[#e05e15] text-white text-sm font-semibold px-7 py-3.5 rounded-full transition-colors"
          >
            <ArrowLeft size={15} />
            Start Shopping
          </Link>
        </motion.div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* ════════════ LEFT COLUMN ════════════ */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {!showCheckout ? (
                <motion.div key="cart" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                  {/* Cart Header Bar */}
                  <div className="flex items-center justify-between mb-4">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="w-[18px] h-[18px] accent-purple-mid rounded cursor-pointer"
                      />
                      <span className="text-sm font-semibold text-text-primary">
                        Select All <span className="text-text-muted font-normal">({selectedIds.size}/{cartItems.length})</span>
                      </span>
                    </label>
                    <button
                      onClick={clearCart}
                      className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-colors"
                    >
                      <Trash2 size={13} />
                      Clear All
                    </button>
                  </div>

                  {/* Cart Items */}
                  <div className="space-y-3">
                    <AnimatePresence>
                      {cartItems.map((item, i) => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100, height: 0, marginBottom: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.05 }}
                          className={`bg-white rounded-2xl border overflow-hidden transition-all ${selectedIds.has(item.id) ? "border-purple-mid/20 shadow-sm" : "border-gray-100 opacity-60"}`}
                        >
                          <div className="flex gap-3 sm:gap-4 p-3 sm:p-4">
                            {/* Checkbox */}
                            <div className="flex flex-col items-center gap-2 pt-1">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(item.id)}
                                onChange={() => toggleSelect(item.id)}
                                className="w-[18px] h-[18px] accent-purple-mid rounded cursor-pointer"
                              />
                            </div>

                            {/* Product Image */}
                            <Link href={`/product/${item.id}`} className="flex-shrink-0">
                              <div className="relative w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] bg-offwhite rounded-xl overflow-hidden group">
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  fill
                                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                                  sizes="100px"
                                />
                                {item.originalPrice > item.price && (
                                  <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                                    -{Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}%
                                  </span>
                                )}
                              </div>
                            </Link>

                            {/* Info */}
                            <div className="flex-1 min-w-0 flex flex-col">
                              <Link href={`/product/${item.id}`}>
                                <p className="text-[10px] text-purple-mid font-bold uppercase tracking-wider mb-0.5">{item.brand}</p>
                                <h3 className="text-sm sm:text-[15px] font-semibold text-text-primary leading-snug line-clamp-2 hover:text-purple-dark transition-colors">
                                  {item.name}
                                </h3>
                              </Link>

                              {/* Prices */}
                              <div className="flex items-baseline gap-2 mt-1.5">
                                <span className="text-base sm:text-lg font-bold text-text-primary">Tk {formatPrice(item.price)}</span>
                                {item.originalPrice > item.price && (
                                  <span className="text-xs text-text-muted line-through">Tk {formatPrice(item.originalPrice)}</span>
                                )}
                              </div>

                              {/* Bottom: Qty + Delete */}
                              <div className="flex items-center justify-between mt-auto pt-2">
                                <div className="flex items-center bg-gray-50 rounded-full border border-gray-200">
                                  <button
                                    onClick={() => updateQty(item.id, item.qty - 1)}
                                    className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-text-secondary hover:text-purple-mid transition-colors rounded-full hover:bg-gray-100"
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <span className="w-8 sm:w-10 text-center text-sm font-bold">{item.qty}</span>
                                  <button
                                    onClick={() => updateQty(item.id, item.qty + 1)}
                                    className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-text-secondary hover:text-purple-mid transition-colors rounded-full hover:bg-gray-100"
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="text-sm sm:text-base font-bold text-text-primary hidden sm:block">
                                    Tk {formatPrice(item.price * item.qty)}
                                  </span>
                                  <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Continue Shopping */}
                  <Link href="/" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-purple-mid transition-colors mt-5 font-medium">
                    <ArrowLeft size={16} />
                    Continue Shopping
                  </Link>
                </motion.div>
              ) : (
                <motion.div key="checkout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                  {/* Back to Cart */}
                  <button
                    onClick={() => setShowCheckout(false)}
                    className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-purple-mid transition-colors mb-5 font-medium"
                  >
                    <ArrowLeft size={16} />
                    Back to Cart
                  </button>

                  {/* Checkout Form */}
                  <div className="space-y-5">
                    {/* COD Badge */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl px-5 py-4"
                    >
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Truck size={20} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-green-800">Cash on Delivery</p>
                        <p className="text-xs text-green-600">Pay when your order arrives at your doorstep</p>
                      </div>
                    </motion.div>

                    {/* Personal Info Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6"
                    >
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 bg-purple-soft rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-purple-mid">1</span>
                        </div>
                        <h3 className="text-base font-bold text-text-primary">Personal Information</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                            placeholder="Enter your full name"
                            className={`w-full border-2 rounded-xl px-4 py-3 text-sm outline-none transition-all ${errors.name ? "border-red-300 bg-red-50/30 focus:border-red-400" : "border-gray-100 focus:border-purple-mid bg-gray-50/50 focus:bg-white"}`}
                          />
                          {errors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.name}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                            Email <span className="text-text-muted font-normal">(optional)</span>
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-mid bg-gray-50/50 focus:bg-white transition-all"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                            Phone Number <span className="text-red-500">*</span>
                          </label>
                          <div className="flex">
                            <span className="flex items-center px-4 bg-gray-100 border-2 border-r-0 border-gray-100 rounded-l-xl text-sm text-text-muted font-semibold">+880</span>
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 11)); setErrors((p) => ({ ...p, phone: undefined })); }}
                              placeholder="01XXXXXXXXX"
                              className={`flex-1 border-2 rounded-r-xl px-4 py-3 text-sm outline-none transition-all ${errors.phone ? "border-red-300 bg-red-50/30 focus:border-red-400" : "border-gray-100 focus:border-purple-mid bg-gray-50/50 focus:bg-white"}`}
                            />
                          </div>
                          {errors.phone && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.phone}</p>}
                        </div>
                      </div>
                    </motion.div>

                    {/* Delivery Address Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6"
                    >
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 bg-purple-soft rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-purple-mid">2</span>
                        </div>
                        <h3 className="text-base font-bold text-text-primary">Delivery Address</h3>
                      </div>

                      <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-text-primary mb-5">
                        <MapPin size={16} className="text-purple-mid" />
                        <span className="font-medium">Bangladesh</span>
                      </div>

                      <label className="block text-xs font-semibold text-text-secondary mb-2.5 uppercase tracking-wide">
                        Shipping Zone <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <button
                          onClick={() => { setShippingZone("inside"); setDistrict(""); setErrors((p) => ({ ...p, area: undefined, district: undefined })); }}
                          className={`relative flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all overflow-hidden ${shippingZone === "inside"
                            ? "border-purple-mid bg-purple-soft/40 shadow-sm shadow-purple-mid/10"
                            : "border-gray-100 hover:border-gray-200 bg-gray-50/50"
                            }`}
                        >
                          {shippingZone === "inside" && <div className="absolute top-2 right-2"><CheckCircle size={16} className="text-purple-mid" /></div>}
                          <Truck size={22} className={shippingZone === "inside" ? "text-purple-mid" : "text-text-muted"} />
                          <span className={`text-sm font-bold ${shippingZone === "inside" ? "text-purple-dark" : "text-text-primary"}`}>Inside Dhaka</span>
                          <span className={`text-xs font-semibold ${shippingZone === "inside" ? "text-purple-mid" : "text-text-muted"}`}>Tk {SHIPPING_INSIDE_DHAKA}</span>
                        </button>
                        <button
                          onClick={() => { setShippingZone("outside"); setArea(""); setErrors((p) => ({ ...p, area: undefined, district: undefined })); }}
                          className={`relative flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all overflow-hidden ${shippingZone === "outside"
                            ? "border-purple-mid bg-purple-soft/40 shadow-sm shadow-purple-mid/10"
                            : "border-gray-100 hover:border-gray-200 bg-gray-50/50"
                            }`}
                        >
                          {shippingZone === "outside" && <div className="absolute top-2 right-2"><CheckCircle size={16} className="text-purple-mid" /></div>}
                          <Truck size={22} className={shippingZone === "outside" ? "text-purple-mid" : "text-text-muted"} />
                          <span className={`text-sm font-bold ${shippingZone === "outside" ? "text-purple-dark" : "text-text-primary"}`}>Outside Dhaka</span>
                          <span className={`text-xs font-semibold ${shippingZone === "outside" ? "text-purple-mid" : "text-text-muted"}`}>Tk {SHIPPING_OUTSIDE_DHAKA}</span>
                        </button>
                      </div>

                      {shippingZone === "inside" ? (
                        <div className="mb-5">
                          <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                            Area / Town <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <select
                              value={area}
                              onChange={(e) => { setArea(e.target.value); setErrors((p) => ({ ...p, area: undefined })); }}
                              className={`w-full appearance-none border-2 rounded-xl px-4 py-3 text-sm outline-none transition-all pr-10 ${errors.area ? "border-red-300 bg-red-50/30" : "border-gray-100 focus:border-purple-mid bg-gray-50/50 focus:bg-white"} ${!area ? "text-text-muted" : "text-text-primary"}`}
                            >
                              <option value="">Select your area</option>
                              {dhakaAreas.map((a) => <option key={a} value={a}>{a}</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                          </div>
                          {errors.area && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.area}</p>}
                        </div>
                      ) : (
                        <div className="mb-5">
                          <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                            District <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <select
                              value={district}
                              onChange={(e) => { setDistrict(e.target.value); setErrors((p) => ({ ...p, district: undefined })); }}
                              className={`w-full appearance-none border-2 rounded-xl px-4 py-3 text-sm outline-none transition-all pr-10 ${errors.district ? "border-red-300 bg-red-50/30" : "border-gray-100 focus:border-purple-mid bg-gray-50/50 focus:bg-white"} ${!district ? "text-text-muted" : "text-text-primary"}`}
                            >
                              <option value="">Select your district</option>
                              {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                          </div>
                          {errors.district && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.district}</p>}
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                          Street Address <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={streetAddress}
                          onChange={(e) => { setStreetAddress(e.target.value); setErrors((p) => ({ ...p, streetAddress: undefined })); }}
                          placeholder="House no, Road, Block, Area details..."
                          rows={3}
                          className={`w-full border-2 rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none ${errors.streetAddress ? "border-red-300 bg-red-50/30" : "border-gray-100 focus:border-purple-mid bg-gray-50/50 focus:bg-white"}`}
                        />
                        {errors.streetAddress && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.streetAddress}</p>}
                      </div>
                    </motion.div>

                    {/* Order Items Review Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-purple-soft rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-purple-mid">3</span>
                        </div>
                        <h3 className="text-base font-bold text-text-primary">Review Items ({selectedItems.length})</h3>
                      </div>
                      <div className="space-y-3">
                        {selectedItems.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                            <div className="relative w-12 h-12 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                              <Image src={item.image} alt={item.name} fill className="object-cover" sizes="48px" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-text-primary line-clamp-1">{item.name}</p>
                              <p className="text-xs text-text-muted">Qty: {item.qty} x Tk {formatPrice(item.price)}</p>
                            </div>
                            <span className="text-sm font-bold text-text-primary flex-shrink-0">
                              Tk {formatPrice(item.price * item.qty)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ════════════ RIGHT COLUMN — ORDER SUMMARY ════════════ */}
          <div className="lg:w-[380px]">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden sticky top-20">
              {/* Summary Header */}
              <div className="bg-gradient-to-r from-[#111111] to-[#222222] px-6 py-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Package size={18} className="text-purple-light" />
                  Order Summary
                </h2>
              </div>

              <div className="p-5 sm:p-6">
                {/* Price Breakdown */}
                <div className="space-y-3 mb-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Subtotal <span className="text-text-muted">({selectedItems.length} items)</span></span>
                    <span className="font-semibold text-text-primary">Tk {formatPrice(subtotal)}</span>
                  </div>
                  {totalSaved > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-600 flex items-center gap-1"><Tag size={13} /> Discount</span>
                      <span className="font-semibold text-green-600">- Tk {formatPrice(totalSaved)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary flex items-center gap-1">
                      <Truck size={13} /> Shipping
                      {showCheckout && <span className="text-[11px] text-text-muted">({shippingZone === "inside" ? "Dhaka" : "Outside"})</span>}
                    </span>
                    <span className="font-semibold text-text-primary">Tk {shippingCost}</span>
                  </div>
                  {appliedCoupon && couponDiscount > 0 && (
                    <div className="flex items-center justify-between text-sm bg-green-50 -mx-1 px-2 py-1.5 rounded-lg">
                      <span className="text-green-700 font-medium flex items-center gap-1">
                        <Tag size={13} /> {appliedCoupon.code}
                      </span>
                      <span className="font-bold text-green-600">- Tk {formatPrice(couponDiscount)}</span>
                    </div>
                  )}
                </div>

                {/* Coupon Input */}
                <div className="mb-5">
                  {!appliedCoupon ? (
                    <>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                          <input
                            value={couponInput}
                            onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                            onKeyDown={e => e.key === "Enter" && applyCoupon()}
                            placeholder="Coupon code"
                            className="w-full border-2 border-gray-100 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-purple-mid font-mono uppercase transition-all bg-gray-50/50 focus:bg-white"
                          />
                        </div>
                        <button
                          onClick={applyCoupon}
                          disabled={!couponInput.trim() || couponLoading}
                          className="px-5 py-2.5 bg-[#f26e21] hover:bg-[#e05e15] disabled:bg-gray-200 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors flex-shrink-0"
                        >
                          {couponLoading ? <Loader2 size={16} className="animate-spin" /> : "Apply"}
                        </button>
                      </div>
                      {couponError && (
                        <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {couponError}</p>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-green-600" />
                        <div>
                          <p className="text-xs font-bold text-green-800">{appliedCoupon.code} applied</p>
                          <p className="text-[11px] text-green-600">You save Tk {formatPrice(couponDiscount)}</p>
                        </div>
                      </div>
                      <button onClick={removeCoupon} className="text-gray-400 hover:text-red-500 transition-colors"><X size={16} /></button>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="border-t-2 border-dashed border-gray-100 pt-4 mb-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-text-primary uppercase tracking-wide">Total</span>
                    <div className="text-right">
                      {couponDiscount > 0 && (
                        <p className="text-xs line-through text-text-muted mb-0.5">Tk {formatPrice(subtotal + shippingCost)}</p>
                      )}
                      <span className="text-2xl font-black text-text-primary">Tk {formatPrice(total)}</span>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                {!showCheckout ? (
                  <>
                    {selectedItems.length === 0 && cartItems.length > 0 && (
                      <p className="text-xs text-orange-600 font-medium text-center mb-3 flex items-center justify-center gap-1">
                        <AlertCircle size={12} /> Select items to checkout
                      </p>
                    )}
                    <motion.button
                      whileHover={{ scale: selectedItems.length > 0 ? 1.01 : 1 }}
                      whileTap={{ scale: selectedItems.length > 0 ? 0.98 : 1 }}
                      onClick={() => setShowCheckout(true)}
                      disabled={selectedItems.length === 0}
                      className={`w-full text-sm font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 ${selectedItems.length === 0
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-[#f26e21] hover:bg-[#e05e15] text-white shadow-lg shadow-[#f26e21]/25 hover:shadow-xl hover:shadow-[#e05e15]/35 border border-[#e05e15]"
                        }`}
                    >
                      <span className={selectedItems.length > 0 ? "text-white" : ""}>
                        Proceed to Checkout ({selectedItems.length})
                      </span>
                      <ChevronRight size={16} className={selectedItems.length > 0 ? "text-white" : ""} />
                    </motion.button>
                  </>
                ) : (
                  <motion.button
                    whileHover={{ scale: isSubmitting ? 1 : 1.01 }}
                    whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting}
                    className={`w-full text-white text-sm font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 ${isSubmitting
                      ? "bg-green-700/70 cursor-not-allowed"
                      : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-600/20"
                      }`}
                  >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                    {isSubmitting ? "Placing Order..." : `Confirm Order  —  Tk ${formatPrice(total)}`}
                  </motion.button>
                )}

                {/* Trust badges */}
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-[11px] text-text-muted">
                      <Shield size={14} className="text-green-500 flex-shrink-0" />
                      <span>Secure Checkout</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-text-muted">
                      <Truck size={14} className="text-orange-500 flex-shrink-0" />
                      <span>Fast Delivery</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-text-muted">
                      <Package size={14} className="text-orange-500 flex-shrink-0" />
                      <span>Easy Returns</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-text-muted">
                      <Clock size={14} className="text-purple-mid flex-shrink-0" />
                      <span>24/7 Support</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
