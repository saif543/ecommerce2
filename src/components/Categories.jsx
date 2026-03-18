"use client";

import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function Categories() {
  const containerRef = useRef(null);
  const router = useRouter();
  const [dragged, setDragged] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch categories from DB (same pattern as Navbar)
  useEffect(() => {
    fetch("/api/category")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => setCategories(data.categories || []))
      .catch((err) => console.error("Failed to load categories:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-8 min-[480px]:py-10 min-[768px]:py-16 overflow-hidden">
      {/* Header */}
      <div className="text-center mb-5 min-[480px]:mb-7 min-[768px]:mb-10 px-4 min-[480px]:px-6">
        <h2 className="text-xl min-[480px]:text-2xl md:text-3xl font-semibold text-text-primary mb-1 min-[480px]:mb-2">Browse by Category</h2>
        <p className="text-text-secondary text-xs min-[480px]:text-sm">Find what you need, fast</p>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="flex gap-5 min-[480px]:gap-7 min-[768px]:gap-10 px-3 min-[480px]:px-6 py-2 min-[480px]:py-4 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="w-16 h-16 min-[480px]:w-20 min-[480px]:h-20 min-[768px]:w-24 min-[768px]:h-24 md:w-28 md:h-28 rounded-full bg-gray-200 animate-pulse" />
              <div className="w-12 h-3 bg-gray-200 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Draggable Track */}
      {!loading && categories.length > 0 && (
        <div ref={containerRef} className="overflow-hidden px-3 min-[480px]:px-6 py-2 min-[480px]:py-4">
          <motion.div
            className="flex gap-5 min-[480px]:gap-7 min-[768px]:gap-10 cursor-grab active:cursor-grabbing select-none w-max touch-pan-y"
            drag="x"
            dragConstraints={containerRef}
            dragElastic={0.1}
            onDragStart={() => setDragged(true)}
            onDragEnd={() => setTimeout(() => setDragged(false), 50)}
          >
            {categories.map((cat) => (
              <div
                key={String(cat._id || cat.name)}
                onClick={() => {
                  if (!dragged) router.push(`/products?category=${encodeURIComponent(cat.name)}`);
                }}
                className="flex flex-col items-center gap-2 min-[480px]:gap-3 min-[768px]:gap-4 flex-shrink-0 cursor-pointer"
              >
                <div className="w-16 h-16 min-[480px]:w-20 min-[480px]:h-20 min-[768px]:w-24 min-[768px]:h-24 md:w-28 md:h-28 rounded-full bg-white shadow-md border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 hover:scale-110 transition-all duration-300 pointer-events-none">
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
                    // Fallback: coloured circle with first letter
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                      <span className="text-purple-700 font-bold text-xl md:text-2xl select-none">
                        {cat.name?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] min-[480px]:text-xs min-[768px]:text-sm font-medium text-text-primary text-center whitespace-nowrap pointer-events-none">
                  {cat.name}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Empty state */}
      {!loading && categories.length === 0 && (
        <p className="text-center text-text-secondary text-sm py-8">No categories available</p>
      )}
    </section>
  );
}
