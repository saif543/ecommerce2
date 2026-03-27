"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const DEMO_CATEGORIES = [
  { _id: "demo-1", name: "Electronics", image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&h=200&fit=crop" },
  { _id: "demo-2", name: "Fashion", image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=200&h=200&fit=crop" },
  { _id: "demo-3", name: "Home & Living", image: "https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=200&h=200&fit=crop" },
  { _id: "demo-4", name: "Sports", image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=200&h=200&fit=crop" },
  { _id: "demo-5", name: "Beauty", image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop" },
];

export default function Categories() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [needsScroll, setNeedsScroll] = useState(false);
  const trackRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    fetch("/api/category")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        const cats = data.categories || [];
        setCategories(cats.length > 0 ? cats : DEMO_CATEGORIES);
      })
      .catch(() => {
        setCategories(DEMO_CATEGORIES);
      })
      .finally(() => setLoading(false));
  }, []);

  // Check if categories overflow the container
  useEffect(() => {
    if (!categories.length) return;
    const checkOverflow = () => {
      const container = containerRef.current;
      const track = trackRef.current;
      if (!container || !track) return;
      // Measure one set of categories (not duplicated)
      const items = track.children;
      let singleSetWidth = 0;
      for (let i = 0; i < categories.length && i < items.length; i++) {
        singleSetWidth += items[i].offsetWidth;
      }
      // Add gaps
      const gap = window.innerWidth >= 768 ? 40 : window.innerWidth >= 480 ? 28 : 20;
      singleSetWidth += gap * (categories.length - 1);
      setNeedsScroll(singleSetWidth > container.clientWidth);
    };
    // Small delay to let DOM render
    const timer = setTimeout(checkOverflow, 100);
    window.addEventListener("resize", checkOverflow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkOverflow);
    };
  }, [categories]);

  const duration = Math.max(categories.length * 3, 15);

  const CategoryItem = ({ cat, idx }) => (
    <div
      key={`${String(cat._id || cat.name)}-${idx}`}
      onClick={() => router.push(`/products?category=${encodeURIComponent(cat.name)}`)}
      className="flex flex-col items-center gap-2 min-[480px]:gap-3 min-[768px]:gap-4 flex-shrink-0 cursor-pointer"
    >
      <div className="w-20 h-20 min-[480px]:w-22 min-[480px]:h-22 min-[768px]:w-24 min-[768px]:h-24 md:w-28 md:h-28 rounded-full bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-gray-100/80 overflow-hidden hover:shadow-[0_6px_20px_rgba(242,110,33,0.15)] hover:-translate-y-1.5 hover:border-[#f26e21]/20 transition-all duration-300">
        {cat.image ? (
          <Image
            src={cat.image}
            alt={cat.name}
            width={112}
            height={112}
            className="object-cover w-full h-full rounded-full"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
            <span className="text-orange-700 font-bold text-xl md:text-2xl select-none">
              {cat.name?.[0]?.toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <span className="text-[10px] min-[480px]:text-xs min-[768px]:text-sm font-medium text-text-primary text-center whitespace-nowrap">
        {cat.name}
      </span>
    </div>
  );

  return (
    <section className="py-8 min-[480px]:py-10 min-[768px]:py-16 overflow-hidden relative" style={{ background: "linear-gradient(180deg, #f9f9f9 0%, #f3f1ed 50%, #f9f9f9 100%)" }}>
      {/* Marquee keyframes */}
      <style jsx>{`
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          animation-name: marquee-scroll;
          animation-duration: var(--marquee-duration, 30s);
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          animation-play-state: running;
        }
        .marquee-track.paused {
          animation-play-state: paused;
        }
      `}</style>

      {/* Subtle decorative background shapes */}
      <div className="absolute top-0 left-0 w-40 h-40 min-[768px]:w-64 min-[768px]:h-64 bg-[#f26e21]/[0.03] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-48 h-48 min-[768px]:w-72 min-[768px]:h-72 bg-[#f26e21]/[0.03] rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-3 min-[480px]:px-5 min-[768px]:px-6 relative">
        {/* Header */}
        <div className="text-center mb-5 min-[480px]:mb-7 min-[768px]:mb-10">
          <p className="text-[#f26e21] text-[10px] min-[480px]:text-xs font-semibold uppercase tracking-[0.15em] mb-1 min-[480px]:mb-2">Explore</p>
          <h2 className="text-xl min-[480px]:text-2xl md:text-3xl font-semibold text-text-primary mb-2 min-[480px]:mb-3">Browse by Category</h2>
          <div className="flex items-center justify-center gap-2 mb-2 min-[480px]:mb-3">
            <span className="h-[1.5px] w-8 min-[480px]:w-12 bg-gradient-to-r from-transparent to-[#f26e21]/60 rounded-full" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#f26e21]" />
            <span className="h-[1.5px] w-8 min-[480px]:w-12 bg-gradient-to-l from-transparent to-[#f26e21]/60 rounded-full" />
          </div>
          <p className="text-text-muted text-xs min-[480px]:text-sm">Find what you need, fast</p>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="flex gap-5 min-[480px]:gap-7 min-[768px]:gap-10 py-2 min-[480px]:py-4 overflow-hidden justify-center">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="w-16 h-16 min-[480px]:w-20 min-[480px]:h-20 min-[768px]:w-24 min-[768px]:h-24 md:w-28 md:h-28 rounded-full bg-gray-200 animate-pulse" />
                <div className="w-12 h-3 bg-gray-200 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* Categories — centered if few, infinite marquee if many */}
        {!loading && categories.length > 0 && (
          <div
            ref={containerRef}
            className="overflow-hidden py-2 min-[480px]:py-4"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {needsScroll ? (
              /* Infinite marquee — duplicated for seamless loop */
              <div
                ref={trackRef}
                className={`flex gap-5 min-[480px]:gap-7 min-[768px]:gap-10 select-none w-max marquee-track${paused ? " paused" : ""}`}
                style={{ "--marquee-duration": `${duration}s` }}
              >
                {[...categories, ...categories].map((cat, i) => (
                  <CategoryItem key={`${String(cat._id || cat.name)}-${i}`} cat={cat} idx={i} />
                ))}
              </div>
            ) : (
              /* Centered — fits on screen */
              <div
                ref={trackRef}
                className="flex gap-5 min-[480px]:gap-7 min-[768px]:gap-10 select-none justify-center"
              >
                {categories.map((cat, i) => (
                  <CategoryItem key={String(cat._id || cat.name)} cat={cat} idx={i} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* View All link */}
        {!loading && categories.length > 0 && (
          <div className="text-center mt-4 min-[480px]:mt-6">
            <Link
              href="/products"
              className="group inline-flex items-center gap-1.5 text-xs min-[480px]:text-sm font-semibold text-[#f26e21] hover:text-[#e05e15] transition-colors"
            >
              View All Categories
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </div>
        )}

        {/* Empty state */}
        {!loading && categories.length === 0 && (
          <p className="text-center text-text-secondary text-sm py-8">No categories available</p>
        )}
      </div>
    </section>
  );
}
