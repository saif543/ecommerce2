"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ArrowLeft,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import ProductCard from "./ProductCard";

function formatPrice(n) {
  return Math.round(n).toLocaleString("en-IN");
}

export default function ProductDetail({ product, relatedProducts = [] }) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
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
    setZoomStyle({ transform: "scale(1.5)", transformOrigin: `${x}% ${y}%` });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setZoomStyle({ transform: "scale(1)", transformOrigin: "center center" });
  }, []);

  // Normalize DB fields
  const productId = product._id || product.id;
  const brandName = product.customFields?.brand || product.category || product.brand || "";

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

  return (
    <section className="bg-white min-h-screen pb-16 font-sans">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        {/* <div className="flex items-center gap-2 text-[11px] font-bold text-gray-800 mb-6 uppercase tracking-wider">
          <Link href="/" className="hover:text-black hover:underline cursor-pointer"><span className="text-gray-900">Home</span></Link>
          <span className="text-gray-400">/</span>
          {product.category && (
            <>
              <span className="text-gray-900">{product.category}</span>
              <span className="text-gray-400">/</span>
            </>
          )}
          {brandName && (
            <>
              <span className="text-gray-900">{brandName}</span>
              <span className="text-gray-400">/</span>
            </>
          )}
          <span className="text-gray-500">{product.name}</span>
        </div> */}

        <div className="flex flex-col lg:flex-row gap-8 xl:gap-12">
          {/* Left Column - Gallery */}
          <div className="lg:w-[50%] flex flex-col-reverse lg:flex-row gap-4 lg:self-start">
            {/* Thumbnails (Vertical on desktop) */}
            <div className="flex lg:flex-col gap-3 lg:w-[72px] flex-shrink-0 overflow-x-auto lg:overflow-visible p-1">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative w-[70px] h-[85px] rounded-md overflow-hidden border p-1 transition-all flex-shrink-0 bg-white ${i === selectedImage ? 'border-[#c4a265] shadow-sm ring-1 ring-[#c4a265]' : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <Image src={img} alt={`Thumb ${i}`} fill className="object-contain p-1" sizes="70px" />
                </button>
              ))}
            </div>

            {/* Main Image */}
            <div
              className="flex-1 relative rounded-lg border border-gray-100 flex items-center justify-center min-h-[440px] lg:min-h-[530px] cursor-crosshair overflow-hidden group bg-white shadow-sm w-full"
              ref={imageRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Badge if exists */}
              {product.badge && (
                <div className="absolute top-4 left-4 bg-purple-soft text-purple-mid text-[11px] font-semibold px-3 py-1 rounded-full z-10 opacity-90">
                  {product.badge}
                </div>
              )}
              {discountPct > 0 && !product.badge && (
                <div className="absolute top-4 left-4 bg-[#d18e54] text-white text-[13px] font-bold px-2 py-0.5 rounded shadow-sm z-10 opacity-90">
                  {discountPct}%
                </div>
              )}

              <div className="absolute inset-0 max-w-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedImage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full"
                  >
                    <div
                      className="w-full h-full relative"
                      style={{ ...zoomStyle, transition: "transform 0.1s ease-out" }}
                    >
                      <Image
                        src={allImages[selectedImage] || "/placeholder.png"}
                        alt={product.name}
                        fill
                        className="object-cover pointer-events-none"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        priority
                      />
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right Column - Product Info */}
          <div className="lg:w-[50%] flex flex-col pt-1">
            <div className="mb-6 flex items-center">
              {/* <div className="text-[13px] font-bold text-gray-500 tracking-wide flex items-center gap-2">
                Brand : <span className="text-[#0066cc] border border-blue-200/60 bg-blue-50/30 px-2 py-0.5 rounded text-[11px] font-bold">{brandName || "Unknown"}</span>
              </div> */}
            </div>

            {/* Title & Price Box */}
            <div className="bg-[#fcfaf8] rounded-xl px-6 py-6 mb-6 shadow-sm border border-gray-100/50">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 border-b border-gray-200 pb-5 gap-4">
                <div className="flex-1 pr-4">
                  <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 leading-tight">{product.name}</h1>
                </div>
                <div className="text-left sm:text-right flex-shrink-0 mt-1">
                  <div className="text-xl font-medium text-[#c45a27]">Tk {formatPrice(salePrice)}</div>
                  {savedAmount > 0 && (
                    <div className="text-[13px] text-gray-400 line-through mt-0.5 font-medium">Tk {formatPrice(regularPrice)}</div>
                  )}
                </div>
              </div>

              {/* Stock Status indicator */}
              <div className="flex items-center gap-2 mb-6">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
                <span className="text-sm font-medium text-green-600 tracking-wide">In Stock</span>
              </div>

              {/* Short Description */}
              <div className="text-[13px] text-gray-600 leading-relaxed mb-4">
                {shortDescription || product.description}
              </div>

              {/* Features list */}
              {features.length > 0 && (
                <div className="flex flex-col gap-2 text-[13px] text-gray-600 mt-4">
                  {features.slice(0, 5).map((feat, i) => (
                    <div key={i} className="flex gap-2 leading-relaxed">
                      <CheckCircle2 size={16} className="text-[#c4a265] flex-shrink-0 mt-0.5" />
                      <span className="flex-1">{feat}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Qty + Actions */}
            <div className="mt-auto space-y-3">
              {/* Row 1: Qty + Add to Cart */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden h-[42px] w-[100px] flex-shrink-0 shadow-sm">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-[34px] h-full flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-50 transition-colors">
                    <Minus size={14} strokeWidth={2.5} />
                  </button>
                  <span className="flex-1 text-center text-sm font-bold text-gray-800">{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} className="w-[34px] h-full flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-50 transition-colors">
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                </div>
                <button
                  onClick={() => addToCart(productId, qty)}
                  className="flex-1 relative overflow-hidden bg-gradient-to-b from-[#2a2a2a] via-[#1a1a1a] to-[#0a0a0a] hover:from-[#333] hover:via-[#222] hover:to-[#111] h-[42px] rounded-lg text-xs tracking-widest uppercase font-bold flex items-center justify-center gap-2 transition-all active:translate-y-[1px] shadow-[0_2px_4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] active:shadow-[0_0px_1px_rgba(0,0,0,0.4),inset_0_1px_3px_rgba(0,0,0,0.3)] border border-[rgba(196,162,101,0.2)]"
                >
                  <span className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/10 to-transparent rounded-t pointer-events-none"></span>
                  <ShoppingCart size={15} className="relative text-[#C4A265]" />
                  <span className="relative bg-gradient-to-r from-[#C4A265] via-[#D4B978] to-[#C4A265] bg-clip-text text-transparent">Add To Cart</span>
                </button>
              </div>

              {/* Row 2: Buy Now + Messenger */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    addToCart(productId, qty);
                    router.push(`/cart?checkout=true&buyNowId=${productId}`);
                  }}
                  className="flex-1 border-2 border-[#c4a265] text-[#c4a265] hover:bg-white/60 h-[42px] rounded-lg text-xs tracking-widest uppercase font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Zap size={14} /> Buy Now
                </button>
                <a
                  href={`https://www.messenger.com/t/61579377832787?ref=${encodeURIComponent(`Product:${product.name}|Price:${product.price}|Qty:${qty}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 relative overflow-hidden h-[42px] rounded-lg text-xs tracking-widest uppercase font-bold flex items-center justify-center gap-2 transition-all active:translate-y-[1px] active:shadow-[0_0px_1px_rgba(0,0,0,0.3),inset_0_1px_3px_rgba(0,0,0,0.2)] shadow-[0_3px_6px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.25)] border border-[rgba(255,255,255,0.1)]"
                  style={{ background: "linear-gradient(180deg, #0078FF 0%, #0060DD 50%, #004ABB 100%)" }}
                >
                  <span className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/15 to-transparent rounded-t pointer-events-none"></span>
                  <svg viewBox="0 0 24 24" fill="white" className="relative w-4 h-4">
                    <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.2 5.42 3.15 7.2.16.15.26.36.27.58l.05 1.82c.02.56.6.93 1.11.7l2.04-.9c.17-.08.36-.1.55-.06.88.24 1.82.37 2.83.37 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm6.28 7.58-3.07 4.87c-.49.78-1.54.98-2.29.43l-2.44-1.83a.75.75 0 00-.9 0l-3.3 2.5c-.44.33-1.01-.17-.72-.64l3.07-4.87c.49-.78 1.54-.98 2.29-.43l2.44 1.83a.75.75 0 00.9 0l3.3-2.5c.44-.33 1.01.17.72.64z" />
                  </svg>
                  <span className="relative text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">Messenger</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs section from 2nd screenshot */}
        <div className="mt-16">
          <div className="flex gap-3 mb-6">
            {["specification", "description"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-2.5 text-[13px] font-bold tracking-wide rounded border transition-all capitalize ${activeTab === tab
                  ? "bg-[#fcfaf8] text-gray-800 border-gray-300 shadow-sm"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="min-h-[300px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === "description" ? (
                  <div className="text-gray-700 text-[14px] leading-relaxed max-w-4xl p-6 bg-[#fcfaf8] rounded-md border border-gray-100">
                    {/* ── Multi-section descriptions ── */}
                    {Array.isArray(product.descriptions) && product.descriptions.length > 0 ? (
                      <div className="space-y-10">
                        {product.descriptions.map((section, i) => (
                          <div key={section.id || i} className="space-y-4">
                            {/* Section title */}
                            {section.title && (
                              <h2 className="text-lg font-bold text-gray-900 leading-tight border-b border-gray-200 pb-2">
                                {section.title}
                              </h2>
                            )}
                            {/* Section image */}
                            {section.imageUrl && (
                              <div className="my-4">
                                <img
                                  src={section.imageUrl}
                                  alt={section.title || `Section ${i + 1}`}
                                  className="w-full rounded-lg object-contain max-h-[500px] border border-gray-100"
                                />
                              </div>
                            )}
                            {/* Section body — each line as its own paragraph */}
                            {section.body && (
                              <div className="space-y-3 text-gray-700">
                                {section.body
                                  .split('\n')
                                  .map((line, li) =>
                                    line.trim() ? (
                                      <p key={li} className="leading-relaxed">{line}</p>
                                    ) : (
                                      <div key={li} className="h-1" />
                                    )
                                  )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Fallback — render old plain description */
                      <div className="space-y-3">
                        {descriptionParagraphs.map((para, i) => (
                          <p key={i}>{para}</p>
                        ))}
                      </div>
                    )}

                    {customFields.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-gray-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {customFields.map(([key, value]) => (
                            <div key={key} className="bg-white rounded px-4 py-3 border border-gray-100 shadow-sm">
                              <p className="text-[11px] font-bold text-gray-400 tracking-wider uppercase mb-1">{key}</p>
                              <p className="text-sm font-medium text-gray-800">{String(value)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 max-w-[100%] xl:max-w-6xl">
                    {/* Specifications Accordion Style */}
                    <div className="flex flex-col text-[13px]">
                      {Object.keys(specifications).length > 0 ? (
                        <>
                          {Object.entries(specifications).map(([key, value], i) => (
                            <div key={key} className={`flex border-b border-white last:mb-2 py-4 px-6 items-center hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "bg-[#f5ebd7]" : "bg-[#fcfaf8]"}`}>
                              <div className="w-1/3 text-[11px] font-bold text-gray-700 tracking-wider uppercase pr-4">{key}</div>
                              <div className="w-2/3 text-[13px] text-gray-600 font-medium border-l border-gray-200/60 pl-6 h-full flex items-center">
                                {typeof value === 'object' ? JSON.stringify(value) : value}
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="py-12 bg-[#fcfaf8] rounded text-center text-sm text-gray-500 border border-gray-100">No specifications found.</div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-20 mb-10">
            <h2 className="text-xl font-bold text-[#111111] tracking-wide mb-8 border-b-2 border-black inline-block pb-2 uppercase">Related Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((rp, i) => (
                <ProductCard key={String(rp._id || rp.id)} product={rp} index={i} />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Mobile Sticky Add to Cart Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 flex items-center gap-3 z-50 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-muted truncate">{product.name}</p>
          <p className="text-base font-semibold text-text-primary">Tk {formatPrice(salePrice * qty)}</p>
        </div>
        <button
          onClick={() => addToCart(productId, qty)}
          className="bg-[#111111] hover:bg-[#333333] text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors flex items-center gap-2 flex-shrink-0"
        >
          <ShoppingCart size={16} />
          Add to Cart
        </button>
      </div>

      {/* Spacer for mobile sticky bar */}
      <div className="h-20 lg:hidden" />
    </section>
  );
}
