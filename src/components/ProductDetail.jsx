"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Minus,
  Plus,
  CheckCircle2,
  Zap,
  Shield,
  Truck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Share2,
  ShieldCheck,
  BadgeCheck,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import ProductCard from "./ProductCard";

function SpecTable({ specs }) {
  if (!specs || Object.keys(specs).length === 0) {
    return <div className="py-12 text-center text-xs min-[360px]:text-sm text-gray-400">No specifications available.</div>;
  }
  const hasGroups = Object.values(specs).some(v => typeof v === "object" && !Array.isArray(v));
  if (!hasGroups) {
    return Object.entries(specs).map(([key, value], i) => (
      <div key={key} className={`flex py-2.5 min-[360px]:py-3.5 px-3 min-[360px]:px-6 text-[11px] min-[360px]:text-sm ${i % 2 === 0 ? "bg-gray-50/60" : "bg-white"}`}>
        <div className="w-2/5 font-semibold text-gray-700 pr-2 min-[360px]:pr-4">{key}</div>
        <div className="w-3/5 text-gray-600">{typeof value === "object" ? JSON.stringify(value) : value}</div>
      </div>
    ));
  }
  let rowIndex = 0;
  return Object.entries(specs).map(([sectionName, sectionValue]) => {
    if (typeof sectionValue === "object" && !Array.isArray(sectionValue)) {
      return (
        <div key={sectionName}>
          <div className="bg-[#f26e21]/10 px-3 min-[360px]:px-6 py-2.5 min-[360px]:py-3 border-b border-[#f26e21]/15">
            <h3 className="text-xs min-[360px]:text-sm font-bold text-[#f26e21]">{sectionName}</h3>
          </div>
          {Object.entries(sectionValue).map(([key, value]) => {
            const bg = rowIndex++ % 2 === 0 ? "bg-gray-50/60" : "bg-white";
            return (
              <div key={key} className={`flex py-2.5 min-[360px]:py-3.5 px-3 min-[360px]:px-6 text-[11px] min-[360px]:text-sm ${bg}`}>
                <div className="w-2/5 font-semibold text-gray-700 pr-2 min-[360px]:pr-4">{key}</div>
                <div className="w-3/5 text-gray-600">{value}</div>
              </div>
            );
          })}
        </div>
      );
    }
    const bg = rowIndex++ % 2 === 0 ? "bg-gray-50/60" : "bg-white";
    return (
      <div key={sectionName} className={`flex py-2.5 min-[360px]:py-3.5 px-3 min-[360px]:px-6 text-[11px] min-[360px]:text-sm ${bg}`}>
        <div className="w-2/5 font-semibold text-gray-700 pr-2 min-[360px]:pr-4">{sectionName}</div>
        <div className="w-3/5 text-gray-600">{String(sectionValue)}</div>
      </div>
    );
  });
}

function formatPrice(n) {
  return Math.round(n).toLocaleString("en-IN");
}

// Brand logo via Google favicon — same map as BrandsPage
const brandDomains = {
  Samsung: "samsung.com",
  Apple: "apple.com",
  Nike: "nike.com",
  Adidas: "adidas.com",
  Puma: "puma.com",
  Sony: "sony.com",
  JBL: "jbl.com",
  Bose: "bose.com",
  Xiaomi: "mi.com",
  OnePlus: "oneplus.com",
  Realme: "realme.com",
  Boat: "boat-lifestyle.com",
};

function getBrandLogo(name) {
  const domain = brandDomains[name];
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

export default function ProductDetail({ product, relatedProducts = [] }) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [qty, setQty] = useState(1);
  const { addToCart } = useCart();
  const router = useRouter();

  // Zoom state
  const imageRef = useRef(null);
  const [zoomStyle, setZoomStyle] = useState({ transform: "scale(1)", transformOrigin: "center center" });

  const handleMouseMove = useCallback((e) => {
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomStyle({ transform: "scale(1.8)", transformOrigin: `${x}% ${y}%` });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setZoomStyle({ transform: "scale(1)", transformOrigin: "center center" });
  }, []);

  // Normalize DB fields
  const productId = product._id || product.id;
  const brandName = product.customFields?.brand || product.brand || product.category || "";

  // Price logic
  const regularPrice = product.price || 0;
  const salePrice =
    product.discount && product.discount > 0 && product.discount < regularPrice
      ? product.discount
      : regularPrice;
  const savedAmount = regularPrice - salePrice;
  const discountPct = regularPrice > 0 ? Math.round((savedAmount / regularPrice) * 100) : 0;

  // Build image list
  const allImages =
    product.images && product.images.length > 0
      ? product.images.map((img) => img.url).filter(Boolean)
      : [product.image, ...(product.gallery || [])].filter(Boolean);

  // Description
  const descriptionParagraphs = Array.isArray(product.longDescription)
    ? product.longDescription
    : (product.description || "").split("\n").filter((l) => l.trim());
  const shortDescription = Array.isArray(product.longDescription)
    ? product.description
    : (product.description || "").split("\n")[0] || "";
  const features = product.features || [];
  const specifications = product.specifications || {};
  const customFields = product.customFields
    ? Object.entries(product.customFields).filter(([k]) => k !== "brand")
    : [];

  const nextImage = () => setSelectedImage((prev) => (prev + 1) % allImages.length);
  const prevImage = () => setSelectedImage((prev) => (prev - 1 + allImages.length) % allImages.length);

  return (
    <section className="bg-gradient-to-b from-gray-50 to-white min-h-screen pb-24 lg:pb-16">
      {/* Breadcrumb */}
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 pt-4 pb-2">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Link href="/" className="hover:text-purple-mid transition-colors">Home</Link>
          <span>/</span>
          {product.category && (
            <>
              <Link href={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-purple-mid transition-colors">{product.category}</Link>
              <span>/</span>
            </>
          )}
          {brandName && (
            <>
              <span className="text-gray-500">{brandName}</span>
              <span>/</span>
            </>
          )}
          <span className="text-gray-600 truncate max-w-[200px]">{product.name}</span>
        </div>
      </div>

      {/* Main Product Section */}
      <div className="max-w-[1300px] mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col lg:flex-row">

            {/* Left — Gallery */}
            <div className="lg:w-[55%] p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col-reverse lg:flex-row gap-4">
                {/* Thumbnails */}
                <div className="flex lg:flex-col gap-2 lg:w-[68px] flex-shrink-0 overflow-x-auto lg:overflow-y-auto lg:max-h-[520px] scrollbar-hide">
                  {allImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`relative w-[60px] h-[60px] lg:w-[64px] lg:h-[72px] rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 bg-gray-50 ${
                        i === selectedImage
                          ? "border-purple-mid shadow-md ring-1 ring-purple-mid/30"
                          : "border-transparent hover:border-gray-300"
                      }`}
                    >
                      <Image src={img} alt={`Thumb ${i}`} fill className="object-contain p-1.5" sizes="64px" />
                    </button>
                  ))}
                </div>

                {/* Main Image */}
                <div className="flex-1 relative">
                  <div
                    className="relative rounded-xl bg-gray-50 flex items-center justify-center min-h-[350px] sm:min-h-[420px] lg:min-h-[520px] cursor-crosshair overflow-hidden group"
                    ref={imageRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  >
                    {/* Badges */}
                    <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
                      {product.badge && (
                        <span className="bg-[#f26e21] text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">
                          {product.badge}
                        </span>
                      )}
                      {discountPct > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                          -{discountPct}%
                        </span>
                      )}
                    </div>

                    {/* Share button */}
                    <button
                      onClick={() => navigator.clipboard?.writeText(window.location.href)}
                      className="absolute top-3 right-3 z-10 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-500 hover:text-purple-mid hover:bg-white transition-all shadow-sm"
                    >
                      <Share2 size={16} />
                    </button>

                    {/* Nav arrows */}
                    {allImages.length > 1 && (
                      <>
                        <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 hover:bg-white hover:text-black shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronLeft size={18} />
                        </button>
                        <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 hover:bg-white hover:text-black shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight size={18} />
                        </button>
                      </>
                    )}

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={selectedImage}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="absolute inset-0"
                      >
                        <div
                          className="w-full h-full relative"
                          style={{ ...zoomStyle, transition: "transform 0.15s ease-out" }}
                        >
                          <Image
                            src={allImages[selectedImage] || "/placeholder.png"}
                            alt={product.name}
                            fill
                            className="object-contain pointer-events-none p-4"
                            sizes="(max-width: 768px) 100vw, 55vw"
                            priority
                          />
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Image dots */}
                    {allImages.length > 1 && (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                        {allImages.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedImage(i)}
                            className={`w-2 h-2 rounded-full transition-all ${i === selectedImage ? "bg-purple-mid w-5" : "bg-gray-300 hover:bg-gray-400"}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right — Product Info */}
            <div className="lg:w-[45%] p-3 min-[360px]:p-4 sm:p-6 lg:p-8 lg:border-l border-gray-100 flex flex-col">
              {/* Brand */}
              {brandName && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-2 bg-[#f26e21]/10 border border-[#f26e21]/25 rounded-lg px-2.5 py-1.5">
                    {getBrandLogo(brandName) && (
                      <img
                        src={getBrandLogo(brandName)}
                        alt={brandName}
                        className="w-5 h-5 object-contain"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    )}
                    <span className="text-[11px] font-bold text-[#f26e21] uppercase tracking-widest">{brandName}</span>
                  </div>
                </div>
              )}

              {/* Title */}
              <h1 className="text-base min-[360px]:text-xl sm:text-2xl lg:text-[28px] font-bold text-gray-900 leading-snug mb-3 min-[360px]:mb-4">
                {product.name}
              </h1>

              {/* Price */}
              <div className="mb-4">
                <p className="text-xl min-[360px]:text-2xl sm:text-3xl font-bold text-gray-900 whitespace-nowrap">
                  BDT {formatPrice(salePrice)}
                </p>
                {savedAmount > 0 && (
                  <div className="flex items-center gap-1.5 min-[360px]:gap-2 mt-1 flex-wrap">
                    <span className="text-xs min-[360px]:text-sm text-gray-400 line-through whitespace-nowrap">
                      BDT {formatPrice(regularPrice)}
                    </span>
                    <span className="text-[10px] min-[360px]:text-xs font-semibold text-green-600 bg-green-50 px-1.5 min-[360px]:px-2 py-0.5 rounded-full whitespace-nowrap">
                      Save BDT {formatPrice(savedAmount)}
                    </span>
                  </div>
                )}
              </div>

              {/* Stock + WhatsApp */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span className="text-xs font-semibold text-green-600">In Stock</span>
                </div>
                <a
                  href={`https://wa.me/8801XXXXXXXXX?text=${encodeURIComponent(`Hi, I'm interested in ${product.name} (BDT ${formatPrice(salePrice)})`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1fb855] text-white text-[10px] min-[360px]:text-xs font-bold px-2.5 min-[360px]:px-4 py-1.5 min-[360px]:py-2 rounded-full whitespace-nowrap transition-all hover:shadow-[0_4px_12px_rgba(37,211,102,0.4)] active:translate-y-[1px]"
                >
                  <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4 flex-shrink-0">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </a>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100 mb-5" />

              {/* Short Description */}
              <p className="text-sm text-gray-600 leading-relaxed mb-5">
                {shortDescription || product.description}
              </p>

              {/* Features */}
              {features.length > 0 && (
                <div className="space-y-2.5 mb-6">
                  {features.slice(0, 5).map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <CheckCircle2 size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Warranty */}
              <div className="flex items-center gap-2 min-[360px]:gap-2.5 mt-1 mb-5 pt-4 border-t border-gray-100">
                <ShieldCheck size={18} className="text-[#f26e21] flex-shrink-0 min-[360px]:[width:20px] min-[360px]:[height:20px]" />
                <span className="text-xs min-[360px]:text-sm font-bold text-gray-800 whitespace-nowrap">1 Year Official Warranty</span>
                <BadgeCheck size={14} className="text-green-500 flex-shrink-0 min-[360px]:[width:16px] min-[360px]:[height:16px]" />
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Qty + Actions */}
              <div className="space-y-3 mt-4">
                {/* Quantity */}
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</span>
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden h-10">
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 h-full flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-100 transition-colors">
                      <Minus size={14} strokeWidth={2.5} />
                    </button>
                    <span className="w-10 text-center text-sm font-bold text-gray-800">{qty}</span>
                    <button onClick={() => setQty((q) => q + 1)} className="w-10 h-full flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-100 transition-colors">
                      <Plus size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                {/* Add to Cart */}
                <button
                  onClick={() => addToCart(productId, qty)}
                  className="w-full relative overflow-hidden bg-[#f26e21] hover:bg-[#e05e15] h-10 min-[360px]:h-12 rounded-xl text-xs min-[360px]:text-sm tracking-wider uppercase font-bold flex items-center justify-center gap-2 min-[360px]:gap-2.5 transition-all active:translate-y-[1px] shadow-[0_2px_8px_rgba(242,110,33,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] border border-[#e05e15]"
                >
                  <span className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/10 to-transparent rounded-t pointer-events-none" />
                  <ShoppingCart size={16} className="relative text-white" />
                  <span className="relative text-white">Add To Cart</span>
                </button>

                {/* Buy Now */}
                <button
                  onClick={() => {
                    addToCart(productId, qty);
                    router.push(`/cart?checkout=true&buyNowId=${productId}`);
                  }}
                  className="w-full border-2 border-purple-mid text-purple-mid hover:bg-purple-soft h-9 min-[360px]:h-11 rounded-xl text-[10px] min-[360px]:text-xs tracking-wider uppercase font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Zap size={14} /> Buy Now
                </button>
              </div>

              {/* Trust icons row */}
              <div className="flex items-center justify-between gap-1.5 min-[360px]:gap-2 mt-4 pt-4 border-t border-gray-100">
                {[
                  { icon: Truck, label: "Fast Delivery" },
                  { icon: Shield, label: "Genuine" },
                  { icon: RotateCcw, label: "Easy Returns" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1 min-[360px]:gap-1.5 flex-1 bg-[#f26e21]/8 border border-[#f26e21]/20 rounded-lg min-[360px]:rounded-xl py-2 min-[360px]:py-2.5 px-1 min-[360px]:px-2">
                    <Icon size={15} className="text-[#f26e21] min-[360px]:[width:18px] min-[360px]:[height:18px]" />
                    <span className="text-[8px] min-[360px]:text-[10px] font-bold text-gray-700 text-center leading-tight">{label}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>

        {/* Navigation Buttons — scroll to section */}
        <div className="mt-10 flex gap-3 sticky top-0 lg:static z-20 bg-gradient-to-b from-gray-50 via-gray-50 to-transparent lg:bg-none py-4">
          {["specification", "description"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                const el = document.getElementById(`section-${tab}`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="px-6 sm:px-8 py-2.5 text-[13px] font-bold tracking-wide rounded-full border transition-all capitalize bg-white text-gray-600 border-gray-200 hover:bg-[#f26e21] hover:text-white hover:border-[#f26e21] hover:shadow-md"
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Specification Section */}
        <div id="section-specification" className="mt-6 scroll-mt-24">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-[#f26e21] uppercase tracking-wide">Specification</h2>
            </div>
            <SpecTable specs={specifications} />
          </div>
        </div>

        {/* Description Section */}
        <div id="section-description" className="mt-8 scroll-mt-24">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide">Description</h2>
            </div>

            {/* Plain description + custom fields */}
            {(descriptionParagraphs.length > 0 || customFields.length > 0) && (
              <div className="px-6 py-5">
                {descriptionParagraphs.length > 0 && (
                  <div className="space-y-3 text-sm text-gray-700 leading-relaxed max-w-3xl">
                    {descriptionParagraphs.map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                )}
                {customFields.length > 0 && (
                  <div className={descriptionParagraphs.length > 0 ? "mt-6 pt-5 border-t border-gray-100" : ""}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {customFields.map(([key, value]) => (
                        <div key={key} className="bg-gray-50 rounded-lg px-4 py-3">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{key}</p>
                          <p className="text-sm font-medium text-gray-800">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Rich detail blocks with smart image layouts */}
            {Array.isArray(product.descriptions) && product.descriptions.length > 0 && (
              <div className="border-t border-gray-100">
                {(() => {
                  // Build flat content items from sections
                  const items = [];
                  product.descriptions.forEach((section, i) => {
                    const hasText = section.title?.trim() || section.body?.trim();
                    if (hasText) {
                      items.push({ type: "text", title: section.title, body: section.body, key: `t-${i}` });
                    }
                    if (section.imageUrl) {
                      items.push({ type: "image", url: section.imageUrl, alt: section.title || `Detail ${i + 1}`, key: `i-${i}` });
                    }
                  });

                  // Group consecutive images
                  const blocks = [];
                  let idx = 0;
                  while (idx < items.length) {
                    if (items[idx].type === "image") {
                      const imgs = [];
                      while (idx < items.length && items[idx].type === "image") {
                        imgs.push(items[idx]);
                        idx++;
                      }
                      blocks.push({ type: "images", images: imgs, key: imgs[0].key });
                    } else {
                      blocks.push(items[idx]);
                      idx++;
                    }
                  }

                  return blocks.map((block) => {
                    if (block.type === "text") {
                      return (
                        <div key={block.key} className="px-4 min-[360px]:px-6 py-5">
                          {block.title && (
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3">{block.title}</h3>
                          )}
                          {block.body && (
                            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                              {block.body.split("\n").map((line, li) =>
                                line.trim() ? <p key={li}>{line}</p> : <div key={li} className="h-2" />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Smart image layout
                    const { images } = block;
                    const imgClass = "w-full h-full object-cover";

                    if (images.length === 1) {
                      return (
                        <div key={block.key} className="px-4 min-[360px]:px-6 py-2">
                          <img src={images[0].url} alt={images[0].alt} className={`${imgClass} rounded-lg max-h-[450px]`} />
                        </div>
                      );
                    }

                    if (images.length === 2) {
                      return (
                        <div key={block.key} className="px-4 min-[360px]:px-6 py-2 grid grid-cols-2 gap-2 min-[480px]:gap-3">
                          {images.map((img) => (
                            <img key={img.key} src={img.url} alt={img.alt} className={`${imgClass} rounded-lg aspect-[4/3]`} />
                          ))}
                        </div>
                      );
                    }

                    if (images.length === 3) {
                      return (
                        <div key={block.key} className="px-4 min-[360px]:px-6 py-2 space-y-2 min-[480px]:space-y-3">
                          <div className="grid grid-cols-2 gap-2 min-[480px]:gap-3">
                            <img src={images[0].url} alt={images[0].alt} className={`${imgClass} rounded-lg aspect-[4/3]`} />
                            <img src={images[1].url} alt={images[1].alt} className={`${imgClass} rounded-lg aspect-[4/3]`} />
                          </div>
                          <img src={images[2].url} alt={images[2].alt} className={`${imgClass} rounded-lg max-h-[400px]`} />
                        </div>
                      );
                    }

                    // 4+ images: 2x2 grid (extra images continue in rows of 2)
                    return (
                      <div key={block.key} className="px-4 min-[360px]:px-6 py-2 grid grid-cols-2 gap-2 min-[480px]:gap-3">
                        {images.map((img) => (
                          <img key={img.key} src={img.url} alt={img.alt} className={`${imgClass} rounded-lg aspect-[4/3]`} />
                        ))}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-14 mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-6">You May Also Like</h2>
            <div className="grid grid-cols-2 min-[480px]:grid-cols-3 min-[768px]:grid-cols-4 min-[1024px]:grid-cols-5 min-[1280px]:grid-cols-6 gap-2 min-[480px]:gap-3 min-[640px]:gap-4 min-[768px]:gap-5">
              {relatedProducts.map((rp, i) => (
                <ProductCard key={String(rp._id || rp.id)} product={rp} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Sticky Add to Cart Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 p-3 flex items-center gap-3 z-50 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-400 truncate">{product.name}</p>
          <p className="text-base font-bold text-gray-900">BDT {formatPrice(salePrice * qty)}</p>
        </div>
        <button
          onClick={() => addToCart(productId, qty)}
          className="relative overflow-hidden bg-[#f26e21] hover:bg-[#e05e15] text-sm font-bold px-5 py-3 rounded-xl transition-all flex items-center gap-2 flex-shrink-0 shadow-[0_2px_6px_rgba(242,110,33,0.3)] border border-[#e05e15]"
        >
          <span className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/10 to-transparent rounded-t pointer-events-none" />
          <ShoppingCart size={15} className="relative text-white" />
          <span className="relative text-white">Add to Cart</span>
        </button>
      </div>

      {/* Spacer for mobile sticky bar */}
      <div className="h-20 lg:hidden" />
    </section>
  );
}
