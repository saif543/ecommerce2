"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import ProductCard from "./ProductCard";
function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}


export default function BrandShowcase() {
  const [brands, setBrands] = useState([]);
  const [activeBrand, setActiveBrand] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const brandScrollRef = useRef(null);
  const [brandCanScrollLeft, setBrandCanScrollLeft] = useState(false);
  const [brandCanScrollRight, setBrandCanScrollRight] = useState(false);

  const updateBrandArrows = useCallback(() => {
    const el = brandScrollRef.current;
    if (!el) return;
    setBrandCanScrollLeft(el.scrollLeft > 5);
    setBrandCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  }, []);

  useEffect(() => {
    updateBrandArrows();
  }, [brands, updateBrandArrows]);

  // Auto-slide
  const autoSlideRef = useRef(null);
  const VISIBLE = 6;

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
        setBrands([]);
      })
      .finally(() => setLoadingBrands(false));
  }, []);

  // Fetch products when active brand changes
  useEffect(() => {
    if (!activeBrand) return;
    setLoadingProducts(true);
    setTranslateX(0);
    fetch("/api/product?limit=200")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        const all = data.products || [];
        const brandName = activeBrand.name.toLowerCase();
        const filtered = all.filter((p) => {
          const pBrand = (p.brand || p.customFields?.brand || "").toLowerCase();
          return pBrand === brandName;
        });
        setProducts(filtered.slice(0, 15));
      })
      .catch(() => {
        setProducts([]);
      })
      .finally(() => setLoadingProducts(false));
  }, [activeBrand]);

  // Product translateX carousel
  const productStripRef = useRef(null);
  const [translateX, setTranslateX] = useState(0);
  const productDragRef = useRef({ startX: 0, startY: 0, startTranslate: 0, dragging: false, moved: false, decided: false, isHorizontal: false });

  const getMaxTranslate = useCallback(() => {
    const el = productStripRef.current;
    if (!el || !el.parentElement) return 0;
    return Math.max(0, el.scrollWidth - el.parentElement.clientWidth);
  }, []);

  // Auto-slide every 4 seconds
  const autoScroll = useCallback(() => {
    setTranslateX((prev) => {
      const max = getMaxTranslate();
      if (max <= 0) return 0;
      const step = max / (products.length - VISIBLE || 1);
      const next = prev - step;
      return next < -max ? 0 : next;
    });
  }, [getMaxTranslate, products.length]);

  useEffect(() => {
    if (products.length <= VISIBLE) return;
    autoSlideRef.current = setInterval(autoScroll, 4000);
    return () => clearInterval(autoSlideRef.current);
  }, [products, autoScroll]);

  const pauseAuto = () => clearInterval(autoSlideRef.current);
  const resumeAuto = () => {
    if (products.length <= VISIBLE) return;
    clearInterval(autoSlideRef.current);
    autoSlideRef.current = setInterval(autoScroll, 4000);
  };

  // Mouse drag for products (desktop only — preventDefault is safe)
  const onProductMouseDown = (e) => {
    e.preventDefault();
    productDragRef.current = { startX: e.pageX, startY: 0, startTranslate: translateX, dragging: true, moved: false, decided: true, isHorizontal: true };
    pauseAuto();
  };
  const onProductMouseMove = (e) => {
    if (!productDragRef.current.dragging) return;
    const diff = e.pageX - productDragRef.current.startX;
    if (Math.abs(diff) > 10) productDragRef.current.moved = true;
    setTranslateX(Math.min(0, Math.max(-getMaxTranslate(), productDragRef.current.startTranslate + diff)));
  };
  const onProductMouseUp = () => {
    productDragRef.current.dragging = false;
    resumeAuto();
  };

  // Touch drag for products — detect direction first, allow vertical scroll
  const onProductTouchStart = (e) => {
    const t = e.touches[0];
    productDragRef.current = { startX: t.pageX, startY: t.pageY, startTranslate: translateX, dragging: true, moved: false, decided: false, isHorizontal: false };
    pauseAuto();
  };
  const onProductTouchMove = (e) => {
    const ref = productDragRef.current;
    if (!ref.dragging) return;
    const t = e.touches[0];
    const dx = t.pageX - ref.startX;
    const dy = t.pageY - ref.startY;

    // Decide direction on first significant movement
    if (!ref.decided) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; // too small, wait
      ref.decided = true;
      ref.isHorizontal = Math.abs(dx) > Math.abs(dy);
      if (!ref.isHorizontal) {
        // Vertical scroll — cancel drag, let browser handle
        ref.dragging = false;
        resumeAuto();
        return;
      }
    }

    if (!ref.isHorizontal) return;

    // Horizontal drag — prevent page scroll, move carousel
    e.preventDefault();
    if (Math.abs(dx) > 10) ref.moved = true;
    setTranslateX(Math.min(0, Math.max(-getMaxTranslate(), ref.startTranslate + dx)));
  };
  const onProductTouchEnd = () => {
    productDragRef.current.dragging = false;
    resumeAuto();
  };

  // Mouse drag for brand row (desktop only)
  const brandDragRef = useRef({ startX: 0, scrollLeft: 0, dragging: false });

  const onBrandMouseDown = (e) => {
    const el = brandScrollRef.current;
    if (!el) return;
    brandDragRef.current = { startX: e.pageX, scrollLeft: el.scrollLeft, dragging: true };
  };
  const onBrandMouseMove = (e) => {
    if (!brandDragRef.current.dragging) return;
    e.preventDefault();
    const el = brandScrollRef.current;
    if (!el) return;
    el.scrollLeft = brandDragRef.current.scrollLeft - (e.pageX - brandDragRef.current.startX);
    updateBrandArrows();
  };
  const onBrandMouseUp = () => {
    brandDragRef.current.dragging = false;
    updateBrandArrows();
  };

  // Brand row: NO custom touch handlers — native overflow-x-auto handles touch scroll
  // and doesn't block vertical page scrolling

  const scrollBrands = (dir) => {
    brandScrollRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
    setTimeout(updateBrandArrows, 300);
  };

  if (loadingBrands) {
    return (
      <section className="py-10 min-[768px]:py-16">
        <div className="max-w-[1440px] mx-auto px-3 min-[480px]:px-5 min-[768px]:px-6">
          <div className="text-center mb-8">
            <div className="h-7 w-52 bg-gray-200 rounded-lg mx-auto mb-2 animate-pulse" />
            <div className="h-4 w-64 bg-gray-100 rounded mx-auto animate-pulse" />
          </div>
          <div className="flex gap-3 mb-8 overflow-hidden justify-center">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-24 h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 flex-1 h-72 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (brands.length === 0) return null;

  return (
    <section className="relative py-10 min-[768px]:py-16 bg-white overflow-hidden">
      {/* Subtle decorative bg elements */}
      <div className="absolute top-10 right-0 w-48 h-48 min-[768px]:w-80 min-[768px]:h-80 bg-[#f26e21]/[0.02] rounded-full translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-10 left-0 w-36 h-36 min-[768px]:w-60 min-[768px]:h-60 bg-[#111111]/[0.02] rounded-full -translate-x-1/2 pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-3 min-[480px]:px-5 min-[768px]:px-6 relative">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-5 min-[480px]:mb-7 min-[768px]:mb-10"
        >
          <p className="text-[#f26e21] text-[10px] min-[480px]:text-xs font-semibold uppercase tracking-[0.15em] mb-1 min-[480px]:mb-2">Top Brands</p>
          <h2 className="text-xl min-[480px]:text-2xl md:text-3xl font-semibold text-text-primary mb-2 min-[480px]:mb-3">
            Shop By Brands
          </h2>
          {activeBrand && (
            <Link
              href="/brands"
              className="inline-flex items-center gap-1 text-xs min-[480px]:text-sm font-semibold text-[#f26e21] hover:text-[#e05e15] transition-colors"
            >
              Show All
              <ChevronRight size={14} />
            </Link>
          )}
        </motion.div>

        {/* Brand Row */}
        <div className="relative mb-6 min-[768px]:mb-8 border-b border-gray-200 max-w-[85%] min-[768px]:max-w-[75%] mx-auto bg-white">
          {/* Left arrow — plain on mobile, circle on desktop */}
          {brandCanScrollLeft && (
            <button
              onClick={() => scrollBrands(-1)}
              className="absolute -left-7 min-[768px]:-left-10 top-1/2 -translate-y-1/2 z-10 w-6 h-6 min-[768px]:w-8 min-[768px]:h-8 flex items-center justify-center transition-all min-[768px]:rounded-full"
              style={{
                background: "transparent",
              }}
            >
              <ChevronLeft size={18} className="text-gray-400 min-[768px]:text-gray-600" />
            </button>
          )}

          {/* Scrollable brand logos */}
          <div
            ref={brandScrollRef}
            className="flex items-center gap-0 overflow-x-auto select-none px-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
            onMouseDown={onBrandMouseDown}
            onMouseMove={onBrandMouseMove}
            onMouseUp={onBrandMouseUp}
            onMouseLeave={onBrandMouseUp}
            onScroll={updateBrandArrows}
          >
            <style jsx>{`
              div::-webkit-scrollbar { display: none; }
              @media (max-width: 479px) {
                button[data-brand-box] { aspect-ratio: 5/2.5 !important; }
              }
            `}</style>
            {brands.map((brand) => {
              const isActive = activeBrand?.name === brand.name;
              return (
                <button
                  key={brand.name}
                  onClick={() => setActiveBrand(brand)}
                  className="flex-shrink-0 flex items-center justify-center relative transition-all w-[calc(100%/2.5)] min-[480px]:w-[calc(100%/4)] min-[768px]:w-[calc(100%/5)] min-[1024px]:w-[calc(100%/6)] overflow-hidden"
                  style={{ aspectRatio: "5/2" }}
                  data-brand-box
                >
                  <div className="w-full h-full px-3 flex items-center justify-center overflow-hidden">
                    {brand.logo ? (
                      <img
                        src={brand.logo}
                        alt={brand.name}
                        className={`max-w-full max-h-full object-contain transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-60 hover:opacity-80"}`}
                        style={{ transform: `scale(${(brand.logoScale || 100) / 100}) translate(${brand.logoOffsetX || 0}px, ${brand.logoOffsetY || 0}px)` }}
                      />
                    ) : (
                      <span
                        className={`text-sm min-[768px]:text-base font-bold whitespace-nowrap uppercase tracking-wide transition-colors duration-200 ${isActive ? "text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
                      >
                        {brand.name}
                      </span>
                    )}
                  </div>
                  {/* Active indicator bar */}
                  <div
                    className="absolute bottom-0 left-[15%] right-[15%] h-[3px] rounded-full transition-all duration-300 ease-out"
                    style={{
                      background: isActive ? "#f26e21" : "transparent",
                      transform: isActive ? "scaleX(1)" : "scaleX(0)",
                      opacity: isActive ? 1 : 0,
                    }}
                  />
                </button>
              );
            })}
          </div>

          {/* Right arrow — plain on mobile, circle on desktop */}
          {brandCanScrollRight && (
            <button
              onClick={() => scrollBrands(1)}
              className="absolute -right-7 min-[768px]:-right-10 top-1/2 -translate-y-1/2 z-10 w-6 h-6 min-[768px]:w-8 min-[768px]:h-8 flex items-center justify-center transition-all min-[768px]:rounded-full"
              style={{
                background: "transparent",
              }}
            >
              <ChevronRight size={18} className="text-gray-400 min-[768px]:text-gray-600" />
            </button>
          )}
        </div>

        {/* Products area — warm showcase */}
        <div className="relative rounded-2xl overflow-hidden border border-[#f26e21]/10" style={{ background: "linear-gradient(135deg, #fff8f3 0%, #fff1e8 40%, #fef5ee 70%, #fffaf6 100%)" }}>
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-40 h-40 min-[768px]:w-72 min-[768px]:h-72 bg-[#f26e21]/[0.04] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 min-[768px]:w-56 min-[768px]:h-56 bg-[#f26e21]/[0.03] rounded-full -translate-x-1/4 translate-y-1/4 pointer-events-none" />
          {/* Watermark brand logo */}
          {activeBrand?.logo && (
            <div className="absolute right-4 min-[768px]:right-8 top-1/2 -translate-y-1/2 pointer-events-none opacity-[0.04]">
              <img src={activeBrand.logo} alt="" className="w-28 min-[480px]:w-36 min-[768px]:w-52 h-auto object-contain" />
            </div>
          )}

          {/* Active brand header */}
          {activeBrand && !loadingProducts && products.length > 0 && (
            <div className="relative flex items-center justify-between px-4 min-[480px]:px-5 min-[768px]:px-6 pt-4 min-[480px]:pt-5 pb-2">
              <div className="flex items-center gap-2.5">
                {activeBrand.logo && (
                  <img src={activeBrand.logo} alt="" className="h-5 min-[480px]:h-6 object-contain opacity-80" />
                )}
                <span className="text-[#f26e21]/30 text-xs">|</span>
                <span className="text-text-muted text-[10px] min-[480px]:text-xs font-medium">{products.length} products</span>
              </div>
              <Link
                href={`/brands/${toSlug(activeBrand.name)}`}
                className="group inline-flex items-center gap-1 text-[10px] min-[480px]:text-xs font-semibold text-[#f26e21] hover:text-[#e05e15] transition-colors"
              >
                View All
                <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
            </div>
          )}

          <div className="relative p-3 min-[480px]:p-4 min-[768px]:p-5">
            {loadingProducts ? (
              <div className="flex justify-center items-center h-52">
                <Loader2 className="animate-spin text-[#f26e21]" size={28} />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 text-text-muted text-sm">
                No products found for {activeBrand?.name}
              </div>
            ) : (
              <div
                className="relative"
                onMouseEnter={pauseAuto}
                onMouseLeave={() => { resumeAuto(); onProductMouseUp(); }}
                onMouseDown={onProductMouseDown}
                onMouseMove={onProductMouseMove}
                onMouseUp={onProductMouseUp}
                onTouchStart={onProductTouchStart}
                onTouchMove={onProductTouchMove}
                onTouchEnd={onProductTouchEnd}
                onClickCapture={(e) => { if (productDragRef.current.moved) { e.preventDefault(); e.stopPropagation(); } }}
              >
                {/* Clip only left & right, not top & bottom */}
                <div style={{ clipPath: "inset(-100px 0px -100px 0px)" }}>
                  <div
                    ref={productStripRef}
                    className="flex gap-2 min-[480px]:gap-3 min-[640px]:gap-4 min-[768px]:gap-5 select-none cursor-pointer transition-transform duration-300 ease-out"
                    style={{ transform: `translateX(${translateX}px)`, ...(productDragRef.current.dragging && productDragRef.current.isHorizontal ? { transition: "none" } : {}) }}
                  >
                    {products.map((product, i) => (
                      <div
                        key={String(product._id || product.id)}
                        className="flex-shrink-0 w-[calc((100%-8px)/2)] min-[480px]:w-[calc((100%-24px)/3)] min-[768px]:w-[calc((100%-48px)/4)] min-[1024px]:w-[calc((100%-80px)/5)] min-[1280px]:w-[calc((100%-100px)/6)]"
                      >
                        <ProductCard product={product} index={i} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Left Arrow */}
                <button
                  onClick={() => { setTranslateX((prev) => Math.min(0, prev + productStripRef.current.parentElement.clientWidth * 0.6)); }}
                  className="absolute left-0 min-[768px]:-left-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 min-[768px]:w-10 min-[768px]:h-10 rounded-full flex items-center justify-center transition-all duration-200 bg-white shadow-md hover:shadow-lg hover:scale-105"
                >
                  <ChevronLeft size={18} className="text-[#f26e21]" />
                </button>

                {/* Right Arrow */}
                <button
                  onClick={() => { setTranslateX((prev) => Math.max(-getMaxTranslate(), prev - productStripRef.current.parentElement.clientWidth * 0.6)); }}
                  className="absolute right-0 min-[768px]:-right-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 min-[768px]:w-10 min-[768px]:h-10 rounded-full flex items-center justify-center transition-all duration-200 bg-white shadow-md hover:shadow-lg hover:scale-105"
                >
                  <ChevronRight size={18} className="text-[#f26e21]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
