"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import ProductCard from "./ProductCard";

/*
  Responsive breakpoints:
  xs   0–479    → 2 cols
  sm   480–639  → 2 cols (bigger text/padding)
  md   640–767  → 3 cols
  lg   768–1023 → 3 cols (bigger text/padding)
  xl   1024–1279 → 4 cols
  2xl  1280+    → 5 cols
*/

export default function Products({
  title = "Most Loved Products",
  subtitle = "Discover our top picks for a premium lifestyle",
  apiUrl = "/api/product?limit=12",
  bg = "bg-cream/50",
  // section: the key used to fetch the admin-controlled banner image
  // e.g. "most-loved" | "new-arrivals"
  section = null,
  // fallback gradient if no banner image is set from admin
  bannerGradient = null,
  // link for the "See All" button
  seeAllLink = "/products",
}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bannerImage, setBannerImage] = useState(null);

  useEffect(() => {
    fetch(apiUrl)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        const prods = data.products || [];
        const params = new URL(apiUrl, window.location.origin).searchParams;
        const limit = parseInt(params.get("limit")) || 12;
        setProducts(prods.slice(0, limit));
      })
      .catch((err) => {
        console.error("Failed to fetch products:", err);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [apiUrl]);

  // Fetch section banner image from admin-controlled API
  useEffect(() => {
    if (!section) return;
    fetch(`/api/section-banner?section=${encodeURIComponent(section)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (data.banner?.image) setBannerImage(data.banner.image);
      })
      .catch(() => {
        // Silently fail — fallback to bannerGradient
      });
  }, [section]);

  const hasBanner = bannerImage || bannerGradient;

  return (
    <section className={bg}>
      {/* Section Banner */}
      {hasBanner && (
        <div className="max-w-[1440px] mx-auto px-2 min-[480px]:px-4 min-[640px]:px-5 min-[768px]:px-6 pt-8 min-[768px]:pt-16">
          <div
            className="relative w-full h-24 min-[480px]:h-28 min-[640px]:h-32 min-[768px]:h-36 min-[1024px]:h-40 rounded-xl min-[480px]:rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.1)]"
            style={!bannerImage && bannerGradient ? { background: bannerGradient } : undefined}
          >
            {bannerImage && (
              <img
                src={bannerImage}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
            {/* Subtle inner overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none rounded-xl min-[480px]:rounded-2xl" />
          </div>
        </div>
      )}

      <div className="max-w-[1440px] mx-auto px-2 min-[480px]:px-4 min-[640px]:px-5 min-[768px]:px-6 py-8 min-[768px]:py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-6 min-[768px]:mb-10 text-center"
        >
          <h2 className="text-2xl min-[480px]:text-3xl md:text-4xl font-semibold text-text-primary mb-2 min-[480px]:mb-3">{title}</h2>
          <p className="text-text-secondary text-xs min-[480px]:text-sm">{subtitle}</p>
        </motion.div>

        {/* Product Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-purple-mid" size={32} />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-text-muted text-sm">No products available yet.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 min-[480px]:grid-cols-3 min-[768px]:grid-cols-4 min-[1024px]:grid-cols-5 min-[1280px]:grid-cols-6 gap-2 min-[480px]:gap-3 min-[640px]:gap-4 min-[768px]:gap-5">
              {products.map((product, i) => (
                <ProductCard key={String(product._id || product.id)} product={product} index={i} />
              ))}
            </div>
            <div className="text-center mt-8 min-[768px]:mt-12">
              <Link
                href={seeAllLink}
                className="group inline-flex items-center gap-2 px-6 py-2.5 min-[768px]:px-8 min-[768px]:py-3 bg-[#111111] text-white text-sm min-[768px]:text-base font-semibold rounded-full hover:bg-[#f26e21] transition-all duration-300 shadow-[0_2px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_4px_16px_rgba(242,110,33,0.35)]"
              >
                See All
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
