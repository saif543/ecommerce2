"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { sampleBrandProducts } from "@/data/sampleProducts";

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function formatPrice(n) {
  return Math.round(n).toLocaleString("en-IN");
}

// Brand logo via Google favicon
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
  Oppo: "oppo.com",
  Vivo: "vivo.com",
  Tecno: "tecno-mobile.com",
  Infinix: "infinixmobility.com",
  Honor: "hihonor.com",
};

function getBrandLogo(name) {
  const domain = brandDomains[name];
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

export default function BrandShowcase() {
  const [brands, setBrands] = useState([]);
  const [activeBrand, setActiveBrand] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const brandScrollRef = useRef(null);

  // Auto-slide
  const [slideIndex, setSlideIndex] = useState(0);
  const autoSlideRef = useRef(null);
  const VISIBLE = 5; // products visible at a time on desktop

  // Fetch brands
  useEffect(() => {
    fetch("/api/brand")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        const b = data.brands || [];
        if (b.length > 0) {
          setBrands(b);
          setActiveBrand(b[0]);
        } else {
          throw new Error("empty");
        }
      })
      .catch(() => {
        const seen = new Set();
        const fallback = sampleBrandProducts
          .filter((p) => {
            const b = p.brand || p.customFields?.brand;
            if (!b || seen.has(b)) return false;
            seen.add(b);
            return true;
          })
          .map((p) => ({ name: p.brand || p.customFields?.brand, logo: null }));
        setBrands(fallback);
        if (fallback.length > 0) setActiveBrand(fallback[0]);
      })
      .finally(() => setLoadingBrands(false));
  }, []);

  // Fetch products when active brand changes
  useEffect(() => {
    if (!activeBrand) return;
    setLoadingProducts(true);
    setSlideIndex(0);
    fetch("/api/product?limit=200")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        const all = data.products || [];
        const brandName = activeBrand.name.toLowerCase();
        const filtered = all.filter((p) => {
          const pBrand = (p.brand || p.customFields?.brand || "").toLowerCase();
          return pBrand === brandName;
        });
        if (filtered.length > 0) {
          setProducts(filtered.slice(0, 15));
        } else {
          const fallback = sampleBrandProducts.filter(
            (p) => (p.brand || "").toLowerCase() === brandName
          );
          setProducts(fallback.slice(0, 15));
        }
      })
      .catch(() => {
        const brandName = activeBrand.name.toLowerCase();
        const fallback = sampleBrandProducts.filter(
          (p) => (p.brand || "").toLowerCase() === brandName
        );
        setProducts(fallback.slice(0, 15));
      })
      .finally(() => setLoadingProducts(false));
  }, [activeBrand]);

  // Auto-slide every 4 seconds
  const maxIndex = Math.max(0, products.length - VISIBLE);

  const nextSlide = useCallback(() => {
    setSlideIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const prevSlide = useCallback(() => {
    setSlideIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  useEffect(() => {
    if (products.length <= VISIBLE) return;
    autoSlideRef.current = setInterval(nextSlide, 4000);
    return () => clearInterval(autoSlideRef.current);
  }, [products, nextSlide]);

  const pauseAuto = () => clearInterval(autoSlideRef.current);
  const resumeAuto = () => {
    if (products.length <= VISIBLE) return;
    clearInterval(autoSlideRef.current);
    autoSlideRef.current = setInterval(nextSlide, 4000);
  };

  const scrollBrands = (dir) => {
    brandScrollRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  if (loadingBrands) {
    return (
      <section className="py-8 min-[768px]:py-12">
        <div className="max-w-[1440px] mx-auto px-3 min-[480px]:px-5 min-[768px]:px-6">
          <div className="h-7 w-52 bg-gray-200 rounded-lg mx-auto mb-8 animate-pulse" />
          <div className="flex gap-8 justify-center overflow-hidden mb-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-20 h-6 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 flex-1 h-72 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (brands.length === 0) return null;

  return (
    <section className="py-8 min-[768px]:py-12 border-t border-gray-100">
      <div className="max-w-[1440px] mx-auto px-3 min-[480px]:px-5 min-[768px]:px-6">
        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-xl min-[480px]:text-2xl md:text-3xl font-bold text-gray-900 text-center mb-6 min-[768px]:mb-8"
        >
          Shop By Brands
        </motion.h2>

        {/* Brand Row */}
        <div className="flex items-center mb-6 min-[768px]:mb-8 border-b border-gray-200 pb-4">
          {/* Scrollable brand names */}
          <div
            ref={brandScrollRef}
            className="flex-1 flex items-center gap-5 min-[480px]:gap-7 min-[768px]:gap-10 overflow-x-auto touch-pan-x"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
            {brands.map((brand) => {
              const isActive = activeBrand?.name === brand.name;
              const logoUrl = getBrandLogo(brand.name) || (brand.logo || null);
              return (
                <button
                  key={brand.name}
                  onClick={() => setActiveBrand(brand)}
                  className={`flex-shrink-0 flex items-center gap-2 pb-1 relative transition-all ${isActive ? "opacity-100" : "opacity-50 hover:opacity-80"}`}
                >
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt={brand.name}
                      className="w-5 h-5 min-[768px]:w-6 min-[768px]:h-6 object-contain"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  )}
                  <span className={`text-xs min-[768px]:text-sm font-bold whitespace-nowrap uppercase tracking-wide ${isActive ? "text-gray-900" : "text-gray-500"}`}>
                    {brand.name}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="brand-underline"
                      className="absolute -bottom-[17px] left-0 right-0 h-[3px] bg-[#f26e21] rounded-full"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right arrow for brands + Show All */}
          <div className="flex items-center gap-3 flex-shrink-0 ml-4">
            <button
              onClick={() => scrollBrands(1)}
              className="hidden min-[640px]:flex w-7 h-7 rounded-full border border-gray-300 items-center justify-center text-gray-400 hover:border-[#f26e21] hover:text-[#f26e21] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
            {activeBrand && (
              <Link
                href={`/brands/${toSlug(activeBrand.name)}`}
                className="hidden min-[480px]:flex items-center gap-1 text-sm font-semibold text-[#f26e21] hover:text-[#e05e15] transition-colors whitespace-nowrap"
              >
                Show All
                <ChevronRight size={16} />
              </Link>
            )}
          </div>
        </div>

        {/* Products — auto-sliding carousel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeBrand?.name || "none"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {loadingProducts ? (
              <div className="flex justify-center items-center h-52">
                <Loader2 className="animate-spin text-[#f26e21]" size={28} />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                No products found for {activeBrand?.name}
              </div>
            ) : (
              <div
                className="relative"
                onMouseEnter={pauseAuto}
                onMouseLeave={resumeAuto}
              >
                {/* Left Arrow */}
                <button
                  onClick={() => { prevSlide(); pauseAuto(); resumeAuto(); }}
                  className="hidden min-[768px]:flex absolute -left-3 min-[1024px]:-left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full items-center justify-center shadow-md hover:shadow-lg hover:border-[#f26e21] transition-all"
                >
                  <ChevronLeft size={20} className="text-gray-600" />
                </button>

                {/* Product strip */}
                <div className="overflow-hidden">
                  <motion.div
                    className="flex"
                    animate={{ x: `-${slideIndex * (100 / VISIBLE)}%` }}
                    transition={{ type: "tween", duration: 0.5, ease: "easeInOut" }}
                  >
                    {products.map((product) => {
                      const productId = String(product._id || product.id);
                      const imageUrl = product.images?.length > 0 ? product.images[0].url : product.image || "/placeholder.png";
                      const regularPrice = product.price || 0;
                      const salePrice = product.discount && product.discount > 0 && product.discount < regularPrice ? product.discount : regularPrice;
                      const savedAmount = regularPrice - salePrice;
                      const brandName = product.brand || product.customFields?.brand || "";

                      return (
                        <div
                          key={productId}
                          className="flex-shrink-0 px-1.5 min-[480px]:px-2"
                          style={{ width: `${100 / VISIBLE}%` }}
                        >
                          <Link href={`/product/${productId}`} className="block bg-white rounded-xl border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-300 overflow-hidden group h-full">
                            {/* Image */}
                            <div className="relative aspect-square bg-gray-50 overflow-hidden p-4">
                              {product.isNewArrival && (
                                <span className="absolute top-2 left-0 bg-[#f26e21] text-white text-[8px] min-[768px]:text-[10px] font-bold px-2 py-1 rounded-r-md z-10 uppercase tracking-wider"
                                  style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)", lineHeight: 1.2, padding: "6px 4px" }}
                                >
                                  New Arrival
                                </span>
                              )}
                              <Image
                                src={imageUrl}
                                alt={product.name}
                                fill
                                className="object-contain group-hover:scale-105 transition-transform duration-500 p-2"
                                sizes="(max-width: 640px) 50vw, 20vw"
                              />
                            </div>

                            {/* Info */}
                            <div className="p-3 min-[768px]:p-4 text-center">
                              {brandName && (
                                <p className="text-[10px] min-[768px]:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{brandName}</p>
                              )}
                              <h3 className="text-xs min-[768px]:text-sm font-medium text-gray-800 leading-snug line-clamp-2 mb-2 min-h-[2.5em]">
                                {product.name}
                              </h3>
                              <div className="flex items-center justify-center gap-2 mb-3">
                                <span className="text-sm min-[768px]:text-base font-bold text-[#f26e21]">
                                  Tk. {formatPrice(salePrice)}
                                </span>
                                {savedAmount > 0 && (
                                  <span className="text-[10px] min-[768px]:text-xs text-gray-400 line-through">
                                    Tk. {formatPrice(regularPrice)}
                                  </span>
                                )}
                              </div>
                              <div className="border border-[#f26e21] text-[#f26e21] rounded-lg py-1.5 min-[768px]:py-2 text-[10px] min-[768px]:text-xs font-bold uppercase tracking-wider hover:bg-[#f26e21] hover:text-white transition-colors">
                                Buy Now
                              </div>
                            </div>
                          </Link>
                        </div>
                      );
                    })}
                  </motion.div>
                </div>

                {/* Right Arrow */}
                <button
                  onClick={() => { nextSlide(); pauseAuto(); resumeAuto(); }}
                  className="hidden min-[768px]:flex absolute -right-3 min-[1024px]:-right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full items-center justify-center shadow-md hover:shadow-lg hover:border-[#f26e21] transition-all"
                >
                  <ChevronRight size={20} className="text-gray-600" />
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Mobile Show All link */}
        {activeBrand && (
          <div className="text-center mt-5 min-[480px]:hidden">
            <Link
              href={`/brands/${toSlug(activeBrand.name)}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#f26e21] hover:text-[#e05e15] transition-colors"
            >
              Show All {activeBrand.name}
              <ChevronRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
