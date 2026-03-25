"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import ProductCard from "./ProductCard";
import { sampleBrandProducts } from "@/data/sampleProducts";

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/* Hook: click-drag scroll for desktop + native touch on mobile */
function useDragScroll() {
  const ref = useRef(null);
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0, dragged: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMouseDown = (e) => {
      dragState.current.isDown = true;
      dragState.current.dragged = false;
      dragState.current.startX = e.pageX;
      dragState.current.scrollLeft = el.scrollLeft;
      el.style.cursor = "grabbing";
      el.style.userSelect = "none";
    };

    const onMouseUp = () => {
      if (!dragState.current.isDown) return;
      dragState.current.isDown = false;
      el.style.cursor = "grab";
      el.style.userSelect = "";
    };

    const onMouseMove = (e) => {
      if (!dragState.current.isDown) return;
      e.preventDefault();
      const walk = e.pageX - dragState.current.startX;
      if (Math.abs(walk) > 5) dragState.current.dragged = true;
      el.scrollLeft = dragState.current.scrollLeft - walk;
    };

    const onClick = (e) => {
      if (dragState.current.dragged) {
        e.preventDefault();
        e.stopPropagation();
        dragState.current.dragged = false;
      }
    };

    el.style.cursor = "grab";
    el.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove);
    el.addEventListener("click", onClick, true);

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("click", onClick, true);
    };
  }, []);

  return { ref, dragState };
}

export default function BrandShowcase() {
  const [brands, setBrands] = useState([]);
  const [activeBrand, setActiveBrand] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const { ref: brandScrollRef, dragState: brandDrag } = useDragScroll();
  const { ref: productScrollRef, dragState: productDrag } = useDragScroll();

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
          setProducts(filtered.slice(0, 12));
        } else {
          const fallback = sampleBrandProducts.filter(
            (p) => (p.brand || "").toLowerCase() === brandName
          );
          setProducts(fallback.slice(0, 12));
        }
      })
      .catch(() => {
        const brandName = activeBrand.name.toLowerCase();
        const fallback = sampleBrandProducts.filter(
          (p) => (p.brand || "").toLowerCase() === brandName
        );
        setProducts(fallback.slice(0, 12));
      })
      .finally(() => setLoadingProducts(false));
  }, [activeBrand]);

  const scrollBrands = (dir) => {
    brandScrollRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  const scrollProducts = (dir) => {
    productScrollRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  if (loadingBrands) {
    return (
      <section className="bg-[#111111] py-8 min-[768px]:py-14">
        <div className="max-w-[1440px] mx-auto px-3 min-[480px]:px-5 min-[768px]:px-6">
          <div className="h-7 w-52 bg-white/10 rounded-lg mx-auto mb-8 animate-pulse" />
          <div className="flex gap-8 justify-center overflow-hidden mb-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-20 h-8 bg-white/10 rounded animate-pulse" />
            ))}
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 flex-1 h-64 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (brands.length === 0) return null;

  return (
    <section className="bg-[#111111] py-8 min-[768px]:py-14">
      <div className="max-w-[1440px] mx-auto px-3 min-[480px]:px-5 min-[768px]:px-6">
        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-xl min-[480px]:text-2xl md:text-3xl font-semibold text-white text-center mb-6 min-[768px]:mb-8"
        >
          Shop By Brands
        </motion.h2>

        {/* Brand Row — centered brand list, See All on right */}
        <div className="flex items-center mb-6 min-[768px]:mb-8">
          {/* Invisible spacer to balance See All on right */}
          <div className="flex-shrink-0 hidden min-[640px]:block w-[72px] min-[768px]:w-[84px]" />

          {/* Centered brand list with arrows */}
          <div className="flex-1 flex items-center justify-center gap-2 min-[480px]:gap-3">
            {/* Left Arrow */}
            <button
              onClick={() => scrollBrands(-1)}
              className="flex-shrink-0 w-8 h-8 min-[768px]:w-9 min-[768px]:h-9 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:border-[#f26e21] hover:text-[#f26e21] transition-colors bg-white/5"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Scrollable brand logos — constrained width */}
            <div
              ref={brandScrollRef}
              className="flex items-center gap-4 min-[480px]:gap-6 min-[768px]:gap-8 overflow-x-auto touch-pan-x max-w-[480px] min-[640px]:max-w-[560px] min-[768px]:max-w-[680px] min-[1024px]:max-w-[800px]"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
            >
              <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
              {brands.map((brand) => {
                const isActive = activeBrand?.name === brand.name;
                return (
                  <button
                    key={brand.name}
                    onClick={() => { if (!brandDrag.current.dragged) setActiveBrand(brand); }}
                    className={`flex-shrink-0 relative pb-2 transition-all ${isActive ? "opacity-100" : "opacity-60 hover:opacity-90"}`}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      {brand.logo ? (
                        <div className="w-14 h-14 min-[480px]:w-16 min-[480px]:h-16 min-[768px]:w-[72px] min-[768px]:h-[72px] rounded-xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden p-1.5">
                          <Image
                            src={brand.logo}
                            alt={brand.name}
                            width={72}
                            height={72}
                            className="object-contain w-full h-full"
                            draggable={false}
                          />
                        </div>
                      ) : (
                        <div className={`w-14 h-14 min-[480px]:w-16 min-[480px]:h-16 min-[768px]:w-[72px] min-[768px]:h-[72px] rounded-xl border flex items-center justify-center ${isActive ? "bg-[#f26e21]/10 border-[#f26e21]/30" : "bg-white/10 border-white/20"}`}>
                          <span className={`font-bold text-xl ${isActive ? "text-[#f26e21]" : "text-white/50"}`}>
                            {brand.name?.[0]?.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className={`text-[10px] min-[480px]:text-xs font-semibold whitespace-nowrap ${isActive ? "text-white" : "text-white/50"}`}>
                        {brand.name}
                      </span>
                    </div>
                    {/* Active underline */}
                    {isActive && (
                      <motion.div
                        layoutId="brand-underline"
                        className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#f26e21] rounded-full"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Arrow */}
            <button
              onClick={() => scrollBrands(1)}
              className="flex-shrink-0 w-8 h-8 min-[768px]:w-9 min-[768px]:h-9 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:border-[#f26e21] hover:text-[#f26e21] transition-colors bg-white/5"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* See All link — right side */}
          {activeBrand && (
            <Link
              href={`/brands/${toSlug(activeBrand.name)}`}
              className="flex-shrink-0 hidden min-[640px]:flex items-center gap-1 text-sm font-semibold text-[#f26e21] hover:text-[#ff8c42] transition-colors ml-4 min-[768px]:ml-6"
            >
              See All
              <ChevronRight size={16} />
            </Link>
          )}
        </div>

        {/* Products Slider */}
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
                <Loader2 className="animate-spin text-purple-mid" size={28} />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 text-white/40 text-sm">
                No products found for {activeBrand?.name}
              </div>
            ) : (
              <div className="relative group">
                {/* Left Arrow */}
                <button
                  onClick={() => scrollProducts(-1)}
                  className="absolute left-0 top-[40%] -translate-y-1/2 z-10 w-9 h-9 min-[768px]:w-10 min-[768px]:h-10 bg-[#111111] border border-white/20 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:shadow-lg hover:border-[#f26e21] text-white"
                >
                  <ChevronLeft size={18} className="text-text-primary" />
                </button>

                <div
                  ref={productScrollRef}
                  className="flex gap-2 min-[480px]:gap-3 min-[768px]:gap-4 overflow-x-auto py-4 touch-pan-x"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
                >
                  <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
                  {products.map((product, i) => (
                    <div key={String(product._id || product.id)} className="flex-shrink-0 w-[160px] min-[480px]:w-[185px] min-[768px]:w-[220px] min-[1024px]:w-[240px] self-stretch">
                      <ProductCard product={product} index={i} />
                    </div>
                  ))}
                </div>

                {/* Right Arrow */}
                <button
                  onClick={() => scrollProducts(1)}
                  className="absolute right-0 top-[40%] -translate-y-1/2 z-10 w-9 h-9 min-[768px]:w-10 min-[768px]:h-10 bg-[#111111] border border-white/20 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:shadow-lg hover:border-[#f26e21] text-white"
                >
                  <ChevronRight size={18} className="text-text-primary" />
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Mobile Show All link */}
        {activeBrand && (
          <div className="text-center mt-5 min-[640px]:hidden">
            <Link
              href={`/brands/${toSlug(activeBrand.name)}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#f26e21] hover:text-[#ff8c42] transition-colors"
            >
              See All {activeBrand.name}
              <ChevronRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
