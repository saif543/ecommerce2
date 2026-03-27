"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

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
      <div className="w-20 h-20 min-[480px]:w-22 min-[480px]:h-22 min-[768px]:w-24 min-[768px]:h-24 md:w-28 md:h-28 rounded-full bg-white shadow-md border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 hover:scale-110 transition-all duration-300">
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
    <section className="py-8 min-[480px]:py-10 min-[768px]:py-16 overflow-hidden bg-white">
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

      {/* Header */}
      <div className="text-center mb-5 min-[480px]:mb-7 min-[768px]:mb-10 px-4 min-[480px]:px-6">
        <h2 className="text-xl min-[480px]:text-2xl md:text-3xl font-semibold text-text-primary mb-1 min-[480px]:mb-2">Browse by Category</h2>
        <p className="text-text-secondary text-xs min-[480px]:text-sm">Find what you need, fast</p>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="flex gap-5 min-[480px]:gap-7 min-[768px]:gap-10 px-3 min-[480px]:px-6 py-2 min-[480px]:py-4 overflow-hidden justify-center">
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
          className="overflow-hidden px-3 min-[480px]:px-6 py-2 min-[480px]:py-4"
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

      {/* Empty state */}
      {!loading && categories.length === 0 && (
        <p className="text-center text-text-secondary text-sm py-8">No categories available</p>
      )}
    </section>
  );
}
